import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyAccess } from "../lib/token";
import { subDays } from "date-fns";

function getUserIdOr401(req: Request, res: Response) {
  const bearer = req.headers.authorization?.split(" ")[1];
  if (!bearer) {
    res.status(401).json({ title: "Missing token" });
    return null;
  }
  try {
    const { sub } = verifyAccess<{ sub: string }>(bearer);
    return sub;
  } catch {
    res.status(401).json({ title: "Invalid token" });
    return null;
  }
}

export async function summary(req: Request, res: Response) {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  const prof = await prisma.profile.findFirst({
    where: { userId, isDefault: true },
  });
  let completeness = 0;
  if (prof) {
    const p: any = prof;
    const personal = p.personal || {};
    const skills = Array.isArray(p.skills) ? p.skills : [];
    const experience = Array.isArray(p.experience) ? p.experience : [];
    const education = Array.isArray(p.education) ? p.education : [];
    let score = 0;
    if (personal.fullName) score += 20;
    if (personal.email) score += 20;
    if (skills.length) score += 20;
    if (experience.length) score += 25;
    if (education.length) score += 15;
    completeness = score;
  }

  const extLinked =
    (await prisma.handshakeCode.findFirst({
      where: { userId, usedAt: { not: null, gte: subDays(new Date(), 30) } },
    })) !== null;

  const [saved, applied, interviews, offers] = await Promise.all([
    prisma.job.count({ where: { userId, status: "SAVED" } }),
    prisma.job.count({ where: { userId, status: "APPLIED" } }),
    prisma.job.count({ where: { userId, status: "INTERVIEW" } }),
    prisma.job.count({ where: { userId, status: "OFFER" } }),
  ]);

  res.json({
    profileCompleteness: completeness,
    extLinked,
    totals: { saved, applied, interviews, offers },
    lastUpdated: new Date().toISOString(),
  });
}

export async function recent(req: Request, res: Response) {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;
  // TODO: Replace with real recent jobs when Jobs API exists.
  const items: Array<{
    id: string;
    title: string;
    company: string;
    status: "Saved" | "Applied" | "Interview" | "Offer";
    addedAt: string;
  }> = [];
  res.json({ items });
}
