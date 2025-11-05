import { useMemo } from "react";
import { ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimelineEvent } from "./timeline-tab";
import type { JobStage } from "@/lib/storage/jobStore";

export interface JobListItem {
  id: string;
  title: string;
  company: string;
  stage: string;
  savedAt: number;
  url: string;
}

export interface MyJobsTabProps {
  jobs: JobListItem[];
  loading: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onSelectJob: (id: string) => void;
  onStageChange: (id: string, stage: JobStage) => void;
  onOpenJob: (url: string) => void;
  selectedJob: JobListItem | null;
  selectedJobTimeline: TimelineEvent[];
  onCloseDetail: () => void;
}

const stageLabels: Record<string, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Closed",
};

export function MyJobsTab({
  jobs,
  loading,
  query,
  onQueryChange,
  onSelectJob,
  onStageChange,
  onOpenJob,
  selectedJob,
  selectedJobTimeline,
  onCloseDetail,
}: MyJobsTabProps) {
  const filtered = useMemo(() => {
    if (!query) return jobs;
    const q = query.toLowerCase();
    return jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.stage.toLowerCase().includes(q),
    );
  }, [jobs, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Filter by title, company, or stage"
          className="border-none px-0 focus-visible:ring-0"
        />
      </div>

      <ScrollArea className="mt-3 h-[calc(100vh-220px)]">
        <div className="space-y-3 pr-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-9 w-24" />
                </CardContent>
              </Card>
            ))
          ) : filtered.length ? (
            filtered.map((job) => (
              <Card
                key={job.id}
                className={[
                  "cursor-pointer transition hover:border-primary/40",
                  selectedJob?.id === job.id
                    ? "border-primary/60 bg-primary/5"
                    : "",
                ].join(" ")}
                onClick={() => onSelectJob(job.id)}
              >
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base font-semibold text-foreground">
                    {job.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <Badge variant="outline">
                    {stageLabels[job.stage] ?? job.stage}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <StagePill
                      value={job.stage}
                      onChange={(next: JobStage) => onStageChange(job.id, next)}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenJob(job.url);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState />
          )}
        </div>
      </ScrollArea>

      {selectedJob ? (
        <Card className="mt-3">
          <CardHeader className="flex items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                {selectedJob.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedJob.company}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onCloseDetail}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Stage</span>
                <Badge variant="outline">
                  {stageLabels[selectedJob.stage] ?? selectedJob.stage}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenJob(selectedJob.url)}
              >
                Open job page
              </Button>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Activity
              </p>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {selectedJobTimeline.length ? (
                  selectedJobTimeline.slice(0, 5).map((event) => (
                    <li
                      key={event.id}
                      className="flex items-center justify-between"
                    >
                      <span>{headlineFor(event)}</span>
                      <span className="text-xs">
                        {formatTimeAgo(event.timestamp)}
                      </span>
                    </li>
                  ))
                ) : (
                  <li>No recent actions logged.</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Notes
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Keep interview notes and follow-ups here soon. (Coming soon)
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/40 px-6 py-12 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">No saved jobs yet</p>
      <p className="mt-2 max-w-[260px]">
        Run an analysis from the Job tab to save a role and track progress here.
      </p>
    </div>
  );
}

function StagePill({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: JobStage) => void;
}) {
  const options: JobStage[] = [
    "saved",
    "applied",
    "interviewing",
    "offer",
    "rejected",
  ];
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-background px-1 py-1">
      {options.map((option: JobStage) => (
        <button
          key={option}
          type="button"
          className={[
            "rounded-full px-2 py-1 text-xs font-medium capitalize transition",
            option === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          ].join(" ")}
          onClick={(event) => {
            event.stopPropagation();
            onChange(option);
          }}
        >
          {stageLabels[option] ?? option}
        </button>
      ))}
    </div>
  );
}

function headlineFor(event: TimelineEvent) {
  switch (event.type) {
    case "analyzed":
      return `Analyzed ${event.title}`;
    case "saved":
      return `Saved ${event.title}`;
    case "autofilled":
      return `Autofilled ${event.title}`;
    default:
      return event.title;
  }
}

function formatTimeAgo(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
