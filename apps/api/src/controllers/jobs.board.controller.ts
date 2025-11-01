// apps/api/src/controllers/jobs.board.controller.ts
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { verifyAccess } from "../lib/token";
import { timestampsForStatus } from "./jobs.controller"; // export it from jobs.controller
// If not exported yet, copy the helper here.

function userIdFromReq(req: Request, res: Response) {
  const b = req.headers.authorization?.split(" ")[1];
  if (!b) {
    res.status(401).json({ title: "Missing token" });
    return null;
  }
  try {
    const { sub } = verifyAccess<{ sub: string }>(b);
    return sub;
  } catch {
    res.status(401).json({ title: "Invalid token" });
    return null;
  }
}

const ReorderZ = z.object({
  status: z.enum(["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"]),
  orderedIds: z.array(z.string().min(10)).min(1),
});

export async function reorderColumn(req: Request, res: Response) {
  const userId = userIdFromReq(req, res);
  if (!userId) return;

  const { status, orderedIds } = ReorderZ.parse(req.body);

  // Validate all ids belong to user and that no foreign ids are injected
  const rows = await prisma.job.findMany({
    where: { userId, status, id: { in: orderedIds } },
    select: { id: true },
  });
  const valid = new Set(rows.map((r) => r.id));
  if (orderedIds.some((id) => !valid.has(id))) {
    return res
      .status(400)
      .json({ title: "One or more jobs are invalid for this column" });
  }

  // Renumber in a single transaction with gaps (10)
  const tx = orderedIds.map((id, idx) =>
    prisma.job.update({ where: { id }, data: { boardOrder: idx * 10 } }),
  );
  await prisma.$transaction(tx);

  res.json({ ok: true, count: orderedIds.length });
}

const ViewQueryZ = z.object({
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  tags: z.string().optional(), // CSV
});

export async function board(req: Request, res: Response) {
  const userId = userIdFromReq(req, res);
  if (!userId) return;

  const q = ViewQueryZ.parse(req.query);
  const whereBase: any = { userId };
  if (q.q) {
    whereBase.OR = [
      { title: { contains: q.q, mode: "insensitive" } },
      { notes: { contains: q.q, mode: "insensitive" } },
      { company: { name: { contains: q.q, mode: "insensitive" } } as any },
    ];
  }
  if (q.from || q.to) {
    whereBase.createdAt = {};
    if (q.from) whereBase.createdAt.gte = new Date(q.from);
    if (q.to) whereBase.createdAt.lte = new Date(q.to);
  }
  if (q.tags) {
    const tag = q.tags.split(",")[0];
    whereBase.tags = { array_contains: tag };
  }

  const statuses = [
    "SAVED",
    "APPLIED",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
  ] as const;
  const columns: Record<(typeof statuses)[number], any[]> = {
    SAVED: [],
    APPLIED: [],
    INTERVIEW: [],
    OFFER: [],
    REJECTED: [],
  };

  const rows = await prisma.job.findMany({
    where: whereBase,
    orderBy: [{ status: "asc" }, { boardOrder: "asc" }, { createdAt: "desc" }],
    include: { company: true },
    take: 1000, // safe cap
  });

  for (const r of rows) columns[r.status as (typeof statuses)[number]]?.push(r);

  res.json({ columns });
}

const MoveZ = z.object({
  id: z.string().min(10),
  toStatus: z.enum(["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"]),
  toIndex: z.number().int().min(0),
});

export async function move(req: Request, res: Response) {
  const userId = userIdFromReq(req, res);
  if (!userId) return;

  const { id, toStatus, toIndex } = MoveZ.parse(req.body);

  const job = await prisma.job.findFirst({ where: { id, userId } });
  if (!job) return res.status(404).json({ title: "Not found" });

  // Pull target column jobs excluding the moved one
  const target = await prisma.job.findMany({
    where: { userId, status: toStatus, NOT: { id } },
    orderBy: [{ boardOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true },
  });

  // Build new ordering: splice moved id at target index
  const ordered = [...target.map((x) => x.id)];
  const clamped = Math.max(0, Math.min(toIndex, ordered.length));
  ordered.splice(clamped, 0, id);

  // Renumber with small gaps (increments of 10)
  const updates = ordered.map((jid, idx) =>
    prisma.job.update({
      where: { id: jid },
      data: {
        boardOrder: idx * 10,
        ...(jid === id
          ? { status: toStatus, ...timestampsForStatus(toStatus) }
          : {}),
      },
    }),
  );

  await prisma.$transaction(updates);
  res.json({ ok: true });
}
