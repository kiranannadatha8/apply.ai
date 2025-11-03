// apps/api/src/controllers/jobs.ext.controller.ts
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { canonicalizeUrl } from "../lib/canonicalize";
import {
  upsertCompanyForUser,
  CompanyUpsertZ,
} from "../services/company.service";
import {
  logJobEvent,
  logStatusChange,
} from "../services/job-event.service";

// Extension-facing save endpoint (ext token)
const ExtSaveZ = z.object({
  title: z.string().min(2),
  company: CompanyUpsertZ,
  jobUrl: z.string().url(),
  sourceKind: z.enum([
    "WORKDAY",
    "GREENHOUSE",
    "LEVER",
    "LINKEDIN",
    "INDEED",
    "COMPANY_SITE",
    "OTHER",
  ]),
  sourceId: z.string().optional(),
  location: z.string().optional(),
  remote: z.boolean().optional().default(false),
  employment: z
    .enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "TEMP", "OTHER"])
    .optional(),
  jdText: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const ExtApplyZ = z.object({
  jobUrl: z.string().url(),
  resumeVariantId: z.string().optional(),
  answers: z
    .array(
      z.object({
        id: z.string().optional(),
        question: z.string().optional(),
        artifactId: z.string().optional(),
        text: z.string().optional(),
      }),
    )
    .optional(),
  coverLetterProvided: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function saveFromExtension(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const body = ExtSaveZ.parse(req.body);

  const company = await upsertCompanyForUser(userId, body.company);
  const { hash } = canonicalizeUrl(body.jobUrl);

  const doc: any = {
    userId,
    companyId: company.id,
    title: body.title,
    location: body.location ?? null,
    remote: body.remote ?? false,
    employment: body.employment ?? null,
    status: "SAVED",
    sourceKind: body.sourceKind,
    sourceId: body.sourceId ?? null,
    jobUrl: body.jobUrl,
    canonicalHash: hash,
    jdText: body.jdText ?? null,
    tags: body.tags ?? [],
    savedAt: new Date(),
  };

  const existing = await prisma.job.findFirst({
    where: {
      userId,
      OR: [
        { canonicalHash: hash },
        ...(body.sourceId
          ? [{ sourceKind: body.sourceKind, sourceId: body.sourceId }]
          : []),
      ],
    },
  });

  const out = existing
    ? await prisma.job.update({
        where: { id: existing.id },
        data: { ...doc, companyId: company.id },
      })
    : await prisma.job.create({ data: doc });

  if (existing) {
    await logJobEvent({
      userId,
      jobId: out.id,
      kind: "UPDATED",
      metadata: { source: "ext#save" },
    });
  } else {
    await logJobEvent({ userId, jobId: out.id, kind: "CREATED" });
  }

  if ((out.status ?? "SAVED") !== existing?.status) {
    await logStatusChange({
      userId,
      jobId: out.id,
      fromStatus: existing?.status ?? null,
      toStatus: out.status ?? "SAVED",
    });
  }

  res.status(existing ? 200 : 201).json({ id: out.id, status: out.status });
}

export async function applyFromExtension(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const body = ExtApplyZ.parse(req.body);
  const { hash } = canonicalizeUrl(body.jobUrl);

  const job = await prisma.job.findFirst({
    where: {
      userId,
      OR: [{ canonicalHash: hash }, { jobUrl: body.jobUrl }],
    },
  });
  if (!job) {
    return res.status(404).json({ title: "Job not found" });
  }

  const now = new Date();
  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      status: "APPLIED",
      appliedAt: now,
    },
  });

  if (job.status !== "APPLIED") {
    await logStatusChange({
      userId,
      jobId: job.id,
      fromStatus: job.status,
      toStatus: "APPLIED",
    });
  }

  await logJobEvent({
    userId,
    jobId: job.id,
    kind: "APPLIED",
    metadata: {
      resumeVariantId: body.resumeVariantId ?? null,
      answers: body.answers ?? [],
      coverLetterProvided: body.coverLetterProvided ?? false,
      extra: body.metadata ?? null,
    },
  });

  res.json({ id: updated.id, status: updated.status });
}
