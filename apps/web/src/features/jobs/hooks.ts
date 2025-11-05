import { useMemo } from "react";
import { useMutation, useQuery, type UseQueryOptions, useQueryClient } from "@tanstack/react-query";
import {
  fetchJobBoard,
  fetchJobEvents,
  fetchJobList,
  fetchJobDetail,
  moveJob,
  reorderColumn,
  patchJob,
  type BoardFilters,
  type JobListParams,
  type MoveJobInput,
  type ReorderColumnInput,
  type UpdateJobPayload,
} from "./api";
import { jobKeys } from "./query-keys";
import type {
  JobBoardData,
  JobEventRecord,
  JobRecord,
  JobStatus,
} from "./types";
import {
  computeJobInsights,
  type InsightRangeKey,
  type JobInsightsSummary,
} from "./analytics";

export function useJobBoardQuery(
  filters: BoardFilters = {},
  options?: Omit<UseQueryOptions<JobBoardData, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<JobBoardData, Error>({
    queryKey: jobKeys.board(filters),
    queryFn: () => fetchJobBoard(filters),
    ...options,
  });
}

export function useJobListQuery(
  params: JobListParams = {},
  options?: Omit<
    UseQueryOptions<{ items: JobRecord[]; nextCursor: string | null }, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<{ items: JobRecord[]; nextCursor: string | null }, Error>({
    queryKey: jobKeys.list(params),
    queryFn: () => fetchJobList(params),
    ...options,
  });
}

export function useJobEventsQuery(
  jobId: string | null,
  workspaceId?: string,
  options?: Omit<UseQueryOptions<JobEventRecord[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery<JobEventRecord[], Error>({
    queryKey: jobId ? jobKeys.events(jobId, workspaceId) : ["jobs", "events", "idle"],
    queryFn: () => (jobId ? fetchJobEvents(jobId, workspaceId) : Promise.resolve<JobEventRecord[]>([])),
    enabled: !!jobId,
    staleTime: 1000 * 60,
    ...options,
  });
}

function cloneBoard(board: JobBoardData): JobBoardData {
  return {
    columns: board.columns.map((column) => ({
      status: column.status,
      jobs: column.jobs.map((job) => ({ ...job })),
    })),
  };
}

function removeJobFromBoard(board: JobBoardData, jobId: string) {
  let removed: JobRecord | null = null;
  for (const column of board.columns) {
    const idx = column.jobs.findIndex((job) => job.id === jobId);
    if (idx >= 0) {
      const [job] = column.jobs.splice(idx, 1);
      removed = { ...job };
      break;
    }
  }
  return removed;
}

function insertJobIntoBoard(
  board: JobBoardData,
  job: JobRecord | null,
  status: JobStatus,
  index: number,
) {
  if (!job) return;
  const target = board.columns.find((column) => column.status === status);
  if (!target) return;
  const safeIndex = Math.max(0, Math.min(index, target.jobs.length));
  const updatedJob = { ...job, status };
  target.jobs.splice(safeIndex, 0, updatedJob);
}

type MoveJobContext = { previous: JobBoardData | null };

export function useMoveJobMutation(filters: BoardFilters = {}) {
  const queryClient = useQueryClient();
  const queryKey = jobKeys.board(filters);

  return useMutation<void, Error, MoveJobInput, MoveJobContext>({
    mutationFn: moveJob,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<JobBoardData>(queryKey);
      if (!previous) return { previous: null };
      const optimistic = cloneBoard(previous);
      const moved = removeJobFromBoard(optimistic, input.id);
      insertJobIntoBoard(optimistic, moved, input.toStatus, input.toIndex);
      queryClient.setQueryData(queryKey, optimistic);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: (_data, _error, _variables, _context) => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

type ReorderContext = { previous: JobBoardData | null };

export function useReorderColumnMutation(filters: BoardFilters = {}) {
  const queryClient = useQueryClient();
  const queryKey = jobKeys.board(filters);
  return useMutation<void, Error, ReorderColumnInput, ReorderContext>({
    mutationFn: reorderColumn,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<JobBoardData>(queryKey);
      if (!previous) return { previous: null };
      const optimistic = cloneBoard(previous);
      const column = optimistic.columns.find(
        (col) => col.status === input.status,
      );
      if (column) {
        const map = new Map(column.jobs.map((job) => [job.id, job]));
        column.jobs = input.orderedIds
          .map((id, idx) => {
            const job = map.get(id);
            return job ? { ...job, boardOrder: idx * 10 } : null;
          })
          .filter((job): job is JobRecord => !!job);
      }
      queryClient.setQueryData(queryKey, optimistic);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: (_data, _error, _variables, _context) => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useUpdateJobMutation() {
  const queryClient = useQueryClient();
  return useMutation<JobRecord, Error, { id: string; patch: UpdateJobPayload }>({
    mutationFn: ({ id, patch }) => patchJob(id, patch),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["jobs", "detail", updated.id], exact: false });
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useJobDetailQuery(
  jobId: string | null,
  workspaceId?: string,
  options?: Omit<UseQueryOptions<JobRecord | null, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<JobRecord | null, Error>({
    queryKey: jobId ? jobKeys.detail(jobId, workspaceId) : ["jobs", "detail", "idle"],
    queryFn: () => (jobId ? fetchJobDetail(jobId, workspaceId) : Promise.resolve(null)),
    enabled: !!jobId,
    staleTime: 10_000,
    ...options,
  });
}

interface UseJobInsightsOptions {
  rangeKey: InsightRangeKey;
}

export function useJobInsights({ rangeKey }: UseJobInsightsOptions) {
  const { data, isLoading, error, isFetching } = useJobListQuery(
    { limit: 1000 },
    { staleTime: 5 * 60 * 1000 },
  );

  const insights = useMemo<JobInsightsSummary | null>(() => {
    if (!data?.items) return null;
    return computeJobInsights(data.items, rangeKey);
  }, [data?.items, rangeKey]);

  return {
    data: insights,
    isLoading,
    isFetching,
    error,
  };
}
