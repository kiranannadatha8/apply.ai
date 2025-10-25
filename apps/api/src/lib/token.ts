import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { ENV } from "./env";

export function randomCode(digits = 6) {
  const n = crypto.randomInt(0, 10 ** digits);
  return n.toString().padStart(digits, "0");
}
export function randomId(len = 32) {
  return crypto.randomBytes(len).toString("hex");
}

export type AccessPayload = { sub: string; typ: "access"; ver: 1 };
export type ExtPayload = {
  sub: string;
  typ: "ext";
  ver: 1;
  scope: "extension";
};

export function signAccess(
  userId: string,
  ttl: jwt.SignOptions["expiresIn"] = "15m",
) {
  const payload: AccessPayload = { sub: userId, typ: "access", ver: 1 };
  return jwt.sign(payload, ENV.SESSION_SECRET, { expiresIn: ttl });
}
export function verifyAccess<T extends { sub: string }>(token: string): T {
  return jwt.verify(token, ENV.SESSION_SECRET) as any;
}
export function signExt(
  userId: string,
  ttl: jwt.SignOptions["expiresIn"] = "30m",
) {
  const payload: ExtPayload = {
    sub: userId,
    typ: "ext",
    ver: 1,
    scope: "extension",
  };
  return jwt.sign(payload, ENV.SESSION_SECRET, { expiresIn: ttl });
}
export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
