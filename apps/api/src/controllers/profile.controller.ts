import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { presignPut } from "../lib/s3";
import { enqueueParse } from "../workers/resume-parse.worker";
import { redis } from "../lib/redis";
import { parseResumeFn } from "../services/onboarding";

export async function getProfile(req: Request, res: Response) {
  // Simplified: read by access token (similar to /me); assume middleware later
  const bearer = req.headers.authorization?.split(" ")[1];
  if (!bearer) return res.status(401).json({ title: "Missing token" });
  const { sub } = (await import("../lib/token")).verifyAccess<any>(bearer);
  const prof = await prisma.profile.findFirst({
    where: { userId: sub, isDefault: true },
  });
  res.json({ profile: prof });
}

const profileSchema = z.object({
  label: z.string().default("Default"),
  personal: z.any().optional(),
  education: z.any().optional(),
  skills: z.any().optional(),
  experience: z.any().optional(),
  projects: z.any().optional(),
});

export async function upsertProfile(req: Request, res: Response) {
  const bearer = req.headers.authorization?.split(" ")[1];
  if (!bearer) return res.status(401).json({ title: "Missing token" });
  const { sub } = (await import("../lib/token")).verifyAccess<any>(bearer);
  const data = profileSchema.parse(req.body);
  const existing = await prisma.profile.findFirst({
    where: { userId: sub, isDefault: true },
  });
  const prof = existing
    ? await prisma.profile.update({ where: { id: existing.id }, data })
    : await prisma.profile.create({
        data: { ...data, userId: sub, isDefault: true },
      });
  res.json({ profile: prof });
}

export async function presign(req: Request, res: Response) {
  const key = `resumes/${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { mime = "application/pdf" } = (req.body ?? {}) as any;
  const uploadUrl = await presignPut(key, mime);
  res.json({ uploadUrl, key });
}

export async function parseResume(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File;
  if (!file) return res.status(400).json({ title: "Missing file" });
  const result = await parseResumeFn(file.buffer, file.originalname);
  res.json(result);
}

export async function parseStatus(req: Request, res: Response) {
  const { key } = req.query as any;
  if (!key) return res.status(400).json({ title: "Missing key" });
  const val = await redis.get(`resume:parsed:${key}`);
  res.json({ done: val === "1" });
}
