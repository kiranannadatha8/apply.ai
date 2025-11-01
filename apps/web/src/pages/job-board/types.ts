import type { ApplicationStatus } from "@/lib/types";

export type JobStage = ApplicationStatus;

export type WorkStyle = "Remote" | "Hybrid" | "Onsite";
export type EmploymentType = "Full Time" | "Part Time" | "Contract";

export interface CompensationRange {
  currency: "USD";
  min: number;
  max: number;
  cadence: "year";
}

export interface JobActivity {
  label: string;
  value: string;
  type: "applied" | "interview" | "offer" | "note" | "other";
}

export interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  status: JobStage;
  location: string;
  compensation?: CompensationRange;
  workStyle: WorkStyle;
  employmentType: EmploymentType;
  appliedAt?: string;
  followUpAt?: string;
  description?: string;
  notes?: string;
  activities: JobActivity[];
  tags: string[];
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobBoardFilters {
  searchTerm: string;
  workStyles: WorkStyle[];
  employmentTypes: EmploymentType[];
  statuses: JobStage[];
  dateRange?: { start: string | null; end: string | null };
}

export type JobBoardView = "board" | "list" | "table";

export type SortOption =
  | "recent"
  | "salary-high"
  | "salary-low"
  | "company"
  | "title";

export type GroupOption = "status" | "company" | "workStyle";
