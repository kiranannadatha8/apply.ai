import { useMemo, useState } from "react";
import {
  Filter,
  LayoutGrid,
  List,
  Table,
  Calendar,
  MoreHorizontal,
  Group,
  ArrowDownWideNarrow,
} from "lucide-react";
import Papa from "papaparse";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { JobBoardView } from "@/features/jobs/components/board-view";
import { JobListView } from "@/features/jobs/components/list-view";
import { JobTableView } from "@/features/jobs/components/table-view";
import { JobDetailDrawer } from "@/features/jobs/components/job-detail-drawer";
import type { BoardFilters } from "@/features/jobs/api";
import { fetchJobList } from "@/features/jobs/api";
import { useJobUIPrefs } from "@/stores/job-prefs";
import { useWorkspace } from "@/stores/workspace";
import { JOB_STATUSES, type JobStatus } from "@/features/jobs/schemas";
import { BOARD_STAGE_CONFIG } from "@/features/jobs/board/stage-config";

import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { Separator } from "@/components/ui/separator";

const VIEW_OPTIONS = [
  { value: "board", label: "Board", icon: LayoutGrid },
  { value: "list", label: "List", icon: List },
  { value: "table", label: "Table", icon: Table },
];

const DATE_PRESETS = [
  {
    label: "All time",
    value: "all",
    resolve: () => undefined,
  },
  {
    label: "Last 7 days",
    value: "7d",
    resolve: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      return { start: start.toISOString(), end: end.toISOString() };
    },
  },
  {
    label: "Last 30 days",
    value: "30d",
    resolve: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      return { start: start.toISOString(), end: end.toISOString() };
    },
  },
  {
    label: "This quarter",
    value: "quarter",
    resolve: () => {
      const end = new Date();
      const start = new Date(
        end.getFullYear(),
        Math.floor(end.getMonth() / 3) * 3,
        1,
      );
      return { start: start.toISOString(), end: end.toISOString() };
    },
  },
];

export function JobBoard() {
  const { view, setView } = useJobUIPrefs();
  const { activeWorkspaceId } = useWorkspace();
  const [search] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [stageFilters, setStageFilters] = useState<JobStatus[]>(() => [
    ...JOB_STATUSES,
  ]);
  const [datePreset, setDatePreset] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(
    undefined,
  );

  const dateRange = useMemo(() => {
    if (customRange?.from && customRange?.to) {
      return {
        start: customRange.from.toISOString(),
        end: customRange.to.toISOString(),
      };
    }
    const preset = DATE_PRESETS.find((p) => p.value === datePreset);
    return preset?.resolve?.();
  }, [datePreset, customRange]);

  const dateLabel = useMemo(() => {
    if (!dateRange) return "All time";
    if (dateRange?.start && dateRange?.end) {
      const fmt = (iso: string) =>
        new Date(iso).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      return `${fmt(dateRange.start)} - ${fmt(dateRange.end)}`;
    }
    return "Select dates";
  }, [dateRange]);

  const filters = useMemo<BoardFilters>(() => {
    const next: BoardFilters = {};
    const trimmed = search.trim();
    if (trimmed) next.q = trimmed;
    if (tagFilter.trim()) next.tags = tagFilter.trim();
    if (dateRange?.start) next.from = dateRange.start;
    if (dateRange?.end) next.to = dateRange.end;
    if (activeWorkspaceId) next.workspaceId = activeWorkspaceId;
    return next;
  }, [search, tagFilter, dateRange, activeWorkspaceId]);

  const handleSelectJob = (id: string) => {
    setSelectedJobId(id);
    setDetailOpen(true);
  };

  const toggleStage = (status: JobStatus) => {
    setStageFilters((prev) => {
      let next = prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status];
      if (!next.length) next = [...JOB_STATUSES];
      return next;
    });
  };

  const resetFilters = () => {
    setStageFilters([...JOB_STATUSES]);
    setTagFilter("");
    setDatePreset("all");
    setCustomRange(undefined);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (stageFilters.length !== JOB_STATUSES.length) count += 1;
    if (tagFilter.trim()) count += 1;
    if (datePreset !== "all") count += 1;
    return count;
  }, [stageFilters, tagFilter, datePreset]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params: any = {
        limit: 1000,
        q: filters.q,
        from: filters.from,
        to: filters.to,
      };
      if (filters.tags) params.tag = filters.tags;
      if (filters.workspaceId) params.workspaceId = filters.workspaceId;
      if (stageFilters.length && stageFilters.length !== JOB_STATUSES.length) {
        params.status = stageFilters.join(",");
      }
      const res = await fetchJobList(params);
      const csv = Papa.unparse(
        res.items.map((job) => ({
          Stage:
            BOARD_STAGE_CONFIG[job.status as JobStatus]?.label ??
            job.status ??
            "",
          Title: job.title,
          Company: job.companyName,
          Location: job.location ?? "Remote",
          Tags: job.tags.join("; "),
          Source: job.sourceKind ?? "",
          Applied: job.appliedAt ?? "",
          Updated: job.updatedAt ?? "",
          Link: job.jobUrl ?? "",
        })),
      );
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "applyai-jobs.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-5">
        {/* Top row: title + actions */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-foreground">
              Jobs
            </h1>
            <p className="text-sm text-muted-foreground">
              Keep track of your applied job all in one place
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date range picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2 rounded-lg px-3"
                >
                  <Calendar className="size-4" />
                  {dateLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border border-border bg-popover text-popover-foreground">
                <CalendarPicker
                  mode="range"
                  numberOfMonths={2}
                  selected={{ from: customRange?.from, to: customRange?.to }}
                  onSelect={(range) => {
                    if (!range || !range.from || !range.to) {
                      setCustomRange(undefined);
                      setDatePreset("all");
                      return;
                    }
                    setCustomRange(range);
                    setDatePreset("custom");
                  }}
                  autoFocus
                  disabled={(date) => date > new Date()}
                />
                <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCustomRange(undefined);
                      setDatePreset("all");
                    }}
                  >
                    Clear
                  </Button>
                  {customRange?.from && customRange?.to ? (
                    <span className="text-muted-foreground">
                      {customRange.from.toLocaleDateString()} –{" "}
                      {customRange.to.toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">All time</span>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {/* Add Job primary action */}
            <Button size="sm" className="h-9 rounded-lg px-4">
              Add Job
            </Button>
          </div>
        </div>

        {/* Second row: view tabs + tools */}
        <div className="flex items-center justify-between pb-2">
          {/* View tabs */}
          <nav className="flex items-center gap-6">
            {VIEW_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = view === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setView(option.value as typeof view)}
                  className={`flex items-center gap-2 pb-2 text-sm transition-colors ${
                    isActive
                      ? "border-b border-foreground text-foreground"
                      : "border-b border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Tools on the right */}
          <div className="flex items-center gap-3 text-sm">
            {/* Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 px-2 pb-3 hover:bg-background dark:hover:bg-background cursor-pointer text-muted-foreground"
                >
                  <Filter className="size-4" />
                  Filter
                  {activeFilterCount ? (
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-[1px] text-xs">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </Button>
              </PopoverTrigger>
              {/* Reuse existing filter content */}
              <PopoverContent className="w-72 space-y-4 border border-border bg-popover text-popover-foreground">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Stage
                  </div>
                  <div className="mt-2 grid gap-2">
                    {JOB_STATUSES.map((status) => {
                      const config = BOARD_STAGE_CONFIG[status];
                      return (
                        <label
                          key={status}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={stageFilters.includes(status)}
                            onCheckedChange={() => toggleStage(status)}
                          />
                          <span>{config.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="tag-filter"
                    className="text-xs uppercase tracking-wide text-muted-foreground"
                  >
                    Tags
                  </Label>
                  <Input
                    id="tag-filter"
                    placeholder="e.g. frontend, hiring manager"
                    value={tagFilter}
                    onChange={(event) => setTagFilter(event.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Date range
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    {DATE_PRESETS.map((preset) => (
                      <Button
                        key={preset.value}
                        variant={
                          datePreset === preset.value && !customRange
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        className="justify-start"
                        onClick={() => {
                          setDatePreset(preset.value);
                          setCustomRange(undefined);
                        }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    Reset
                  </Button>
                  <span>{stageFilters.length} stages selected</span>
                </div>
              </PopoverContent>
            </Popover>

            {/* Group by (placeholder action) */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-2 px-2 pb-3 hover:bg-background dark:hover:bg-background cursor-pointer text-muted-foreground"
            >
              <Group className="size-4" />
              Group by
            </Button>

            {/* Sort by (placeholder action) */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-2 px-2 pb-3 hover:bg-background dark:hover:bg-background cursor-pointer text-muted-foreground"
            >
              <ArrowDownWideNarrow className="size-4" />
              Sort by
            </Button>

            {/* Overflow actions */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 pb-3 text-muted-foreground hover:bg-background dark:hover:bg-background cursor-pointer"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 space-y-1 p-2 border border-border bg-popover text-popover-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleExportCsv}
                  disabled={exporting}
                >
                  {exporting ? "Exporting…" : "Export CSV"}
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      <Separator className="absolute left-0 right-0 top-55" />

      <main className="flex-1">
        {view === "board" ? (
          <JobBoardView
            filters={filters}
            onSelectJob={handleSelectJob}
            selectedJobId={selectedJobId}
            allowedStatuses={
              stageFilters.length && stageFilters.length !== JOB_STATUSES.length
                ? stageFilters
                : undefined
            }
          />
        ) : view === "list" ? (
          <JobListView
            filters={filters}
            stageFilters={
              stageFilters.length && stageFilters.length !== JOB_STATUSES.length
                ? stageFilters
                : undefined
            }
            onSelectJob={handleSelectJob}
            selectedJobId={selectedJobId}
          />
        ) : (
          <JobTableView
            filters={filters}
            stageFilters={
              stageFilters.length && stageFilters.length !== JOB_STATUSES.length
                ? stageFilters
                : undefined
            }
            onSelectJob={handleSelectJob}
            selectedJobId={selectedJobId}
          />
        )}
      </main>
      <JobDetailDrawer
        jobId={selectedJobId}
        open={detailOpen && Boolean(selectedJobId)}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedJobId(null);
        }}
        workspaceId={activeWorkspaceId ?? undefined}
      />
    </div>
  );
}
