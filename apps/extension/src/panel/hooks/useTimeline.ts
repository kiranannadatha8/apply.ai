import { useQuery } from "@tanstack/react-query";
import { listTimelineEvents, type TimelineEventRecord } from "@/lib/storage/timelineStore";

export function useTimeline(limit = 100) {
  const query = useQuery({
    queryKey: ["timeline-events", limit],
    queryFn: () => listTimelineEvents(limit),
  });
  return {
    events: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export type { TimelineEventRecord };
