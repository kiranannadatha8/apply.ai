import { useState } from "react";
import type { DragEvent } from "react";
import { Plus, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { JOB_STAGE_CONFIG } from "../config";
import type { JobOpportunity, JobStage } from "../types";
import { JobCard } from "./job-card";

interface BoardColumnProps {
  stage: JobStage;
  jobs: JobOpportunity[];
  onMove: (jobId: string, stage: JobStage, position: number) => void;
  onReorder: (stage: JobStage, fromIndex: number, toIndex: number) => void;
}

export function BoardColumn({
  stage,
  jobs,
  onMove,
  onReorder,
}: BoardColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const stageConfig = JOB_STAGE_CONFIG[stage];

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    targetIndex: number
  ) => {
    event.preventDefault();
    setIsDragOver(false);
    const jobId = event.dataTransfer.getData("text/plain");
    const sourceStage = event.dataTransfer.getData(
      "application/job-stage"
    ) as JobStage;
    const sourceIndex = Number(
      event.dataTransfer.getData("application/job-index")
    );

    if (!jobId) {
      return;
    }

    if (Number.isNaN(targetIndex) || targetIndex < 0) {
      onMove(jobId, stage, jobs.length);
      return;
    }

    if (sourceStage === stage && !Number.isNaN(sourceIndex)) {
      const safeTarget = targetIndex;
      onReorder(stage, sourceIndex, safeTarget);
      return;
    }

    onMove(jobId, stage, targetIndex);
  };

  return (
    <section
      className={cn(
        "flex h-full min-w-[260px] flex-1 flex-col rounded-lg border bg-muted/60 px-4 pb-6 pt-4",
        isDragOver && "border-primary/60 bg-primary/5"
      )}
      aria-label={stageConfig.label}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(event) => handleDrop(event, jobs.length)}
    >
      <header className="mb-4 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {stageConfig.icon && (
              <stageConfig.icon className="size-5 text-muted-foreground" />
            )}
            <span>{stageConfig.label}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {jobs.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full border text-muted-foreground transition hover:border-primary/30 hover:bg-background hover:text-foreground"
          >
            <Plus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full border text-muted-foreground transition hover:border-primary/30 hover:bg-background hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
      </header>

      <div
        className="flex flex-1 flex-col gap-3 overflow-y-auto pb-2"
        role="list"
      >
        {jobs.map((job, index) => (
          <div key={job.id} role="listitem">
            <div
              className="h-2"
              onDragOver={(event) => handleDragOver(event)}
              onDrop={(event) => handleDrop(event, index)}
            />
            <JobCard
              job={job}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", job.id);
                event.dataTransfer.setData("application/job-stage", stage);
                event.dataTransfer.setData(
                  "application/job-index",
                  index.toString()
                );
              }}
            />
          </div>
        ))}

        <div
          className={cn(
            "mt-auto flex h-14 items-center justify-center rounded-2xl border border-dashed border-border/70 text-sm text-muted-foreground transition",
            isDragOver || jobs.length === 0
              ? "opacity-100"
              : "pointer-events-none opacity-0",
            isDragOver && "border-primary/50 text-primary"
          )}
        >
          Drop here
        </div>
      </div>
    </section>
  );
}
