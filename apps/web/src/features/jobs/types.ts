import {
  JOB_STATUSES,
  type JobApi,
  type JobBoardResponse,
  type JobEventApi,
  type JobListQuery,
  type JobStatus,
} from "./schemas";

export type { JobStatus, JobBoardResponse, JobEventApi, JobListQuery };

export interface JobRecord {
  id: string;
  title: string;
  status: JobStatus;
  companyId: string | null;
  companyName: string;
  companyDomain?: string | null;
  location: string | null;
  remote: boolean;
  employment?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
  jobUrl?: string | null;
  tags: string[];
  notes?: string | null;
  jdText?: string | null;
  boardOrder: number;
  createdAt: string;
  updatedAt: string;
  savedAt?: string | null;
  appliedAt?: string | null;
  interviewAt?: string | null;
  offerAt?: string | null;
  rejectedAt?: string | null;
  sourceKind?: string | null;
  sourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface JobBoardColumn {
  status: JobStatus;
  jobs: JobRecord[];
}

export interface JobBoardData {
  columns: JobBoardColumn[];
}

export interface JobEventRecord {
  id: string;
  jobId: string;
  kind: string;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export function normalizeJob(job: JobApi): JobRecord {
  return {
    id: job.id,
    title: job.title,
    status: job.status,
    companyId: job.company?.id ?? job.companyId ?? null,
    companyName: job.company?.name ?? "Unknown company",
    companyDomain: job.company?.domain ?? null,
    location: job.location ?? null,
    remote: job.remote ?? false,
    employment: job.employment ?? null,
    salaryMin: job.salaryMin ?? null,
    salaryMax: job.salaryMax ?? null,
    salaryCurrency: job.salaryCurrency ?? null,
    salaryPeriod: job.salaryPeriod ?? null,
    jobUrl: job.jobUrl ?? null,
    tags: job.tags ?? [],
    notes: job.notes ?? null,
    jdText: job.jdText ?? null,
    boardOrder: job.boardOrder ?? 0,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    savedAt: job.savedAt ?? null,
    appliedAt: job.appliedAt ?? null,
    interviewAt: job.interviewAt ?? null,
    offerAt: job.offerAt ?? null,
    rejectedAt: job.rejectedAt ?? null,
    sourceKind: job.sourceKind ?? null,
    sourceId: job.sourceId ?? null,
    metadata: (job as any).metadata ?? null,
  };
}

export function normalizeBoard(data: JobBoardResponse): JobBoardData {
  return {
    columns: JOB_STATUSES.map((status) => ({
      status,
      jobs: (data.columns[status] ?? []).map(normalizeJob),
    })),
  };
}

export function normalizeJobEvent(event: JobEventApi): JobEventRecord {
  return {
    id: event.id,
    jobId: event.jobId,
    kind: event.kind,
    message: event.message ?? null,
    metadata: (event.metadata ?? null) as Record<string, unknown> | null,
    createdAt: event.createdAt,
  };
}
