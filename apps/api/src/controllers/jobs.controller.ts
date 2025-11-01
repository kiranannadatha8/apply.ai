// apps/api/src/controllers/jobs.controller.ts
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import {
  CompanyUpsertZ,
  upsertCompanyForUser,
} from "../services/company.service";
import { canonicalizeUrl } from "../lib/canonicalize";

// ---------- Schemas ----------
const JobCreateZ = z.object({
  title: z.string().min(2),
  company: CompanyUpsertZ.or(z.object({ id: z.string().min(10) })).optional(),
  location: z.string().optional(),
  remote: z.boolean().optional().default(false),
  employment: z
    .enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "TEMP", "OTHER"])
    .optional(),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  salaryCurrency: z.string().optional(),
  salaryPeriod: z.string().optional(),
  status: z
    .enum(["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"])
    .optional(),
  sourceKind: z
    .enum([
      "WORKDAY",
      "GREENHOUSE",
      "LEVER",
      "LINKEDIN",
      "INDEED",
      "COMPANY_SITE",
      "OTHER",
    ])
    .optional(),
  sourceId: z.string().optional(),
  jobUrl: z.string().url().optional(),
  jdText: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const JobUpdateZ = JobCreateZ.partial();

const ListQueryZ = z.object({
  q: z.string().optional(),
  status: z.string().optional(), // CSV of statuses
  company: z.string().optional(), // company id
  tag: z.string().optional(), // single tag contains
  from: z.string().optional(), // ISO date
  to: z.string().optional(), // ISO date
  sort: z
    .enum(["created-desc", "created-asc", "updated-desc", "updated-asc"])
    .optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  cursor: z.string().optional(), // cursor = job.id for created-desc pagination
});

const BulkUpdateZ = z.object({
  ids: z.array(z.string().min(10)).min(1),
  status: z
    .enum(["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"])
    .optional(),
  tagsAdd: z.array(z.string()).optional(),
  tagsRemove: z.array(z.string()).optional(),
});

// ---------- Helpers ----------
export function timestampsForStatus(status?: string | null) {
  const now = new Date();
  const patch: any = {};
  switch (status) {
    case "SAVED":
      patch.savedAt = now;
      break;
    case "APPLIED":
      patch.appliedAt = now;
      break;
    case "INTERVIEW":
      patch.interviewAt = now;
      break;
    case "OFFER":
      patch.offerAt = now;
      break;
    case "REJECTED":
      patch.rejectedAt = now;
      break;
  }
  return patch;
}

// ---------- Controllers ----------
export async function list(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const q = ListQueryZ.parse(req.query);

  const where: any = { userId };
  if (q.status) where.status = { in: q.status.split(",") };
  if (q.company) where.companyId = q.company;
  if (q.tag) where.tags = { array_contains: q.tag };
  if (q.q) {
    where.OR = [
      { title: { contains: q.q, mode: "insensitive" } },
      { notes: { contains: q.q, mode: "insensitive" } },
      { company: { name: { contains: q.q, mode: "insensitive" } } as any },
    ];
  }
  if (q.from || q.to) {
    where.createdAt = {};
    if (q.from) (where.createdAt as any).gte = new Date(q.from);
    if (q.to) (where.createdAt as any).lte = new Date(q.to);
  }

  const orderBy: any =
    q.sort === "created-asc"
      ? { createdAt: "asc" }
      : q.sort === "updated-desc"
        ? { updatedAt: "desc" }
        : q.sort === "updated-asc"
          ? { updatedAt: "asc" }
          : { createdAt: "desc" };

  const take = q.limit;
  const cursor = q.cursor ? { id: q.cursor } : undefined;
  const skip = cursor ? 1 : 0;

  const rows = await prisma.job.findMany({
    where,
    orderBy,
    take,
    skip,
    ...(cursor && { cursor }),
    include: { company: true },
  });

  const nextCursor = rows.length === take ? rows[rows.length - 1].id : null;

  res.json({ items: rows, nextCursor });
}

export async function get(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const id = req.params.id;
  const row = await prisma.job.findFirst({
    where: { id, userId },
    include: { company: true },
  });
  if (!row) return res.status(404).json({ title: "Not found" });
  res.json(row);
}

export async function create(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const body = JobCreateZ.parse(req.body);

  // Company resolution
  let companyId: string | undefined;
  if (body.company) {
    if ("id" in body.company) {
      const exists = await prisma.company.findFirst({
        where: { id: body.company.id, userId },
        select: { id: true },
      });
      if (!exists) return res.status(400).json({ title: "Invalid company id" });
      companyId = exists.id;
    } else {
      const c = await upsertCompanyForUser(userId, body.company);
      companyId = c.id;
    }
  }

  const { hash } = canonicalizeUrl(body.jobUrl);
  const doc: any = {
    userId,
    companyId: companyId ?? null,
    title: body.title,
    location: body.location ?? null,
    remote: body.remote ?? false,
    employment: body.employment ?? null,
    salaryMin: body.salaryMin ?? null,
    salaryMax: body.salaryMax ?? null,
    salaryCurrency: body.salaryCurrency ?? null,
    salaryPeriod: body.salaryPeriod ?? null,
    status: body.status ?? "SAVED",
    sourceKind: body.sourceKind ?? null,
    sourceId: body.sourceId ?? null,
    jobUrl: body.jobUrl ?? null,
    canonicalHash: hash ?? null,
    jdText: body.jdText ?? null,
    tags: body.tags ?? [],
    notes: body.notes ?? null,
    ...timestampsForStatus(body.status ?? "SAVED"),
  };

  // Deduplicate: prefer canonicalHash or (sourceKind, sourceId)
  const existing = await prisma.job.findFirst({
    where: {
      userId,
      OR: [
        ...(doc.canonicalHash ? [{ canonicalHash: doc.canonicalHash }] : []),
        ...(doc.sourceKind && doc.sourceId
          ? [{ sourceKind: doc.sourceKind, sourceId: doc.sourceId }]
          : []),
      ],
    },
  });

  const created = existing
    ? await prisma.job.update({
        where: { id: existing.id },
        data: { ...doc, companyId },
      })
    : await prisma.job.create({ data: doc });

  res.status(existing ? 200 : 201).json(created);
}

export async function update(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const id = req.params.id;
  const body = JobUpdateZ.parse(req.body);

  const row = await prisma.job.findFirst({ where: { id, userId } });
  if (!row) return res.status(404).json({ title: "Not found" });

  // company handling
  let companyId: string | undefined = row.companyId ?? undefined;
  if (body.company) {
    if ("id" in body.company) {
      const c = await prisma.company.findFirst({
        where: { id: body.company.id, userId },
      });
      if (!c) return res.status(400).json({ title: "Invalid company id" });
      companyId = c.id;
    } else {
      const c = await upsertCompanyForUser(userId, body.company);
      companyId = c.id;
    }
  }

  const { hash } = canonicalizeUrl(body.jobUrl ?? row.jobUrl ?? undefined);

  const statusPatch = body.status ? timestampsForStatus(body.status) : {};
  const updated = await prisma.job.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.remote !== undefined && { remote: body.remote }),
      ...(body.employment !== undefined && { employment: body.employment }),
      ...(body.salaryMin !== undefined && { salaryMin: body.salaryMin }),
      ...(body.salaryMax !== undefined && { salaryMax: body.salaryMax }),
      ...(body.salaryCurrency !== undefined && {
        salaryCurrency: body.salaryCurrency,
      }),
      ...(body.salaryPeriod !== undefined && {
        salaryPeriod: body.salaryPeriod,
      }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.sourceKind !== undefined && { sourceKind: body.sourceKind }),
      ...(body.sourceId !== undefined && { sourceId: body.sourceId }),
      ...(body.jobUrl !== undefined && { jobUrl: body.jobUrl }),
      ...(hash && { canonicalHash: hash }),
      ...(body.jdText !== undefined && { jdText: body.jdText }),
      ...(body.tags !== undefined && { tags: body.tags }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(companyId !== undefined && { companyId }),
      ...statusPatch,
    },
    include: { company: true },
  });
  res.json(updated);
}

export async function remove(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const id = req.params.id;
  const row = await prisma.job.findFirst({ where: { id, userId } });
  if (!row) return res.status(404).json({ title: "Not found" });
  await prisma.job.delete({ where: { id } });
  res.json({ ok: true });
}

export async function bulk(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const body = BulkUpdateZ.parse(req.body);

  const where = { id: { in: body.ids }, userId };
  const data: any = {};
  if (body.status)
    Object.assign(data, {
      status: body.status,
      ...timestampsForStatus(body.status),
    });

  // tags merge/remove
  if (body.tagsAdd || body.tagsRemove) {
    const rows = await prisma.job.findMany({
      where,
      select: { id: true, tags: true },
    });
    await Promise.all(
      rows.map((r) => {
        const curr = Array.isArray(r.tags) ? (r.tags as string[]) : [];
        const merged = [
          ...new Set([...(curr || []), ...(body.tagsAdd || [])]),
        ].filter((t) => !(body.tagsRemove || []).includes(t));
        return prisma.job.update({
          where: { id: r.id },
          data: { ...data, tags: merged },
        });
      }),
    );
    return res.json({ count: rows.length });
  }

  const result = await prisma.job.updateMany({ where, data });
  res.json({ count: result.count });
}
