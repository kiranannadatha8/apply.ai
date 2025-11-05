import { useMemo } from "react";
import { CalendarClock, CheckCircle2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { JSX } from "react/jsx-runtime";

export interface TimelineEvent {
  id: string;
  type: "analyzed" | "saved" | "autofilled";
  title: string;
  url: string;
  timestamp: number;
}

export interface TimelineTabProps {
  events: TimelineEvent[];
  loading: boolean;
  filter: "7d" | "30d";
  onFilterChange: (value: "7d" | "30d") => void;
}

const iconMap: Record<TimelineEvent["type"], JSX.Element> = {
  analyzed: <Sparkles className="h-3.5 w-3.5 text-sky-500" />,
  saved: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  autofilled: <CalendarClock className="h-3.5 w-3.5 text-indigo-500" />,
};

export function TimelineTab({
  events,
  loading,
  filter,
  onFilterChange,
}: TimelineTabProps) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => b.timestamp - a.timestamp),
    [events],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
        <span className="text-muted-foreground">Filter</span>
        <div className="flex items-center gap-1">
          <FilterPill
            label="Last 7 days"
            active={filter === "7d"}
            onClick={() => onFilterChange("7d")}
          />
          <FilterPill
            label="Last 30 days"
            active={filter === "30d"}
            onClick={() => onFilterChange("30d")}
          />
        </div>
      </div>

      <ScrollArea className="mt-3 h-[calc(100vh-220px)]">
        <div className="space-y-4 pr-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} className="border-l-4 border-l-muted">
                <CardHeader>
                  <CardTitle>
                    <Skeleton className="h-4 w-52" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-3 w-28" />
                </CardContent>
              </Card>
            ))
          ) : sorted.length ? (
            sorted.map((event) => (
              <div key={event.id} className="relative flex gap-3">
                <div className="flex flex-col items-center pt-2">
                  <div className="rounded-full border border-border bg-background p-2">
                    {iconMap[event.type]}
                  </div>
                  <span className="mt-1 h-full w-px flex-1 bg-border" />
                </div>
                <Card className="flex-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      {headlineFor(event)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{event.title}</span>
                    <span>{formatTimeAgo(event.timestamp)}</span>
                  </CardContent>
                </Card>
              </div>
            ))
          ) : (
            <EmptyTimeline />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-2.5 py-1 text-xs font-medium transition",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function EmptyTimeline() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/40 px-6 py-12 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">Your timeline is empty</p>
      <p className="mt-2 max-w-[260px]">
        Run analyses, save jobs, or complete autofills to see your progress
        here.
      </p>
    </div>
  );
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
