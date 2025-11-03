import { fetchWithAuth } from "@/stores/auth";
import {
  JobBoardResponseSchema,
  JobApiSchema,
  JobEventSchema,
  JobListQuerySchema,
  JobListResponseSchema,
  JobStatusSchema,
  JOB_STATUSES,
  type JobApi,
} from "./schemas";
import {
  normalizeBoard,
  normalizeJob,
  normalizeJobEvent,
  type JobBoardData,
  type JobEventRecord,
  type JobRecord,
  type JobStatus,
} from "./types";
import { DUMMY_JOBS, DUMMY_EVENTS, DEMO_WORKSPACE_ID } from "./dummy";

export type BoardFilters = Partial<{
  q: string;
  from: string;
  to: string;
  tags: string;
  workspaceId: string;
}>;

export type JobListParams = Partial<{
  q: string;
  status: string;
  company: string;
  tag: string;
  from: string;
  to: string;
  sort: "created-desc" | "created-asc" | "updated-desc" | "updated-asc";
  cursor: string;
  limit: number;
  workspaceId: string;
}>;

export interface JobListResult {
  items: JobRecord[];
  nextCursor: string | null;
}

export interface MoveJobInput {
  id: string;
  toStatus: JobStatus;
  toIndex: number;
}

export interface ReorderColumnInput {
  status: JobStatus;
  orderedIds: string[];
}

export type UpdateJobPayload = Partial<{
  title: string;
  status: JobStatus;
  location: string | null;
  tags: string[];
  notes: string | null;
  jobUrl: string | null;
}>;

function buildSearchParams(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function fetchJobBoard(filters: BoardFilters = {}): Promise<JobBoardData> {
  try {
    const queryParams: Record<string, string | number | undefined> = {
      q: filters.q,
      from: filters.from,
      to: filters.to,
      tags: filters.tags,
      workspaceId: filters.workspaceId,
    };
    const query = buildSearchParams(queryParams);
    const data = await fetchWithAuth<unknown>(`/v1/jobs/board${query}`, {
      method: "GET",
    });
    const parsed = JobBoardResponseSchema.parse(data);
    return normalizeBoard(parsed);
  } catch (error) {
    console.warn("[jobs] falling back to demo board data", error);
    return buildDummyBoard(filters);
  }
}

export async function fetchJobList(params: JobListParams = {}): Promise<JobListResult> {
  try {
    const parsedFilters = JobListQuerySchema.partial().parse(params);
    const query = buildSearchParams(parsedFilters as Record<string, string | number | undefined>);
    const data = await fetchWithAuth<unknown>(`/v1/jobs${query}`, { method: "GET" });
    const parsed = JobListResponseSchema.parse(data);
    return {
      items: parsed.items.map(normalizeJob),
      nextCursor: parsed.nextCursor ?? null,
    };
  } catch (error) {
    console.warn("[jobs] falling back to demo list data", error);
    return buildDummyList(params);
  }
}

export async function fetchJobEvents(jobId: string, workspaceId?: string): Promise<JobEventRecord[]> {
  try {
    const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
    const data = await fetchWithAuth<{ items: unknown[] }>(`/v1/jobs/${jobId}/events${query}`, {
      method: "GET",
    });
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map((item) => normalizeJobEvent(JobEventSchema.parse(item)));
  } catch (error) {
    console.warn("[jobs] falling back to demo events", error);
    return buildDummyEvents(jobId, workspaceId);
  }
}

export async function fetchJobDetail(id: string, workspaceId?: string): Promise<JobRecord> {
  try {
    const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
    const data = await fetchWithAuth<unknown>(`/v1/jobs/${id}${query}`, { method: "GET" });
    return normalizeJob(JobApiSchema.parse(data));
  } catch (error) {
    console.warn("[jobs] falling back to demo detail", error);
    return buildDummyDetail(id, workspaceId);
  }
}

function buildDummyBoard(filters: BoardFilters): JobBoardData {
  if (!allowsDummyWorkspace(filters.workspaceId)) {
    return normalizeBoard({
      columns: {
        SAVED: [],
        APPLIED: [],
        INTERVIEW: [],
        OFFER: [],
        REJECTED: [],
      },
    });
  }
  const jobs = filterDummyJobs({
    q: filters.q,
    tag: filters.tags,
    from: filters.from,
    to: filters.to,
    statuses: undefined,
    workspaceId: filters.workspaceId,
  });
  const grouped: Record<JobStatus, JobApi[]> = JOB_STATUSES.reduce(
    (acc, status) => {
      acc[status] = [];
      return acc;
    },
    {} as Record<JobStatus, JobApi[]>,
  );
  jobs.forEach((job) => {
    const status = (job.status ?? "SAVED") as JobStatus;
    if (!grouped[status]) grouped[status] = [];
    grouped[status].push(job);
  });
  return normalizeBoard({
    columns: {
      SAVED: grouped.SAVED ?? [],
      APPLIED: grouped.APPLIED ?? [],
      INTERVIEW: grouped.INTERVIEW ?? [],
      OFFER: grouped.OFFER ?? [],
      REJECTED: grouped.REJECTED ?? [],
    },
  });
}

function buildDummyList(params: JobListParams): JobListResult {
  if (!allowsDummyWorkspace(params.workspaceId)) {
    return { items: [], nextCursor: null };
  }
  const statusList = params.status
    ? params.status.split(",").map((s) => s.trim().toUpperCase() as JobStatus)
    : undefined;
  const jobs = filterDummyJobs({
    q: params.q,
    tag: params.tag,
    from: params.from,
    to: params.to,
    statuses: statusList,
    workspaceId: params.workspaceId,
  });
  const sorted = sortDummyJobs(jobs, params.sort);
  return {
    items: sorted.map(normalizeJob),
    nextCursor: null,
  };
}

function buildDummyDetail(id: string, workspaceId?: string): JobRecord {
  const job = DUMMY_JOBS.find((item) => item.id === id);
  if (!job) {
    throw new Error("Dummy job not found");
  }
  if (!allowsDummyWorkspace(workspaceId, getWorkspaceId(job))) {
    throw new Error("Workspace mismatch for dummy data");
  }
  return normalizeJob(job);
}

function buildDummyEvents(jobId: string, workspaceId?: string): JobEventRecord[] {
  const events = DUMMY_EVENTS[jobId] ?? [];
  if (!allowsDummyWorkspace(workspaceId)) return [];
  return events.map((evt) => normalizeJobEvent(evt));
}

function filterDummyJobs(filters: {
  q?: string;
  tag?: string;
  from?: string;
  to?: string;
  statuses?: JobStatus[];
  workspaceId?: string;
}): JobApi[] {
  return DUMMY_JOBS.filter((job) => {
    if (!allowsDummyWorkspace(filters.workspaceId, getWorkspaceId(job))) return false;
    if (filters.statuses && filters.statuses.length) {
      if (!filters.statuses.includes(job.status as JobStatus)) return false;
    }
    if (filters.q) {
      const haystack = [
        job.title,
        job.company?.name,
        job.location,
        job.tags?.join(" "),
        job.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(filters.q.toLowerCase())) return false;
    }
    if (filters.tag) {
      const requested = filters.tag
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);
      if (requested.length) {
        const jobTags = (job.tags ?? []).map((t) => t.toUpperCase());
        if (!requested.every((tag) => jobTags.includes(tag))) return false;
      }
    }
    if (filters.from) {
      const fromDate = new Date(filters.from).getTime();
      const jobDate = new Date(job.createdAt ?? job.savedAt ?? job.updatedAt ?? "").getTime();
      if (jobDate && jobDate < fromDate) return false;
    }
    if (filters.to) {
      const toDate = new Date(filters.to).getTime();
      const jobDate = new Date(job.createdAt ?? job.savedAt ?? job.updatedAt ?? "").getTime();
      if (jobDate && jobDate > toDate) return false;
    }
    return true;
  });
}

function sortDummyJobs(jobs: JobApi[], sort?: JobListParams["sort"]): JobApi[] {
  if (!sort) return jobs;
  const copy = [...jobs];
  switch (sort) {
    case "created-asc":
      return copy.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    case "created-desc":
      return copy.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case "updated-asc":
      return copy.sort((a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      );
    case "updated-desc":
      return copy.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    default:
      return copy;
  }
}

function getWorkspaceId(job: JobApi): string | undefined {
  const meta = job.metadata as Record<string, unknown> | null | undefined;
  const workspace = typeof meta?.workspaceId === "string" ? meta.workspaceId : undefined;
  return workspace ?? DEMO_WORKSPACE_ID;
}

function allowsDummyWorkspace(requested?: string, jobWorkspace?: string): boolean {
  if (!requested) return true;
  const jobSpace = jobWorkspace ?? DEMO_WORKSPACE_ID;
  if (requested === jobSpace) return true;
  return requested === DEMO_WORKSPACE_ID;
}

export async function moveJob(payload: MoveJobInput): Promise<void> {
  JobStatusSchema.parse(payload.toStatus);
  try {
    await fetchWithAuth(`/v1/jobs/board/move`, {
      method: "POST",
      body: JSON.stringify({
        id: payload.id,
        toStatus: payload.toStatus,
        toIndex: payload.toIndex,
      }),
    });
  } catch (error) {
    console.warn("[jobs] move fallback (no-op)", error);
  }
}

export async function reorderColumn(payload: ReorderColumnInput): Promise<void> {
  JobStatusSchema.parse(payload.status);
  try {
    await fetchWithAuth(`/v1/jobs/board/reorder`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn("[jobs] reorder fallback (no-op)", error);
  }
}

export async function patchJob(id: string, patch: UpdateJobPayload): Promise<JobRecord> {
  try {
    const data = await fetchWithAuth<unknown>(`/v1/jobs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    return normalizeJob(JobApiSchema.parse(data));
  } catch (error) {
    console.warn("[jobs] patch fallback", error);
    const existing = DUMMY_JOBS.find((job) => job.id === id);
    if (!existing) throw error;
    const patched = { ...existing, ...patch } as JobApi;
    return normalizeJob(patched);
  }
}
