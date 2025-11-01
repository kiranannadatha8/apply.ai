import { create } from "zustand";
import { persist } from "zustand/middleware";

import { JOB_STAGE_ORDER } from "./config";
import { SEED_JOBS } from "./data";
import type {
  GroupOption,
  JobBoardFilters,
  JobBoardView,
  JobOpportunity,
  JobStage,
  SortOption,
} from "./types";

const initialFilters: JobBoardFilters = {
  searchTerm: "",
  workStyles: [],
  employmentTypes: [],
  statuses: [],
  dateRange: undefined,
};

interface JobBoardState {
  jobs: JobOpportunity[];
  filters: JobBoardFilters;
  view: JobBoardView;
  sort: SortOption;
  groupBy: GroupOption;
  addJob: (payload: Omit<JobOpportunity, "id" | "createdAt" | "updatedAt">) => void;
  updateJob: (id: string, payload: Partial<JobOpportunity>) => void;
  moveJob: (id: string, status: JobStage, position?: number) => void;
  reorderWithinStage: (status: JobStage, fromIndex: number, toIndex: number) => void;
  removeJob: (id: string) => void;
  resetJobs: () => void;
  setFilters: (filters: Partial<JobBoardFilters>) => void;
  clearFilters: () => void;
  setSearchTerm: (term: string) => void;
  setView: (view: JobBoardView) => void;
  setSort: (sort: SortOption) => void;
  setGroupBy: (groupBy: GroupOption) => void;
}

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `job_${Math.random().toString(36).slice(2, 10)}`;
};

const sortByStageOrder = (jobs: JobOpportunity[]) => {
  const rank: Record<JobStage, number> = JOB_STAGE_ORDER.reduce(
    (acc, key, index) => {
      acc[key] = index;
      return acc;
    },
    {} as Record<JobStage, number>
  );

  return [...jobs].sort((a, b) => {
    const stageDiff = rank[a.status] - rank[b.status];
    if (stageDiff !== 0) return stageDiff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
};

export const useJobBoardStore = create<JobBoardState>()(
  persist(
    (set) => ({
      jobs: sortByStageOrder(SEED_JOBS),
      filters: initialFilters,
      view: "board",
      sort: "recent",
      groupBy: "status",
      addJob: (payload) => {
        const now = new Date().toISOString();
        const job: JobOpportunity = {
          ...payload,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          jobs: sortByStageOrder([...state.jobs, job]),
        }));
      },
      updateJob: (id, payload) => {
        const now = new Date().toISOString();
        set((state) => ({
          jobs: sortByStageOrder(
            state.jobs.map((job) =>
              job.id === id ? { ...job, ...payload, updatedAt: now } : job
            )
          ),
        }));
      },
      moveJob: (id, status, position) => {
        const now = new Date().toISOString();
        set((state) => {
          const updated = state.jobs.map((job) =>
            job.id === id ? { ...job, status, updatedAt: now } : job
          );

          const movingJob = updated.find((job) => job.id === id);
          if (!movingJob) {
            return { jobs: state.jobs };
          }

          if (typeof position !== "number") {
            return { jobs: sortByStageOrder(updated) };
          }

          const stageBuckets = JOB_STAGE_ORDER.reduce(
            (acc, stageKey) => {
              acc[stageKey] = [] as JobOpportunity[];
              return acc;
            },
            {} as Record<JobStage, JobOpportunity[]>
          );

          updated.forEach((job) => {
            if (job.id === id) {
              return;
            }
            stageBuckets[job.status].push(job);
          });

          const targetList = stageBuckets[status];
          const safeIndex = Math.max(0, Math.min(position, targetList.length));
          targetList.splice(safeIndex, 0, movingJob);

          const flattened = JOB_STAGE_ORDER.flatMap(
            (stageKey) => stageBuckets[stageKey]
          );

          return { jobs: flattened };
        });
      },
      reorderWithinStage: (status, fromIndex, toIndex) => {
        if (fromIndex === toIndex) {
          return;
        }

        set((state) => {
          const stagedJobs = state.jobs.filter((job) => job.status === status);
          if (
            fromIndex < 0 ||
            fromIndex >= stagedJobs.length ||
            toIndex < 0 ||
            toIndex >= stagedJobs.length
          ) {
            return { jobs: state.jobs };
          }

          const nextStageJobs = [...stagedJobs];
          const [moved] = nextStageJobs.splice(fromIndex, 1);
          nextStageJobs.splice(toIndex, 0, moved);

          const stageBuckets = JOB_STAGE_ORDER.reduce(
            (acc, stageKey) => {
              acc[stageKey] = [] as JobOpportunity[];
              return acc;
            },
            {} as Record<JobStage, JobOpportunity[]>
          );

          JOB_STAGE_ORDER.forEach((stageKey) => {
            if (stageKey === status) {
              stageBuckets[stageKey] = nextStageJobs;
              return;
            }
            stageBuckets[stageKey] = state.jobs.filter(
              (job) => job.status === stageKey
            );
          });

          const flattened = JOB_STAGE_ORDER.flatMap(
            (stageKey) => stageBuckets[stageKey]
          );

          return { jobs: flattened };
        });
      },
      removeJob: (id) =>
        set((state) => ({
          jobs: state.jobs.filter((job) => job.id !== id),
        })),
      resetJobs: () =>
        set(() => ({
          jobs: sortByStageOrder(SEED_JOBS),
        })),
      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),
      clearFilters: () =>
        set(() => ({
          filters: initialFilters,
        })),
      setSearchTerm: (term) =>
        set((state) => ({
          filters: { ...state.filters, searchTerm: term },
        })),
      setView: (view) => set(() => ({ view })),
      setSort: (sort) => set(() => ({ sort })),
      setGroupBy: (groupBy) => set(() => ({ groupBy })),
    }),
    {
      name: "apply-ai-job-board",
      partialize: (state) =>
        ({
          jobs: state.jobs,
          filters: state.filters,
          sort: state.sort,
          groupBy: state.groupBy,
        }) as Pick<JobBoardState, "jobs" | "filters" | "sort" | "groupBy">,
    }
  )
);

export const selectJobs = () => useJobBoardStore.getState().jobs;

export const selectJobsByStage = (status: JobStage) => {
  const state = useJobBoardStore.getState();
  return state.jobs.filter((job) => job.status === status);
};

export const resetJobBoardState = () => {
  useJobBoardStore.getState().resetJobs();
  useJobBoardStore.getState().clearFilters();
  useJobBoardStore.getState().setView("board");
  useJobBoardStore.getState().setSort("recent");
  useJobBoardStore.getState().setGroupBy("status");
};
