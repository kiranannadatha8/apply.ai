import { create } from "zustand";
import type { DetectionResult } from "@/lib/detect/types";

export type PanelTab = "job" | "my-jobs" | "answers" | "timeline";
export type PanelSurface = "main" | "settings";
export type PanelMode = "loading" | "loggedOut" | "zeroData" | "ready";

export interface PanelState {
  isOpen: boolean;
  activeTab: PanelTab;
  surface: PanelSurface;
  mode: PanelMode;
  detection: DetectionResult | null;
  pinnedJobUrl: string | null;
  analysisStatus: "idle" | "pending" | "ready" | "error";
  autofillStatus: "idle" | "pending" | "completed" | "error";
  setOpen: (open: boolean) => void;
  toggle: (tab?: PanelTab) => void;
  setActiveTab: (tab: PanelTab) => void;
  setSurface: (surface: PanelSurface) => void;
  setMode: (mode: PanelMode) => void;
  setDetection: (det: DetectionResult | null) => void;
  setPinnedJobUrl: (url: string | null) => void;
  setAnalysisStatus: (
    status: PanelState["analysisStatus"],
  ) => void;
  setAutofillStatus: (
    status: PanelState["autofillStatus"],
  ) => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  isOpen: false,
  activeTab: "job",
  surface: "main",
  mode: "ready",
  detection: null,
  pinnedJobUrl: null,
  analysisStatus: "idle",
  autofillStatus: "idle",
  setOpen: (open) =>
    set((state) => ({
      isOpen: open,
      surface: open ? state.surface : "main",
    })),
  toggle: (tab) =>
    set((state) => ({
      isOpen: !state.isOpen || (tab && state.activeTab !== tab),
      activeTab: tab ?? state.activeTab,
      surface: tab ? "main" : state.surface,
    })),
  setActiveTab: (tab) =>
    set({
      activeTab: tab,
      surface: "main",
    }),
  setSurface: (surface) =>
    set({
      surface,
    }),
  setMode: (mode) =>
    set({
      mode,
    }),
  setDetection: (det) =>
    set({
      detection: det,
      pinnedJobUrl: det?.url ?? null,
      activeTab: det ? "job" : "job",
      surface: "main",
    }),
  setPinnedJobUrl: (url) =>
    set({
      pinnedJobUrl: url,
    }),
  setAnalysisStatus: (status) =>
    set({
      analysisStatus: status,
    }),
  setAutofillStatus: (status) =>
    set({
      autofillStatus: status,
    }),
}));
