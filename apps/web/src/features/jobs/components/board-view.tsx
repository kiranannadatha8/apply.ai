import { useEffect, useMemo, useState, useRef, type ChangeEvent } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BOARD_STAGE_CONFIG,
  BOARD_STAGE_ORDER,
  type BoardStageConfig,
} from "../board/stage-config";
import { useJobBoardQuery, useMoveJobMutation } from "../hooks";
import type { BoardFilters } from "../api";
import type { JobRecord, JobStatus } from "../types";
import { useJobUIPrefs } from "@/stores/job-prefs";
import { MoreHorizontal, Plus, Clock, Link2, MapPin } from "lucide-react";

interface BoardViewProps {
  filters?: BoardFilters;
  onAddJob?: (status: JobStatus) => void;
  onSelectJob?: (jobId: string) => void;
  selectedJobId?: string | null;
  allowedStatuses?: JobStatus[];
}

type ActiveJob = {
  id: string;
  status: JobStatus;
};

export function JobBoardView({
  filters = {},
  onAddJob,
  onSelectJob,
  selectedJobId,
  allowedStatuses,
}: BoardViewProps) {
  const { data, isLoading, error } = useJobBoardQuery(filters, {
    staleTime: 30_000,
  });
  const moveMutation = useMoveJobMutation(filters);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const {
    boardHiddenStages,
    toggleStageVisibility,
    boardCollapsed,
    setColumnCollapsed,
    boardWipLimits,
    setWipLimit,
  } = useJobUIPrefs();

  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);

  const visibleColumns = useMemo(() => {
    if (!data) return [];
    return data.columns.filter((column) => {
      if (boardHiddenStages.includes(column.status)) return false;
      if (allowedStatuses && allowedStatuses.length) {
        return allowedStatuses.includes(column.status);
      }
      return true;
    });
  }, [data, boardHiddenStages, allowedStatuses]);

  const hiddenStageConfigs = BOARD_STAGE_ORDER.filter((status) =>
    boardHiddenStages.includes(status),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const status = event.active.data.current?.column as JobStatus | undefined;
    if (status) {
      setActiveJob({ id: String(event.active.id), status });
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // placeholder if we want to preview column highlight
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveJob(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const activeStatus = active.data.current?.column as JobStatus | undefined;
    const overData = over.data.current ?? {};
    const overStatus =
      (overData.column as JobStatus | undefined) ?? (over.id as JobStatus);

    if (!activeStatus || !overStatus) return;
    if (!data) return;

    const sourceColumn = data.columns.find(
      (column) => column.status === activeStatus,
    );
    const targetColumn = data.columns.find(
      (column) => column.status === overStatus,
    );
    if (!sourceColumn || !targetColumn) return;

    let targetIndex: number;
    if (overData?.type === "card") {
      targetIndex = overData.index as number;
      if (
        activeStatus === overStatus &&
        active.data.current?.index !== undefined &&
        targetIndex > active.data.current.index
      ) {
        targetIndex -= 1;
      }
    } else {
      targetIndex = targetColumn.jobs.length;
    }

    const isSamePosition =
      activeStatus === overStatus && active.data.current?.index === targetIndex;
    if (isSamePosition) return;

    moveMutation.mutate({
      id: activeId,
      toStatus: overStatus,
      toIndex: Math.max(0, targetIndex),
    });
  };

  const renderColumns = () => {
    if (isLoading) {
      return BOARD_STAGE_ORDER.map((status) => (
        <SkeletonColumn key={status} status={status} />
      ));
    }

    if (error) {
      return (
        <div className="flex h-[280px] w-full items-center justify-center rounded-xl border border-dashed border-red-500/40 bg-red-500/5 text-sm text-red-200">
          Unable to load board. Please try again shortly.
        </div>
      );
    }

    if (!data || !visibleColumns.length) {
      return (
        <div className="flex h-[280px] w-full items-center justify-center rounded-xl border border-dashed border-slate-600/40 bg-slate-950 text-sm text-slate-300">
          No jobs match your filters.
        </div>
      );
    }

    return visibleColumns.map((column) => (
      <BoardColumn
        key={column.status}
        column={column}
        collapsed={boardCollapsed[column.status] ?? false}
        onToggleCollapsed={(collapsed) =>
          setColumnCollapsed(column.status, collapsed)
        }
        wipLimit={boardWipLimits[column.status] ?? null}
        onHide={() => toggleStageVisibility(column.status)}
        onSetWipLimit={(limit) => setWipLimit(column.status, limit)}
        onAddJob={() => onAddJob?.(column.status)}
        onSelectJob={onSelectJob}
        selectedJobId={selectedJobId}
      />
    ));
  };

  return (
    <div className="space-y-3">
      {hiddenStageConfigs.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {hiddenStageConfigs.map((status) => {
            const config = BOARD_STAGE_CONFIG[status];
            return (
              <Badge
                key={status}
                variant="outline"
                className="cursor-pointer border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-50 shadow-sm"
                onClick={() => toggleStageVisibility(status)}
              >
                Show {config.label}
              </Badge>
            );
          })}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 min-h-[420px]">
            {renderColumns()}
          </div>
          <DragOverlay>
            {activeJob && (
              <DragPreview jobId={activeJob.id} status={activeJob.status} />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

function DragPreview({ jobId, status }: { jobId: string; status: JobStatus }) {
  // During overlay we cannot easily fetch job record; show placeholder.
  const config = BOARD_STAGE_CONFIG[status];
  return (
    <div className="w-[300px] rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-lg">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <config.icon className="size-4" />
        {config.label}
      </div>
      <div className="text-sm font-medium">Moving card…</div>
      <div className="text-xs text-slate-500">{jobId}</div>
    </div>
  );
}

function SkeletonColumn({ status }: { status: JobStatus }) {
  const config = BOARD_STAGE_CONFIG[status];
  return (
    <div className="w-[320px] shrink-0">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <config.icon className="size-4 text-slate-400" />
          {config.label}
          <span className="rounded-full bg-slate-100 px-2 py-[2px] text-xs text-slate-600">
            –
          </span>
        </div>
      </div>
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="h-[96px] animate-pulse rounded-lg bg-slate-200/60" />
        <div className="h-[96px] animate-pulse rounded-lg bg-slate-200/60" />
      </div>
    </div>
  );
}

interface BoardColumnProps {
  column: { status: JobStatus; jobs: JobRecord[] };
  collapsed: boolean;
  onToggleCollapsed: (collapsed: boolean) => void;
  onHide: () => void;
  wipLimit: number | null;
  onSetWipLimit: (limit: number | null) => void;
  onAddJob?: () => void;
  onSelectJob?: (jobId: string) => void;
  selectedJobId?: string | null;
}

function BoardColumn({
  column,
  collapsed,
  onToggleCollapsed,
  onHide,
  wipLimit,
  onSetWipLimit,
  onAddJob,
  onSelectJob,
  selectedJobId,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.status,
    data: { type: "column", column: column.status },
  });
  const count = column.jobs.length;
  const config = BOARD_STAGE_CONFIG[column.status] ?? BOARD_STAGE_CONFIG.SAVED;
  const overLimit = wipLimit !== null && count > wipLimit;
  const density = useJobUIPrefs((state) => state.density);
  const listParentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => (density === "compact" ? 104 : 128),
    overscan: 6,
  });
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-w-[260px] flex-1 flex-col rounded-lg border bg-muted/70 px-2 pb-6 pt-4",
        isOver && !collapsed ? "border-primary/60 bg-primary/5" : "",
      )}
    >
      <ColumnHeader
        column={column}
        config={config}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
        onHide={onHide}
        wipLimit={wipLimit}
        onSetWipLimit={onSetWipLimit}
        onAddJob={onAddJob}
        overLimit={overLimit}
      />
      <div
        ref={listParentRef}
        role="list"
        className={cn(
          "flex flex-1 flex-col gap-3 overflow-y-auto pb-2",
          collapsed ? "overflow-hidden" : "",
        )}
      >
        {collapsed ? (
          <div className="text-xs text-slate-500">
            Column collapsed. Click header to expand.
          </div>
        ) : column.jobs.length ? (
          <>
            <SortableContext
              items={column.jobs.map((job) => job.id)}
              strategy={verticalListSortingStrategy}
            >
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {virtualItems.map((virtualRow) => {
                  const job = column.jobs[virtualRow.index];
                  if (!job) return null;
                  return (
                    <div
                      key={job.id}
                      ref={virtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                        height: virtualRow.size,
                      }}
                    >
                      <SortableJobCard
                        job={job}
                        index={virtualRow.index}
                        column={column.status}
                        onSelect={onSelectJob}
                        selected={selectedJobId === job.id}
                      />
                    </div>
                  );
                })}
              </div>
            </SortableContext>
            <div
              className={cn(
                "mt-auto flex h-14 items-center justify-center rounded-2xl border border-dashed border-border/70 text-sm text-muted-foreground transition",
                isOver || column.jobs.length === 0
                  ? "opacity-100"
                  : "pointer-events-none opacity-0",
                isOver ? "border-primary/50 text-primary" : "",
              )}
            >
              Drop here
            </div>
          </>
        ) : (
          <EmptyColumnPlaceholder onAdd={onAddJob} />
        )}
      </div>
    </div>
  );
}

function ColumnHeader({
  column,
  config,
  collapsed,
  onToggleCollapsed,
  onHide,
  onAddJob,
  wipLimit,
  onSetWipLimit,
  overLimit,
}: {
  column: { status: JobStatus; jobs: JobRecord[] };
  config: BoardStageConfig;
  collapsed: boolean;
  onToggleCollapsed: (collapsed: boolean) => void;
  onHide: () => void;
  onAddJob?: () => void;
  wipLimit: number | null;
  onSetWipLimit: (limit: number | null) => void;
  overLimit: boolean;
}) {
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [limitValue, setLimitValue] = useState<string>(
    wipLimit ? String(wipLimit) : "",
  );

  useEffect(() => {
    setLimitValue(wipLimit ? String(wipLimit) : "");
  }, [wipLimit]);

  const submitLimit = () => {
    if (!limitValue) {
      onSetWipLimit(null);
      setLimitDialogOpen(false);
      return;
    }
    const val = Number(limitValue);
    if (!Number.isFinite(val) || val <= 0) return;
    onSetWipLimit(val);
    setLimitDialogOpen(false);
  };

  return (
    <div className=" px-2 mb-4 flex items-center justify-between gap-2">
      <div>
        <button
          type="button"
          className="flex items-center gap-2 text-left text-sm font-semibold text-foreground"
          onClick={() => onToggleCollapsed(!collapsed)}
        >
          <config.icon className="size-5 text-muted-foreground" />
          <span>{config.label}</span>
          <span
            className={cn(
              "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
              overLimit ? "bg-amber-100 text-amber-700" : "",
            )}
          >
            {column.jobs.length}
            {wipLimit ? ` / ${wipLimit}` : ""}
          </span>
        </button>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground transition hover:border-primary/30 hover:bg-background hover:text-foreground"
          onClick={() => onAddJob?.()}
        >
          <Plus className="size-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground transition hover:border-primary/30 hover:bg-background hover:text-foreground"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 text-sm">
            <DropdownMenuItem onSelect={() => onToggleCollapsed(!collapsed)}>
              {collapsed ? "Expand column" : "Collapse column"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLimitDialogOpen(true)}>
              Set WIP limit…
            </DropdownMenuItem>
            {wipLimit ? (
              <DropdownMenuItem onSelect={() => onSetWipLimit(null)}>
                Clear WIP limit
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onHide}>Hide column</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set WIP limit</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Limit how many cards can be in “{config.label}” at once. Leave empty
            to clear.
          </p>
          <Input
            autoFocus
            type="number"
            min={1}
            placeholder="e.g. 5"
            value={limitValue}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setLimitValue(event.target.value)
            }
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLimitDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitLimit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableJobCard({
  job,
  index,
  column,
  onSelect,
  selected,
}: {
  job: JobRecord;
  index: number;
  column: JobStatus;
  onSelect?: (jobId: string) => void;
  selected?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: job.id,
    data: { type: "card", column, index },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : undefined,
    height: "100%",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BoardJobCard job={job} onSelect={onSelect} selected={selected} />
    </div>
  );
}

function formatDateLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const day = date.getDate();
  const suffix = (d: number) => {
    if (d % 10 === 1 && d % 100 !== 11) return "st";
    if (d % 10 === 2 && d % 100 !== 12) return "nd";
    if (d % 10 === 3 && d % 100 !== 13) return "rd";
    return "th";
  };
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day}${suffix(day)} ${month} ${year}`;
}

function formatRelativeLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return formatDateLabel(value);
}

function BoardJobCard({
  job,
  onSelect,
  selected,
}: {
  job: JobRecord;
  onSelect?: (jobId: string) => void;
  selected?: boolean;
}) {
  const latestActivity =
    job.updatedAt ?? job.appliedAt ?? job.savedAt ?? job.createdAt;

  const firstLetter = (job.companyName?.[0] || "?").toUpperCase();
  const rel = job.appliedAt ? formatRelativeLabel(job.appliedAt) : null;
  const appliedText = rel
    ? rel === "Today" || rel === "Yesterday"
      ? `Applied ${rel.toLowerCase()}`
      : `Applied ${formatDateLabel(job.appliedAt!)}`
    : null;
  const formateSalary = (salary: number | null | undefined) => {
    if (!salary) return "";
    if (salary >= 1000000) {
      return `$${(salary / 1000000).toFixed(1)}M`;
    } else if (salary >= 1000) {
      return `$${(salary / 1000).toFixed(0)}K`;
    }
    return `$${salary}`;
  };

  return (
    <div
      role="article"
      onClick={() => onSelect?.(job.id)}
      className="group/item cursor-grab text-xs rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="flex size-8 items-center justify-center rounded-xl font-semibold text-white"
          style={{
            background:
              "linear-gradient(135deg, rgba(37,99,235,1) 0%, rgba(147,51,234,1) 100%)",
          }}
        >
          {firstLetter}
        </div>
        <p className="text-xs font-medium">{job.companyName}</p>
      </div>
      <p className=" mt-2 text-sm font-medium text-foreground">{job.title}</p>
      {job.salaryMax && (
        <p className=" mt-1 text-xs font-medium text-muted-foreground">
          {formateSalary(job.salaryMax)} - {formateSalary(job.salaryMin)}
        </p>
      )}
      <div className="flex items-center gap-2 mt-3">
        <Badge variant="outline" className="text-[0.6rem] bg-muted">
          {"FULL TIME"}
        </Badge>
        <Badge variant="outline" className=" text-[0.6rem] bg-muted">
          {job.remote ? "REMOTE" : "ONSITE"}
        </Badge>
      </div>
      {appliedText && (
        <div className="flex items-center gap-1 mt-3 text-muted-foreground">
          <span className="flex-1 text-xs">{appliedText}</span>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        {latestActivity && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3" />
            <span className="text-xs truncate">
              {formatRelativeLabel(latestActivity)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {job.location && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="size-3" />
              <span className="text-xs truncate">{job.location}</span>
            </div>
          )}
        </div>
      </div>
      {job.jobUrl && (
        <a
          href={job.jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground absolute top-3 right-3"
        >
          <Link2 className="size-4" />
        </a>
      )}
    </div>
  );
}

function EmptyColumnPlaceholder({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-card text-xs text-slate-500">
      <p>No jobs here yet.</p>
      {onAdd ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-2 text-xs"
          onClick={onAdd}
        >
          Add first job
        </Button>
      ) : null}
    </div>
  );
}
