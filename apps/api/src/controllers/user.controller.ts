import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";

export async function me(req: Request, res: Response) {
  const bearer = req.headers.authorization?.split(" ")[1];
  if (!bearer) return res.status(401).json({ title: "Missing token" });
  const { verifyAccess } = await import("../lib/token");
  const { sub } = verifyAccess<any>(bearer);
  const u = await prisma.user.findUnique({ where: { id: sub } });
  if (!u) return res.status(404).json({ title: "User not found" });
  res.json({
    id: u.id,
    email: u.email,
    name: u.name,
    pictureUrl: u.pictureUrl,
    onboardingCompleted: u.onboardingCompleted,
  });
}

export async function setOnboarding(req: Request, res: Response) {
  const bearer = req.headers.authorization?.split(" ")[1];
  if (!bearer) return res.status(401).json({ title: "Missing token" });
  const { verifyAccess } = await import("../lib/token");
  const { sub } = verifyAccess<any>(bearer);
  const body = z.object({ completed: z.boolean() }).parse(req.body);
  const u = await prisma.user.update({
    where: { id: sub },
    data: { onboardingCompleted: body.completed },
  });
  res.json({ onboardingCompleted: u.onboardingCompleted });
}
