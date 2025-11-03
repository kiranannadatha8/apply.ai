import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock } from "lucide-react";
import { useJobListQuery } from "../hooks";
import type { BoardFilters } from "../api";
import type { JobRecord, JobStatus } from "../types";
import type { JobListParams } from "../api";
import { useJobUIPrefs } from "@/stores/job-prefs";
import { cn } from "@/lib/utils";

function toStartCase(input?: string | null): string {
  if (!input) return "—";
  return input.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

interface JobListViewProps {
  filters?: BoardFilters;
  stageFilters?: JobStatus[];
  onSelectJob?: (id: string) => void;
  selectedJobId?: string | null;
}

export function JobListView({
  filters = {},
  stageFilters,
  onSelectJob,
  selectedJobId,
}: JobListViewProps) {
  const { density } = useJobUIPrefs();

  // Build query params
  const listParams = useMemo<JobListParams>(() => {
    const params: JobListParams = { limit: 200 };
    if (filters.q) params.q = filters.q;
    if (filters.tags) params.tag = filters.tags;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (stageFilters && stageFilters.length) {
      params.status = stageFilters.join(",");
    }
    if ("workspaceId" in filters && filters.workspaceId) {
      params.workspaceId = filters.workspaceId;
    }
    return params;
  }, [filters, stageFilters]);

  const { data, isLoading, error } = useJobListQuery(listParams, {
    staleTime: 30_000,
  });

  const jobs = data?.items ?? [];

  // Group jobs by stage/status and render sections similar to JobList
  const stageOrder: JobStatus[] = [
    "SAVED",
    "APPLIED",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
  ];

  const groups = useMemo(() => {
    const map = new Map<JobStatus, JobRecord[]>();
    stageOrder.forEach((s) => map.set(s, []));

    jobs.forEach((j) => {
      const s = (j.status ?? "SAVED") as JobStatus;
      const arr = map.get(s);
      if (arr) arr.push(j);
      else map.set(s, [j]);
    });

    return stageOrder
      .map((s) => ({ key: s, label: statusLabel(s), jobs: map.get(s) ?? [] }))
      .filter((g) => g.jobs.length > 0);
  }, [jobs]);

  if (isLoading && !jobs.length) {
    return <ListSkeleton density={density} />;
  }

  if (error && !jobs.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border/70 p-12 text-center text-muted-foreground">
        <p className="text-base font-medium">
          {toStartCase("Unable to load jobs")}
        </p>
        <p className="text-sm">
          {toStartCase("Please try again or adjust your filters.")}
        </p>
      </div>
    );
  }

  if (!jobs.length) {
    // Empty state styled like the reference components
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border/70 p-12 text-center text-muted-foreground">
        <p className="text-base font-medium">
          {toStartCase("No jobs match your filters")}
        </p>
        <p className="text-sm">
          {toStartCase("Adjust filters or add a new job to get started.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.key} className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              {toStartCase(group.label)}
            </h2>
            <Badge variant="secondary">
              {group.jobs.length} {toStartCase("roles")}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.jobs.map((job) => (
              <JobCardView
                key={job.id}
                job={job}
                selected={selectedJobId === job.id}
                onClick={() => onSelectJob?.(job.id)}
                density={density}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ListSkeleton({ density }: { density: "comfortable" | "compact" }) {
  const rows = density === "compact" ? 12 : 8;
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70">
      <div className="border-b border-slate-800 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        Jobs
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl bg-slate-800/50"
          />
        ))}
      </div>
    </div>
  );
}

function JobCardView({
  job,
  selected,
  onClick,
  density,
}: {
  job: JobRecord;
  selected: boolean;
  onClick: () => void;
  density: "comfortable" | "compact";
}) {
  const tags = (job as any)?.tags as string[] | undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "group/item w-full rounded-2xl border border-border/60 bg-background px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md " +
        (selected ? " ring-1 ring-slate-600" : "")
      }
      style={{ height: density === "compact" ? 120 : 140 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div
            aria-hidden
            className="flex size-11 items-center justify-center rounded-xl font-semibold text-white"
            style={{
              background:
                (job as any)?.color ||
                "linear-gradient(135deg, rgba(37,99,235,1) 0%, rgba(147,51,234,1) 100%)",
            }}
          >
            {getInitials(job.companyName ?? "")}
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <p className="text-sm font-medium text-muted-foreground">
              {toStartCase(job.companyName ?? "")}
            </p>
            <h3 className="text-base font-semibold text-foreground">
              {toStartCase(job.title ?? "")}
            </h3>
            {tags && tags.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-transparent bg-muted/80 text-muted-foreground"
                  >
                    {toStartCase(tag)}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(statusBadgeClasses(job.status), "text-xs")}
        >
          {toStartCase(statusLabel(job.status))}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="size-3.5" />
          {toStartCase(job.location ?? "Remote")}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3.5" />
          {toStartCase(formatRelative(job.updatedAt))}
        </span>
      </div>
    </button>
  );
}

function getInitials(company: string) {
  return company
    .split(" ")
    .slice(0, 2)
    .map((part) => part.at(0))
    .filter(Boolean)
    .join("")
    .toUpperCase();
}

function statusLabel(status: JobRecord["status"]) {
  switch (status) {
    case "SAVED":
      return "Saved";
    case "APPLIED":
      return "Applied";
    case "INTERVIEW":
      return "Interview";
    case "OFFER":
      return "Offer";
    case "REJECTED":
      return "Rejected";
    default:
      return status ?? "—";
  }
}

function statusBadgeClasses(status: JobRecord["status"]) {
  switch (status) {
    case "SAVED":
      return "border-slate-700 bg-slate-800/60 text-slate-200";
    case "APPLIED":
      return "border-blue-700 bg-blue-500/15 text-blue-300";
    case "INTERVIEW":
      return "border-amber-700 bg-amber-500/15 text-amber-300";
    case "OFFER":
      return "border-emerald-700 bg-emerald-500/15 text-emerald-300";
    case "REJECTED":
      return "border-rose-700 bg-rose-500/15 text-rose-300";
    default:
      return "border-slate-700 bg-slate-800/60 text-slate-200";
  }
}

function formatRelative(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
