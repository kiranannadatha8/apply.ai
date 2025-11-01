import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  CalendarDays,
  Building2,
  Filter,
  LayoutGrid,
  List,
  Plus,
  Table as TableIcon,
  Globe2,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";

import { JOB_STAGE_CONFIG, JOB_STAGE_ORDER } from "../config";
import { useJobBoardStore } from "../store";
import type {
  EmploymentType,
  GroupOption,
  JobOpportunity,
  SortOption,
  WorkStyle,
} from "../types";
import { formatDate } from "../utils/date";
import { colorFromText } from "../utils/color";
import { BoardColumn } from "./board-column";
import { AddJobDialog } from "./add-job-dialog";
import { JobList, type JobListGroup } from "./job-list";
import { JobTable } from "./job-table";

const WORK_STYLE_OPTIONS: WorkStyle[] = ["Remote", "Hybrid", "Onsite"];
const EMPLOYMENT_OPTIONS: EmploymentType[] = [
  "Full Time",
  "Part Time",
  "Contract",
];

const VIEW_OPTIONS = [
  { value: "board" as const, label: "Board", icon: LayoutGrid },
  { value: "list" as const, label: "List", icon: List },
  { value: "table" as const, label: "Table", icon: TableIcon },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "recent", label: "Recently updated" },
  { value: "salary-high", label: "Salary: High to low" },
  { value: "salary-low", label: "Salary: Low to high" },
  { value: "company", label: "Company A-Z" },
  { value: "title", label: "Role A-Z" },
];

const GROUP_OPTIONS: Array<{
  value: GroupOption;
  label: string;
  icon: any;
}> = [
  { value: "status", label: "Status", icon: UsersRound },
  { value: "company", label: "Company", icon: Building2 },
  { value: "workStyle", label: "Work style", icon: Globe2 },
];

const DATE_PRESETS = [
  {
    label: "Last 7 days",
    value: "7",
    resolve: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      return { start: start.toISOString(), end: end.toISOString() };
    },
  },
  {
    label: "Last 30 days",
    value: "30",
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
        1
      );
      return { start: start.toISOString(), end: end.toISOString() };
    },
  },
  {
    label: "All time",
    value: "all",
    resolve: () => undefined,
  },
];

const getSalaryValue = (job: JobOpportunity) => {
  if (!job.compensation) return 0;
  return (job.compensation.min + job.compensation.max) / 2;
};

const applySort = (jobs: JobOpportunity[], sort: SortOption) => {
  const data = [...jobs];
  switch (sort) {
    case "recent":
      data.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      break;
    case "salary-high":
      data.sort((a, b) => getSalaryValue(b) - getSalaryValue(a));
      break;
    case "salary-low":
      data.sort((a, b) => getSalaryValue(a) - getSalaryValue(b));
      break;
    case "company":
      data.sort((a, b) => a.company.localeCompare(b.company));
      break;
    case "title":
      data.sort((a, b) => a.title.localeCompare(b.title));
      break;
    default:
      break;
  }
  return data;
};

const buildGroups = (
  jobs: JobOpportunity[],
  groupBy: GroupOption,
  sort: SortOption
): JobListGroup[] => {
  if (!jobs.length) {
    return [];
  }

  if (groupBy === "status") {
    return JOB_STAGE_ORDER.map((stage) => ({
      key: stage,
      label: JOB_STAGE_CONFIG[stage].label,
      helper: undefined,
      jobs: applySort(
        jobs.filter((job) => job.status === stage),
        sort
      ),
    })).filter((group) => group.jobs.length > 0);
  }

  if (groupBy === "company") {
    const companies = new Map<string, JobOpportunity[]>();
    jobs.forEach((job) => {
      const key = job.company;
      companies.set(key, [...(companies.get(key) ?? []), job]);
    });
    return Array.from(companies.entries())
      .map(([key, value]) => ({
        key,
        label: key,
        helper: `${value.length} role${value.length > 1 ? "s" : ""}`,
        jobs: applySort(value, sort),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  const styles = new Map<string, JobOpportunity[]>();
  jobs.forEach((job) => {
    styles.set(job.workStyle, [...(styles.get(job.workStyle) ?? []), job]);
  });
  return Array.from(styles.entries()).map(([key, value]) => ({
    key,
    label: key,
    helper: `${value.length} role${value.length > 1 ? "s" : ""}`,
    jobs: applySort(value, sort),
  }));
};

export function JobBoard() {
  const jobs = useJobBoardStore((state) => state.jobs);
  const filters = useJobBoardStore((state) => state.filters);
  const sort = useJobBoardStore((state) => state.sort);
  const view = useJobBoardStore((state) => state.view);
  const groupBy = useJobBoardStore((state) => state.groupBy);

  const setFilters = useJobBoardStore((state) => state.setFilters);
  const clearFilters = useJobBoardStore((state) => state.clearFilters);
  const setSort = useJobBoardStore((state) => state.setSort);
  const setView = useJobBoardStore((state) => state.setView);
  const setGroupBy = useJobBoardStore((state) => state.setGroupBy);
  const setSearchTerm = useJobBoardStore((state) => state.setSearchTerm);
  const addJob = useJobBoardStore((state) => state.addJob);
  const moveJob = useJobBoardStore((state) => state.moveJob);
  const reorderWithinStage = useJobBoardStore(
    (state) => state.reorderWithinStage
  );

  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [isSortOpen, setSortOpen] = useState(false);
  const [isGroupOpen, setGroupOpen] = useState(false);
  const [isDateOpen, setDateOpen] = useState(false);

  useEffect(() => {
    if (view === "board" && groupBy !== "status") {
      setGroupBy("status");
    }
  }, [view, groupBy, setGroupBy]);

  const filteredJobs = useMemo(() => {
    let data = [...jobs];

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      data = data.filter((job) =>
        [job.title, job.company, job.location]
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
    }

    if (filters.statuses.length) {
      data = data.filter((job) => filters.statuses.includes(job.status));
    }

    if (filters.workStyles.length) {
      data = data.filter((job) => filters.workStyles.includes(job.workStyle));
    }

    if (filters.employmentTypes.length) {
      data = data.filter((job) =>
        filters.employmentTypes.includes(job.employmentType)
      );
    }

    if (filters.dateRange?.start || filters.dateRange?.end) {
      const startTs = filters.dateRange?.start
        ? new Date(filters.dateRange.start).getTime()
        : undefined;
      const endTs = filters.dateRange?.end
        ? new Date(filters.dateRange.end).getTime()
        : undefined;
      data = data.filter((job) => {
        const updated = new Date(job.updatedAt).getTime();
        if (startTs && updated < startTs) return false;
        if (endTs && updated > endTs) return false;
        return true;
      });
    }

    return data;
  }, [jobs, filters]);

  const boardColumns = useMemo(
    () =>
      JOB_STAGE_ORDER.map((stage) => ({
        stage,
        jobs: applySort(
          filteredJobs.filter((job) => job.status === stage),
          sort
        ),
      })),
    [filteredJobs, sort]
  );

  const listGroups = useMemo(
    () => buildGroups(filteredJobs, groupBy, sort),
    [filteredJobs, sort, groupBy]
  );

  const tableJobs = useMemo(
    () => applySort(filteredJobs, sort),
    [filteredJobs, sort]
  );

  const dateLabel = filters.dateRange?.start
    ? `${formatDate(filters.dateRange.start)} - ${formatDate(
        filters.dateRange?.end ?? new Date().toISOString()
      )}`
    : "All time";

  const activeFiltersCount =
    filters.statuses.length +
    filters.workStyles.length +
    filters.employmentTypes.length +
    (filters.dateRange?.start || filters.dateRange?.end ? 1 : 0);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 py-6">
      <section>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Jobs</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Keep track of your applied job all in one place.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Popover open={isDateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 px-4 py-2 text-sm"
                  >
                    <CalendarDays className="size-4" />
                    {dateLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 space-y-1 p-2">
                  {DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-muted"
                      onClick={() => {
                        const range = preset.resolve?.();
                        if (!range) {
                          setFilters({ dateRange: undefined });
                        } else {
                          setFilters({ dateRange: range });
                        }
                        setDateOpen(false);
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <Button
                variant="default"
                className="flex items-center px-4 py-2 text-sm"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="size-5" /> Add Job
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-b pb-2">
            <div className="flex items-center gap-2">
              {VIEW_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "hover:bg-transparent",
                    view === option.value
                      ? "bg-background text-foreground"
                      : "text-muted-foreground"
                  )}
                  onClick={() => setView(option.value)}
                >
                  <option.icon className="size-4" />
                  {option.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Popover open={isFilterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 px-4 text-sm text-muted-foreground hover:bg-transparent"
                  >
                    <Filter className="size-4" /> Filter
                    {activeFiltersCount > 0 && (
                      <Badge
                        className="ml-1 rounded-full bg-primary/10 text-primary"
                        variant="secondary"
                      >
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 space-y-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                    Filters
                    <button
                      type="button"
                      className="text-xs text-muted-foreground"
                      onClick={() => clearFilters()}
                    >
                      Clear all
                    </button>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Status
                    </p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {JOB_STAGE_ORDER.map((stage) => (
                        <label
                          key={stage}
                          className="flex items-center gap-2 text-sm text-foreground"
                        >
                          <Checkbox
                            checked={filters.statuses.includes(stage)}
                            onCheckedChange={(checked) => {
                              const isChecked = checked === true;
                              const next = isChecked
                                ? [...filters.statuses, stage]
                                : filters.statuses.filter(
                                    (value) => value !== stage
                                  );
                              setFilters({ statuses: next });
                            }}
                          />
                          <span>{JOB_STAGE_CONFIG[stage].label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Work style
                    </p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {WORK_STYLE_OPTIONS.map((style) => (
                        <label
                          key={style}
                          className="flex items-center gap-2 text-sm text-foreground"
                        >
                          <Checkbox
                            checked={filters.workStyles.includes(style)}
                            onCheckedChange={(checked) => {
                              const isChecked = checked === true;
                              const next = isChecked
                                ? [...filters.workStyles, style]
                                : filters.workStyles.filter(
                                    (value) => value !== style
                                  );
                              setFilters({ workStyles: next });
                            }}
                          />
                          <span>{style}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Employment type
                    </p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {EMPLOYMENT_OPTIONS.map((type) => (
                        <label
                          key={type}
                          className="flex items-center gap-2 text-sm text-foreground"
                        >
                          <Checkbox
                            checked={filters.employmentTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              const isChecked = checked === true;
                              const next = isChecked
                                ? [...filters.employmentTypes, type]
                                : filters.employmentTypes.filter(
                                    (value) => value !== type
                                  );
                              setFilters({ employmentTypes: next });
                            }}
                          />
                          <span>{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={isGroupOpen} onOpenChange={setGroupOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 px-4 text-sm hover:bg-transparent disabled:cursor-not-allowed"
                    disabled={view === "board"}
                  >
                    <UsersRound className="size-4" /> Group by
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 space-y-1">
                  {GROUP_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm transition",
                        groupBy === option.value
                          ? "bg-muted text-foreground"
                          : "hover:bg-muted"
                      )}
                      onClick={() => {
                        setGroupBy(option.value);
                        setGroupOpen(false);
                      }}
                    >
                      <option.icon className="size-4" />
                      <span>{option.label}</span>
                      {groupBy === option.value && (
                        <Badge variant="secondary" className="ml-auto">
                          Active
                        </Badge>
                      )}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              <Popover open={isSortOpen} onOpenChange={setSortOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 px-4 text-sm hover:bg-transparent text-muted-foreground"
                  >
                    <ArrowUpDown className="size-4" /> Sort by
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 space-y-1">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition",
                        sort === option.value
                          ? "bg-muted text-foreground"
                          : "hover:bg-muted"
                      )}
                      onClick={() => {
                        setSort(option.value);
                        setSortOpen(false);
                      }}
                    >
                      {option.label}
                      {sort === option.value && (
                        <span className="text-xs text-muted-foreground">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </section>

      <section>
        {view === "board" && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {boardColumns.map(({ stage, jobs: stageJobs }) => (
              <BoardColumn
                key={stage}
                stage={stage}
                jobs={stageJobs}
                onMove={(jobId, nextStage, position) =>
                  moveJob(jobId, nextStage, position)
                }
                onReorder={(status, from, to) =>
                  reorderWithinStage(status, from, to)
                }
              />
            ))}
          </div>
        )}

        {view === "list" && <JobList groups={listGroups} />}

        {view === "table" && <JobTable jobs={tableJobs} />}
      </section>

      <AddJobDialog
        open={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={(payload) => {
          addJob({ ...payload, color: colorFromText(payload.company) });
        }}
      />
    </div>
  );
}
