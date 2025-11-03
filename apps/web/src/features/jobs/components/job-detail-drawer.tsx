import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useJobDetailQuery, useJobEventsQuery, useUpdateJobMutation } from "../hooks";
import type { JobStatus } from "../types";
import { BOARD_STAGE_CONFIG } from "../board/stage-config";

interface JobDetailDrawerProps {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
}

export function JobDetailDrawer({ jobId, open, onOpenChange, workspaceId }: JobDetailDrawerProps) {
  const detailQuery = useJobDetailQuery(jobId, workspaceId, { enabled: open && !!jobId });
  const eventsQuery = useJobEventsQuery(jobId, workspaceId, { enabled: open && !!jobId });
  const updateMutation = useUpdateJobMutation();
  const detail = detailQuery.data;
  const resumeVariantLabel = useMemo(() => {
    if (!detail?.metadata || typeof detail.metadata !== "object") return null;
    const meta = detail.metadata as Record<string, unknown>;
    return (meta.resumeVariantLabel as string | undefined) ?? (meta.resumeVariantId as string | undefined) ?? null;
  }, [detail?.metadata]);

  const [notesDraft, setNotesDraft] = useState(detail?.notes ?? "");

  useEffect(() => {
    setNotesDraft(detail?.notes ?? "");
  }, [detail?.notes]);

  useEffect(() => {
    if (!detail || notesDraft === detail.notes) return;
    const handle = window.setTimeout(() => {
      if (!jobId) return;
      updateMutation.mutate({ id: jobId, patch: { notes: notesDraft } });
    }, 500);
    return () => window.clearTimeout(handle);
  }, [notesDraft, detail, jobId, updateMutation]);

  const timeline = useMemo(() => {
    const items = eventsQuery.data ?? [];
    return [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [eventsQuery.data]);

  const statusConfig =
    detail?.status && BOARD_STAGE_CONFIG[detail.status]
      ? BOARD_STAGE_CONFIG[detail.status]
      : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] border-l border-slate-800 bg-slate-950/95 p-0 text-slate-200">
        <SheetHeader className="border-b border-slate-800 px-5 py-4 text-left">
          <SheetTitle className="text-sm font-semibold text-slate-100">
            {detail?.title ?? "Job details"}
          </SheetTitle>
          {detail ? (
            <div className="text-xs text-slate-400">
              {detail.companyName}
              {detail.location ? ` · ${detail.location}` : ""}
            </div>
          ) : null}
        </SheetHeader>
      <div className="h-full overflow-y-auto">
        <div className="space-y-6 p-5 text-sm leading-relaxed">
          {detailQuery.isLoading ? (
            <DetailSkeleton />
          ) : detail ? (
              <>
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Overview
                  </h3>
                  <div className="grid gap-2 text-sm text-slate-200">
                    <Field label="Stage">
                      {statusConfig ? (
                        <Badge
                          variant="outline"
                          className="border-slate-700 bg-slate-900/70 text-xs"
                        >
                          {statusConfig.label}
                        </Badge>
                      ) : (
                        statusLabel(detail.status)
                      )}
                    </Field>
                    <Field label="Source">{detail.sourceKind ?? "—"}</Field>
                    <Field label="Applied on">{formatDate(detail.appliedAt)}</Field>
                    <Field label="Updated">{formatDate(detail.updatedAt)}</Field>
                    <Field label="Tags">
                      {detail.tags.length ? detail.tags.join(", ") : "—"}
                    </Field>
                    <Field label="Resume variant">
                      {resumeVariantLabel ?? "Not recorded"}
                    </Field>
                  </div>
                </section>

                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Notes
                    </h3>
                    {updateMutation.isPending ? (
                      <span className="text-[11px] text-slate-400">Saving…</span>
                    ) : (
                      <span className="text-[11px] text-slate-600">Autosaved</span>
                    )}
                  </div>
                  <Textarea
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    placeholder="Add reminders, interview prep, or shortcuts…"
                    className="min-h-[120px] resize-vertical border-slate-800 bg-slate-950 text-sm text-slate-200"
                  />
                </section>

                {detail.jdText ? (
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      JD Snapshot
                    </h3>
                    <p className="whitespace-pre-wrap text-slate-300">
                      {detail.jdText.slice(0, 3000)}
                      {detail.jdText.length > 3000 ? "…" : ""}
                    </p>
                  </section>
                ) : null}

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Timeline
                  </h3>
                  {eventsQuery.isLoading ? (
                    <div className="text-xs text-slate-400">Loading timeline…</div>
                  ) : timeline.length ? (
                    <div className="space-y-3 text-sm">
                      {timeline.map((event) => (
                        <div key={event.id} className="space-y-1 border-l border-slate-800 pl-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">
                            {friendlyKind(event.kind)}
                          </div>
                          <div className="text-sm text-slate-100">
                            {event.message ?? "Event logged"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {formatDate(event.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">No events yet.</div>
                  )}
                </section>
              </>
            ) : (
              <div className="text-xs text-slate-400">Select a job to view details.</div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="text-sm text-slate-200">{children}</span>
    </div>
  );
}

function statusLabel(status: JobStatus | undefined) {
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

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString();
}

function friendlyKind(kind: string) {
  switch (kind) {
    case "CREATED":
      return "Created";
    case "UPDATED":
      return "Updated";
    case "AUTOFILL":
      return "Autofill";
    case "APPLIED":
      return "Applied";
    case "STATUS_CHANGE":
      return "Status change";
    case "NOTE":
      return "Note";
    default:
      return kind;
  }
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-5 w-48 animate-pulse rounded bg-slate-800/60" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-16 animate-pulse rounded bg-slate-800/40" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-800/60" />
        <div className="h-28 animate-pulse rounded bg-slate-800/40" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-36 animate-pulse rounded bg-slate-800/60" />
        <div className="h-24 animate-pulse rounded bg-slate-800/40" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-800/60" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-10 animate-pulse rounded bg-slate-800/40" />
          ))}
        </div>
      </div>
    </div>
  );
}
