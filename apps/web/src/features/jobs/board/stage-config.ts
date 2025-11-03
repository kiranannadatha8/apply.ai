import type { ComponentType } from "react";
import type { JobStatus } from "../types";
import {
  BookmarkCheck,
  BookmarkX,
  CalendarClock,
  CircleCheckBig,
  ClipboardList,
} from "lucide-react";

export interface BoardStageConfig {
  status: JobStatus;
  label: string;
  description: string;
  accentClass: string;
  icon: ComponentType<{ className?: string }>;
}

export const BOARD_STAGE_CONFIG: Record<JobStatus, BoardStageConfig> = {
  SAVED: {
    status: "SAVED",
    label: "Saved Jobs",
    description: "Roles you’re tracking before applying.",
    accentClass: "bg-sky-500/10 text-sky-300 border-sky-500/30",
    icon: BookmarkCheck,
  },
  APPLIED: {
    status: "APPLIED",
    label: "Applied Jobs",
    description: "Applications that were submitted.",
    accentClass: "bg-violet-500/10 text-violet-300 border-violet-500/30",
    icon: ClipboardList,
  },
  INTERVIEW: {
    status: "INTERVIEW",
    label: "Interviews",
    description: "Conversations in flight.",
    accentClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    icon: CalendarClock,
  },
  OFFER: {
    status: "OFFER",
    label: "Offer",
    description: "Negotiations and offers.",
    accentClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    icon: CircleCheckBig,
  },
  REJECTED: {
    status: "REJECTED",
    label: "Rejected Jobs",
    description: "Archived outcomes to review later.",
    accentClass: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    icon: BookmarkX,
  },
};

export const BOARD_STAGE_ORDER: JobStatus[] = [
  "SAVED",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

export type BoardStageConfigMap = typeof BOARD_STAGE_CONFIG;
