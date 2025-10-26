import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { sendOtpEmail } from "../lib/mail";
import {
  signAccess,
  hashToken,
  randomCode,
  randomId,
  signExt,
} from "../lib/token";
import * as client from "openid-client";
import { addDays } from "date-fns";

const emailSchema = z.object({ email: z.string().email() });

function setRefreshCookie(res: Response, raw: string) {
  res.cookie("refresh_token", raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

async function issueSession(userId: string, ua?: string, ip?: string) {
  const raw = randomId(32);
  const hashed = hashToken(raw);
  const expires = addDays(new Date(), 30);
  const rt = await prisma.refreshToken.create({
    data: { userId, hashedToken: hashed, expiresAt: expires },
  });
  await prisma.session.create({
    data: { userId, refreshId: rt.id, userAgent: ua?.slice(0, 256), ip },
  });
  return { raw, access: signAccess(userId, "15m") };
}

export async function requestOtp(req: Request, res: Response) {
  const { email } = emailSchema.parse(req.body);
  const key = `otp:${email}`;
  const minute = await redis.incr(`${key}:m`);
  await redis.expire(`${key}:m`, 60);
  const hour = await redis.incr(`${key}:h`);
  await redis.expire(`${key}:h`, 3600);
  const day = await redis.incr(`${key}:d`);
  await redis.expire(`${key}:d`, 86400);
  if (minute > 5 || hour > 10 || day > 20)
    return res.status(429).json({ title: "Too many requests" });

  const code = randomCode(6);
  await redis.set(`otp:code:${email}`, code, "EX", 600);
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) user = await prisma.user.create({ data: { email } });
  const magicToken = randomId(24);
  await redis.set(`magic:${magicToken}`, user.id, "EX", 600);
  const magicUrl = `${process.env.WEB_ORIGIN}/magic?token=${magicToken}`;
  await sendOtpEmail(email, code, magicUrl);
  return res.json({ ok: true });
}

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});
export async function verifyOtp(req: Request, res: Response) {
  const { email, code } = verifySchema.parse(req.body);
  const stored = await redis.get(`otp:code:${email}`);
  if (!stored || stored !== code)
    return res.status(401).json({ title: "Invalid code" });
  await redis.del(`otp:code:${email}`);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });
  const { raw, access } = await issueSession(
    user.id,
    req.headers["user-agent"],
    (req as any).clientInfo?.ip,
  );
  setRefreshCookie(res, raw);
  return res.json({
    accessToken: access,
    user: { id: user.id, email: user.email },
  });
}

// Magic link verify
const magicSchema = z.object({ token: z.string().min(8) });
export async function verifyMagic(req: Request, res: Response) {
  const { token } = magicSchema.parse(req.body);
  const userId = await redis.get(`magic:${token}`);
  if (!userId) return res.status(401).json({ title: "Invalid magic link" });
  await redis.del(`magic:${token}`);
  const { raw, access } = await issueSession(
    userId,
    req.headers["user-agent"],
    (req as any).clientInfo?.ip,
  );
  setRefreshCookie(res, raw);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return res.json({
    accessToken: access,
    user: { id: user!.id, email: user!.email },
  });
}

export async function me(req: Request, res: Response) {
  const bearer = req.headers.authorization?.split(" ")[1];
  if (!bearer) return res.status(401).json({ title: "Missing token" });
  const { sub } = (await import("../lib/token")).verifyAccess<any>(bearer);
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user) return res.status(404).json({ title: "User not found" });
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    pictureUrl: user.pictureUrl,
  });
}

export async function refresh(req: Request, res: Response) {
  const raw = req.cookies["refresh_token"];
  if (!raw) return res.status(401).json({ title: "No refresh token" });
  const hashed = hashToken(raw);
  const row = await prisma.refreshToken.findUnique({
    where: { hashedToken: hashed },
  });
  if (!row || row.revoked || row.expiresAt < new Date())
    return res.status(401).json({ title: "Invalid refresh" });
  // rotate
  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revoked: true },
  });
  const { raw: newRaw, access } = await issueSession(
    row.userId,
    req.headers["user-agent"],
    (req as any).clientInfo?.ip,
  );
  setRefreshCookie(res, newRaw);
  return res.json({ accessToken: access });
}

export async function logout(req: Request, res: Response) {
  const raw = req.cookies["refresh_token"];
  if (raw) {
    const hashed = hashToken(raw);
    const rt = await prisma.refreshToken.findUnique({
      where: { hashedToken: hashed },
    });
    if (rt) {
      await prisma.refreshToken.update({
        where: { id: rt.id },
        data: { revoked: true },
      });
      await prisma.session.updateMany({
        where: { refreshId: rt.id },
        data: { revoked: true },
      });
    }
  }
  res.clearCookie("refresh_token");
  res.json({ ok: true });
}

// List & revoke sessions
export async function listSessions(req: Request, res: Response) {
  const bearer = req.headers.authorization?.split(" ")[1];
  if (!bearer) return res.status(401).json({ title: "Missing token" });
  const { sub } = (await import("../lib/token")).verifyAccess<any>(bearer);
  const rows = await prisma.session.findMany({
    where: { userId: sub },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ sessions: rows });
}

export async function revokeSession(req: Request, res: Response) {
  const bearer = req.headers.authorization?.split(" ")[1];
  if (!bearer) return res.status(401).json({ title: "Missing token" });
  const { sub } = (await import("../lib/token")).verifyAccess<any>(bearer);
  const { sessionId } = z
    .object({ sessionId: z.string().min(10) })
    .parse(req.body);
  const s = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!s || s.userId !== sub)
    return res.status(404).json({ title: "Not found" });
  await prisma.session.update({
    where: { id: sessionId },
    data: { revoked: true },
  });
  if (s.refreshId)
    await prisma.refreshToken.update({
      where: { id: s.refreshId },
      data: { revoked: true },
    });
  res.json({ ok: true });
}

// ===== OAuth (Google complete, LinkedIn via OAuth2) =====
let googleClient: any;
async function getGoogleClient() {
  if (googleClient) return googleClient;
  const config = await client.discovery(
    new URL("https://accounts.google.com"),
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
  );
  return config;
}

export async function oauthStart(req: Request, res: Response) {
  const { provider } = req.params as { provider: "google" | "linkedin" };
  if (provider !== "google")
    return res.status(501).json({ title: "LinkedIn TODO" });
  const config = await getGoogleClient();
  const code_verifier = client.randomPKCECodeVerifier();
  const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);
  const state = client.randomState();
  await redis.mset({ [`pkce:${state}`]: code_verifier });
  await redis.expire(`pkce:${state}`, 600);

  const parameters: Record<string, string> = {
    client_id: process.env.GOOGLE_CLIENT_ID!,
    scope: "openid email profile",
    access_type: "offline",
    code_challenge,
    code_challenge_method: "S256",
    state,
    redirect_uri: `${process.env.WEB_ORIGIN}/oauth/google/callback`,
  };

  const url = client.buildAuthorizationUrl(config, parameters);
  res.json({ url });
}

export async function oauthCallback(req: Request, res: Response) {
  const { provider } = req.params as { provider: "google" };
  if (provider !== "google")
    return res.status(501).json({ title: "LinkedIn TODO" });
  const config = await getGoogleClient();
  const { code, state } = req.query as any;
  const code_verifier = await redis.get(`pkce:${state}`);
  if (!code_verifier) return res.status(400).json({ title: "Invalid state" });
  const tokenSet = await client.authorizationCodeGrant(
    config,
    new URL(`${process.env.WEB_ORIGIN}/oauth/google/callback`),
    { pkceCodeVerifier: code_verifier, expectedState: state },
  );
  const id = tokenSet.claims();
  if (!id) return res.status(400).json({ title: "Invalid token set" });
  const email = id.email as string;
  // Account linking if logged-in bearer present
  const bearer = req.headers.authorization?.split(" ")[1];
  if (bearer) {
    const { sub } = (await import("../lib/token")).verifyAccess<any>(bearer);
    await prisma.oAuthAccount.upsert({
      where: {
        provider_providerId: { provider: "google", providerId: id.sub },
      },
      update: { userId: sub, email },
      create: { provider: "google", providerId: id.sub, userId: sub, email },
    });
    return res.json({ linked: true });
  }
  // Normal sign-in
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: typeof id.name === "string" ? id.name : null,
        pictureUrl: typeof id.picture === "string" ? id.picture : null,
        provider: "GOOGLE" as any,
      },
    });
  }
  await prisma.oAuthAccount.upsert({
    where: { provider_providerId: { provider: "google", providerId: id.sub } },
    update: { email, userId: user.id },
    create: { provider: "google", providerId: id.sub, userId: user.id, email },
  });
  const { raw, access } = await issueSession(
    user.id,
    req.headers["user-agent"],
    (req as any).clientInfo?.ip,
  );
  setRefreshCookie(res, raw);
  return res.json({
    accessToken: access,
    user: { id: user.id, email: user.email, name: user.name },
  });
}

// Extension handshake
export async function createHandshake(req: Request, res: Response) {
  const bearer = req.headers.authorization?.split(" ")[1];
  if (!bearer) return res.status(401).json({ title: "Missing token" });
  const { sub } = (await import("../lib/token")).verifyAccess<any>(bearer);
  const code = randomId(16);
  const expires = new Date(Date.now() + 1000 * 60 * 10);
  await prisma.handshakeCode.create({
    data: { userId: sub, code, expiresAt: expires },
  });
  res.json({ code, expiresAt: expires.toISOString() });
}

export async function redeemHandshake(req: Request, res: Response) {
  const { code } = z.object({ code: z.string().min(8) }).parse(req.body);
  const record = await prisma.handshakeCode.findUnique({ where: { code } });
  if (!record || record.usedAt || record.expiresAt < new Date())
    return res.status(401).json({ title: "Invalid or expired code" });
  await prisma.handshakeCode.update({
    where: { code },
    data: { usedAt: new Date() },
  });
  const token = signExt(record.userId, "30m");
  res.json({ extToken: token });
}
