import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listJobRecords,
  loadJobRecord,
  saveJobRecord,
  updateJobStage,
  type JobAnalysisRecord,
  type JobStage,
} from "@/lib/storage/jobStore";
import { logTimelineEvent } from "@/lib/storage/timelineStore";

export function useJobRecord(url: string | null) {
  return useQuery({
    queryKey: ["job-record", url],
    queryFn: async () => {
      if (!url) return null;
      return loadJobRecord(url);
    },
    enabled: !!url,
  });
}

export function useSavedJobs() {
  return useQuery({
    queryKey: ["job-records"],
    queryFn: listJobRecords,
  });
}

export function useSaveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<JobAnalysisRecord> & { url: string }) => {
      const record = await saveJobRecord({
        ...input,
        stage: input.stage ?? "saved",
        savedAt: input.savedAt ?? Date.now(),
      });
      await logTimelineEvent({
        type: "saved",
        title: record.title ?? record.url,
        url: record.url,
      });
      return record;
    },
    onSuccess: (record) => {
      qc.invalidateQueries({ queryKey: ["job-record", record.url] });
      qc.invalidateQueries({ queryKey: ["job-records"] });
      qc.invalidateQueries({ queryKey: ["timeline-events"] });
    },
  });
}

export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ url, stage }: { url: string; stage: JobStage }) => {
      const record = await updateJobStage(url, stage);
      return record;
    },
    onSuccess: (record) => {
      if (!record) return;
      qc.invalidateQueries({ queryKey: ["job-record", record.url] });
      qc.invalidateQueries({ queryKey: ["job-records"] });
      qc.invalidateQueries({ queryKey: ["timeline-events"] });
    },
  });
}
