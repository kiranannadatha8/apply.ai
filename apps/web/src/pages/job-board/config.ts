import type { ComponentType, SVGProps } from "react";

import {
  Archive,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Sparkles,
} from "lucide-react";

import type { JobStage } from "./types";

export interface JobStageConfig {
  key: JobStage;
  label: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: string;
  border: string;
}

export const JOB_STAGE_ORDER: JobStage[] = [
  "saved",
  "applied",
  "interviewing",
  "rejected",
  "offer",
];

export const JOB_STAGE_CONFIG: Record<JobStage, JobStageConfig> = {
  saved: {
    key: "saved",
    label: "Saved Jobs",
    description: "Keep track of interesting roles before you apply.",
    icon: Clock3,
    accent: "bg-sky-50 text-sky-600",
    border: "border-sky-200",
  },
  applied: {
    key: "applied",
    label: "Applied Jobs",
    description: "Applications that have been submitted.",
    icon: ClipboardList,
    accent: "bg-violet-50 text-violet-600",
    border: "border-violet-200",
  },
  interviewing: {
    key: "interviewing",
    label: "Interviews",
    description: "Opportunities with upcoming conversations.",
    icon: Sparkles,
    accent: "bg-amber-50 text-amber-600",
    border: "border-amber-200",
  },
  rejected: {
    key: "rejected",
    label: "Rejected Jobs",
    description: "Archive rejections to learn and revisit later.",
    icon: Archive,
    accent: "bg-rose-50 text-rose-600",
    border: "border-rose-200",
  },
  offer: {
    key: "offer",
    label: "Offered Jobs",
    description: "Offers and negotiations in progress.",
    icon: CheckCircle2,
    accent: "bg-emerald-50 text-emerald-600",
    border: "border-emerald-200",
  },
};
