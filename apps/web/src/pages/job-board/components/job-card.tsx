import type { DragEvent, MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarClock,
  Clock,
  FileText,
  MapPin,
  MoreHorizontal,
  Paperclip,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate, formatRelativeLabel, formatTime } from "../utils/date";
import { formatSalaryRange } from "../utils/format";
import type { JobOpportunity, JobStage } from "../types";

const stopPropagation = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

const getInitials = (company: string) =>
  company
    .split(" ")
    .slice(0, 2)
    .map((part) => part.at(0))
    .filter(Boolean)
    .join("")
    .toUpperCase();

interface JobCardProps {
  job: JobOpportunity;
  onMove?: (status: JobStage) => void;
  onDragStart?: (event: DragEvent<HTMLDivElement>, job: JobOpportunity) => void;
  draggable?: boolean;
}

export function JobCard({ job, onDragStart, draggable = true }: JobCardProps) {
  const salary = formatSalaryRange(job.compensation);
  const appliedLabel =
    job.activities.find((activity) => activity.type === "applied") ??
    job.activities.at(0);

  return (
    <div
      draggable={draggable}
      role="article"
      aria-label={`${job.title} at ${job.company}`}
      onDragStart={(event) => {
        if (!draggable) return;
        event.currentTarget.setAttribute("aria-grabbed", "true");
        onDragStart?.(event, job);
      }}
      onDragEnd={(event) => {
        if (!draggable) return;
        event.currentTarget.setAttribute("aria-grabbed", "false");
      }}
      className="group/item cursor-grab rounded-2xl border border-border/60 bg-background px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="flex size-11 items-center justify-center rounded-xl font-semibold text-white"
          style={{
            background:
              job.color ||
              "linear-gradient(135deg, rgba(37,99,235,1) 0%, rgba(147,51,234,1) 100%)",
          }}
        >
          {getInitials(job.company)}
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {job.company}
              </p>
              <h3 className="text-base font-semibold text-foreground">
                {job.title}
              </h3>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open job actions"
                  onClick={stopPropagation}
                  onPointerDown={(event) => event.stopPropagation()}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon-sm" }),
                    "text-muted-foreground transition hover:text-foreground"
                  )}
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 space-y-1 p-1">
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  Add note
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  Remove from board
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {salary && (
            <span className="text-sm font-medium text-muted-foreground">
              {salary}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className="border-transparent bg-sky-50 text-sky-600"
        >
          {job.workStyle}
        </Badge>
        <Badge
          variant="outline"
          className="border-transparent bg-violet-50 text-violet-600"
        >
          {job.employmentType}
        </Badge>
        {job.tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="border-transparent bg-muted/80 text-muted-foreground"
          >
            {tag}
          </Badge>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="size-3.5" />
          {job.location}
        </span>
        {appliedLabel && (
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {appliedLabel.label} - {formatRelativeLabel(appliedLabel.value)}
          </span>
        )}
        {job.followUpAt && (
          <span className="flex items-center gap-1">
            <CalendarClock className="size-3.5" />
            {formatDate(job.followUpAt)} at {formatTime(job.followUpAt)}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 text-muted-foreground">
        <button
          type="button"
          onClick={stopPropagation}
          aria-label="View attachments"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "rounded-full border border-transparent bg-muted/60 text-muted-foreground/80 transition hover:border-border hover:bg-background hover:text-foreground"
          )}
        >
          <Paperclip className="size-4" />
        </button>
        <button
          type="button"
          onClick={stopPropagation}
          aria-label="View notes"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "rounded-full border border-transparent bg-muted/60 text-muted-foreground/80 transition hover:border-border hover:bg-background hover:text-foreground"
          )}
        >
          <FileText className="size-4" />
        </button>
      </div>
    </div>
  );
}
