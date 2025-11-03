import { z } from "zod";

export const JOB_STATUSES = [
  "SAVED",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JobStatusSchema = z.enum(JOB_STATUSES);

export const JobEventKindSchema = z.enum([
  "CREATED",
  "UPDATED",
  "STATUS_CHANGE",
  "AUTOFILL",
  "APPLIED",
  "NOTE",
]);

const TagsSchema = z
  .any()
  .transform((value) =>
    Array.isArray(value)
      ? (value.filter((t): t is string => typeof t === "string") as string[])
      : [],
  );

const MaybeString = z.union([z.string(), z.null()]).optional();

export const JobCompanySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    domain: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

export const JobApiSchema = z.object({
  id: z.string(),
  userId: z.string(),
  companyId: z.string().nullable().optional(),
  company: JobCompanySchema,
  title: z.string(),
  location: MaybeString,
  remote: z.boolean().default(false),
  employment: z.string().nullable().optional(),
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
  salaryCurrency: z.string().nullable().optional(),
  salaryPeriod: z.string().nullable().optional(),
  status: JobStatusSchema,
  sourceKind: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  jobUrl: MaybeString,
  canonicalHash: z.string().nullable().optional(),
  jdText: MaybeString,
  tags: TagsSchema,
  notes: MaybeString,
  boardOrder: z.number().int().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  savedAt: z.string().nullable().optional(),
  appliedAt: z.string().nullable().optional(),
  interviewAt: z.string().nullable().optional(),
  offerAt: z.string().nullable().optional(),
  rejectedAt: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
});

export type JobApi = z.infer<typeof JobApiSchema>;

export const JobEventSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  userId: z.string(),
  kind: JobEventKindSchema,
  message: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  createdAt: z.string(),
});

export type JobEventApi = z.infer<typeof JobEventSchema>;

export const JobBoardResponseSchema = z.object({
  columns: z.object({
    SAVED: z.array(JobApiSchema),
    APPLIED: z.array(JobApiSchema),
    INTERVIEW: z.array(JobApiSchema),
    OFFER: z.array(JobApiSchema),
    REJECTED: z.array(JobApiSchema),
  }),
});

export type JobBoardResponse = z.infer<typeof JobBoardResponseSchema>;

export const JobListResponseSchema = z.object({
  items: z.array(JobApiSchema),
  nextCursor: z.string().nullable().optional(),
});

export type JobListResponse = z.infer<typeof JobListResponseSchema>;

export const JobListQuerySchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  company: z.string().optional(),
  tag: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z
    .enum(["created-desc", "created-asc", "updated-desc", "updated-asc"])
    .optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().optional(),
  workspaceId: z.string().optional(),
});

export type JobListQuery = z.infer<typeof JobListQuerySchema>;
