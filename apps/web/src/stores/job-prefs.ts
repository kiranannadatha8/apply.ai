import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { JOB_STATUSES, type JobStatus } from "@/features/jobs/schemas";

export type JobBoardView = "board" | "list" | "table";

export type DensityMode = "comfortable" | "compact";

export interface SavedJobView {
  id: string;
  name: string;
  createdAt: number;
  filters: Record<string, unknown>;
  layout?: Record<string, unknown>;
}

interface JobUIPrefsState {
  view: JobBoardView;
  density: DensityMode;
  boardHiddenStages: JobStatus[];
  tableColumnVisibility: Record<string, boolean>;
  tableColumnWidths: Record<string, number>;
  tablePinnedColumns: { left: string[]; right: string[] };
  boardCollapsed: Record<JobStatus, boolean>;
  boardWipLimits: Record<JobStatus, number | null>;
  savedViews: SavedJobView[];
  setView: (view: JobBoardView) => void;
  setDensity: (density: DensityMode) => void;
  toggleStageVisibility: (status: JobStatus) => void;
  setStageVisibility: (status: JobStatus, visible: boolean) => void;
  setTableColumnVisibility: (columnId: string, visible: boolean) => void;
  toggleTableColumn: (columnId: string) => void;
  setTableColumnWidth: (columnId: string, width: number) => void;
  setTableColumnSizing: (sizes: Record<string, number>) => void;
  setTablePinnedColumns: (config: {
    left?: string[];
    right?: string[];
  }) => void;
  setColumnCollapsed: (status: JobStatus, collapsed: boolean) => void;
  setWipLimit: (status: JobStatus, limit: number | null) => void;
  upsertSavedView: (view: SavedJobView) => void;
  deleteSavedView: (id: string) => void;
  resetColumns: () => void;
}

const defaultBoardCollapsed = JOB_STATUSES.reduce<Record<JobStatus, boolean>>(
  (acc, status) => {
    acc[status] = false;
    return acc;
  },
  {} as Record<JobStatus, boolean>,
);

const defaultWipLimits = JOB_STATUSES.reduce<Record<JobStatus, number | null>>(
  (acc, status) => {
    acc[status] = null;
    return acc;
  },
  {} as Record<JobStatus, number | null>,
);

export const useJobUIPrefs = create(
  persist<JobUIPrefsState>(
    (set) => ({
      view: "board",
      density: "comfortable",
      boardHiddenStages: [],
      tableColumnVisibility: {},
      tableColumnWidths: {},
      tablePinnedColumns: { left: [], right: [] },
      boardCollapsed: { ...defaultBoardCollapsed },
      boardWipLimits: { ...defaultWipLimits },
      savedViews: [],
      setView: (view) => set({ view }),
      setDensity: (density) => set({ density }),
      toggleStageVisibility: (status) =>
        set((state) => {
          const hidden = new Set(state.boardHiddenStages);
          if (hidden.has(status)) hidden.delete(status);
          else hidden.add(status);
          return { boardHiddenStages: Array.from(hidden) };
        }),
      setStageVisibility: (status, visible) =>
        set((state) => {
          const hidden = new Set(state.boardHiddenStages);
          if (!visible) hidden.add(status);
          else hidden.delete(status);
          return { boardHiddenStages: Array.from(hidden) };
        }),
      setTableColumnVisibility: (columnId, visible) =>
        set((state) => ({
          tableColumnVisibility: {
            ...state.tableColumnVisibility,
            [columnId]: visible,
          },
        })),
      toggleTableColumn: (columnId) =>
        set((state) => ({
          tableColumnVisibility: {
            ...state.tableColumnVisibility,
            [columnId]: !(state.tableColumnVisibility[columnId] ?? true),
          },
        })),
      setTableColumnWidth: (columnId, width) =>
        set((state) => ({
          tableColumnWidths: { ...state.tableColumnWidths, [columnId]: width },
        })),
      setTableColumnSizing: (sizes) => set({ tableColumnWidths: sizes }),
      setTablePinnedColumns: ({ left, right }) =>
        set((state) => ({
          tablePinnedColumns: {
            left: left ?? state.tablePinnedColumns.left,
            right: right ?? state.tablePinnedColumns.right,
          },
        })),
      setColumnCollapsed: (status, collapsed) =>
        set((state) => ({
          boardCollapsed: { ...state.boardCollapsed, [status]: collapsed },
        })),
      setWipLimit: (status, limit) =>
        set((state) => ({
          boardWipLimits: { ...state.boardWipLimits, [status]: limit },
        })),
      upsertSavedView: (view) =>
        set((state) => {
          const existingIdx = state.savedViews.findIndex(
            (v) => v.id === view.id,
          );
          if (existingIdx >= 0) {
            const next = [...state.savedViews];
            next[existingIdx] = view;
            return { savedViews: next };
          }
          return { savedViews: [...state.savedViews, view] };
        }),
      deleteSavedView: (id) =>
        set((state) => ({
          savedViews: state.savedViews.filter((view) => view.id !== id),
        })),
      resetColumns: () =>
        set({
          boardHiddenStages: [],
          tableColumnVisibility: {},
          tableColumnWidths: {},
          tablePinnedColumns: { left: ["title"], right: [] },
          boardCollapsed: { ...defaultBoardCollapsed },
          boardWipLimits: { ...defaultWipLimits },
        }),
    }),
    {
      name: "applyai-job-ui-prefs",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
