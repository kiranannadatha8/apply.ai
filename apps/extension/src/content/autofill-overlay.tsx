import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { DetectionResult } from "../lib/detect/types";
import {
  applyAutofill,
  prepareAutofill,
  type ApplyResult,
  type PreparedAutofill,
} from "../lib/autofill/engine";
import {
  loadNormalizedProfile,
  type NormalizedProfile,
  type ResumeVariant,
} from "../lib/autofill/profile";
import {
  loadResumeLibrary,
  upsertResumeVariant,
  type StoredResumeVariant,
} from "../lib/autofill/resume-library";
import { loadJobRecord, saveJobRecord } from "../lib/storage/jobStore";
import type { JobAnalysisRecord } from "../lib/storage/jobStore";
import { nanoid } from "../lib/autofill/utils";

type AutofillPayload = {
  detection: DetectionResult;
};

type Phase = "preview" | "running" | "success" | "error";

type ResumeOption = ResumeVariant & { dataBase64?: string };

let host: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

export function closeAutofillOverlay() {
  if (root && host) {
    root.unmount();
    host.remove();
  }
  root = null;
  host = null;
}

export function openAutofillOverlay(payload: AutofillPayload) {
  if (!host) {
    host = document.createElement("div");
    host.id = "applyai-autofill-root";
    document.documentElement.appendChild(host);
    root = createRoot(host);
  }
  root!.render(<Overlay detection={payload.detection} />);
}

function Overlay({ detection }: { detection: DetectionResult }) {
  const [profile, setProfile] = useState<NormalizedProfile | null>(null);
  const [jobRecord, setJobRecord] = useState<JobAnalysisRecord | null>(null);
  const [prepared, setPrepared] = useState<PreparedAutofill | null>(null);
  const [loading, setLoading] = useState(true);
  const [fieldSelections, setFieldSelections] = useState<Record<string, boolean>>({});
  const [fileSelections, setFileSelections] = useState<Record<string, boolean>>({});
  const [resumeOptions, setResumeOptions] = useState<ResumeOption[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [phase, setPhase] = useState<Phase>("preview");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const filePickerRef = useRef<HTMLInputElement | null>(null);
  const [applyState, setApplyState] = useState<"idle" | "pending" | "done">("idle");
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [profileData, job, stored] = await Promise.all([
          loadNormalizedProfile(),
          loadJobRecord(detection.url),
          loadResumeLibrary(),
        ]);
        if (cancelled) return;
        setProfile(profileData);
        setJobRecord(job);
        const coverNote = job?.coverNote ?? "";
        setCoverLetter(coverNote);
        const preparedData = prepareAutofill(profileData, detection, {
          coverLetterText: coverNote,
        });
        if (cancelled) return;
        setPrepared(preparedData);
        setFieldSelections(
          Object.fromEntries(
            preparedData.fields.map((f) => [
              f.id,
              f.status === "ready" && !!f.value,
            ]),
          ),
        );
        setFileSelections(
          Object.fromEntries(
            preparedData.files.map((f) => [
              f.id,
              f.kind !== "other" && f.status === "ready",
            ]),
          ),
        );
        const resumeFromProfile: ResumeOption[] =
          profileData?.resumeVariants ?? [];
        const merged: Record<string, ResumeOption> = {};
        for (const option of resumeFromProfile) {
          merged[option.id] = option;
        }
        for (const storedVariant of stored) {
          merged[storedVariant.id] = storedVariant;
        }
        const list = Object.values(merged);
        setResumeOptions(list);
        const initialResumeId =
          job?.resumeVariantId ??
          profileData?.defaultResumeId ??
          list[0]?.id ??
          null;
        setSelectedResumeId(initialResumeId);
        setPhase("preview");
        setProgress(0);
        setError(null);
        setResult(null);
        setApplyState("idle");
        setApplyFeedback(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detection.url]);

  const readyCount = useMemo(
    () =>
      prepared
        ? prepared.fields.filter((f) => f.status === "ready").length
        : 0,
    [prepared],
  );
  const missingRequired = useMemo(
    () =>
      prepared
        ? prepared.fields.filter(
            (f) => f.required && (!f.value || f.status !== "ready"),
          )
        : [],
    [prepared],
  );

  const resumeVariant = useMemo(() => {
    if (!selectedResumeId) return undefined;
    return resumeOptions.find((opt) => opt.id === selectedResumeId);
  }, [resumeOptions, selectedResumeId]);

  const canAttachResume =
    prepared?.files.some((f) => f.kind === "resume") ?? false;

  const resumeBlocking = useMemo(() => {
    if (!canAttachResume || !prepared) return false;
    return prepared.files.some(
      (f) =>
        f.kind === "resume" &&
        fileSelections[f.id] &&
        !resumeVariant?.dataBase64,
    );
  }, [canAttachResume, prepared, fileSelections, resumeVariant]);

  const handleFieldToggle = (id: string, next: boolean) => {
    setFieldSelections((prev) => ({ ...prev, [id]: next }));
  };

  const handleFileToggle = (id: string, next: boolean) => {
    setFileSelections((prev) => ({ ...prev, [id]: next }));
  };

  const handleResumeUpload = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      setResumeError("File too large (8MB max).");
      return;
    }
    setResumeError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const resultStr = reader.result as string;
      const [, payload] = resultStr.split(",");
      const variant: StoredResumeVariant = {
        id: nanoid(),
        label: file.name.replace(/\.[^.]+$/, ""),
        filename: file.name,
        mime: file.type || "application/pdf",
        sizeBytes: file.size,
        dataBase64: payload ?? resultStr,
      };
      setResumeOptions((prev) => [...prev, variant]);
      setSelectedResumeId(variant.id);
      await upsertResumeVariant(variant);
    };
    reader.readAsDataURL(file);
  };

  const onConfirm = async () => {
    if (!prepared) return;
    setPhase("running");
    setError(null);
    setResult(null);
    setProgress(5);
    const timer = window.setInterval(() => {
      setProgress((p) => Math.min(90, p + 10));
    }, 180);
    try {
      const applyResult = await applyAutofill(prepared, {
        includeFields: fieldSelections,
        resumeVariant,
        coverLetterText: coverLetter,
        attachCoverLetterFile: true,
        includeFileIds: fileSelections,
      });
      window.clearInterval(timer);
      setProgress(100);
      setPhase("success");
      setResult(applyResult);
      chrome.runtime
        .sendMessage({
          type: "applyai.autofill.completed",
          payload: {
            detection: {
              url: prepared.detection.url,
              board: prepared.board,
              version: prepared.detection.version,
              confidence: prepared.detection.confidence,
            },
            result: applyResult,
            resumeVariantId: resumeVariant?.id ?? null,
            coverLetterProvided: !!coverLetter,
            fieldSelections,
            fileSelections,
            timestamp: Date.now(),
          },
        })
        .catch(() => {});
    } catch (err) {
      window.clearInterval(timer);
      setPhase("error");
      setProgress(0);
      setError(err instanceof Error ? err.message : "Autofill failed");
    }
  };

  const onAssist = () => {
    chrome.runtime
      .sendMessage({
        type: "applyai.assistToMap",
        payload: { url: detection.url, board: detection.board },
      })
      .catch(() => {});
  };

  const onClose = () => {
    closeAutofillOverlay();
  };

  const onCancel = () => {
    if (phase === "running") return;
    closeAutofillOverlay();
  };

  const onMarkApplied = () => {
    if (!prepared) return;
    setApplyState("pending");
    setApplyFeedback(null);
    chrome.runtime
      .sendMessage({
        type: "applyai.applyJob",
        payload: {
          jobUrl: prepared.detection.url,
          resumeVariantId: resumeVariant?.id ?? null,
          answers: [],
          coverLetterProvided: coverLetter.trim().length > 0,
          metadata: {
            filledFields: result?.filledFieldIds?.length ?? 0,
            skippedFields: result?.skippedFieldIds?.length ?? 0,
          },
          board: prepared.board,
        },
      })
      .catch(() => {
        setApplyState("idle");
        setApplyFeedback("Unable to mark applied.");
      });
  };

  useEffect(() => {
    if (!jobRecord) return;
    const timer = window.setTimeout(() => {
      const next: JobAnalysisRecord = {
        ...jobRecord,
        coverNote: coverLetter,
        updatedAt: Date.now(),
      };
      saveJobRecord(next).catch(() => {});
      setJobRecord(next);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [coverLetter]);

  useEffect(() => {
    if (!prepared) return;
    const shouldEnable = coverLetter.trim().length > 0;
    setFieldSelections((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const field of prepared.fields) {
        if (field.key === "coverLetterText") {
          if (next[field.id] !== shouldEnable) {
            next[field.id] = shouldEnable;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [coverLetter, prepared]);

  useEffect(() => {
    const handler = (message: any) => {
      if (
        message?.type === "applyai.applyJob.result" &&
        message.payload?.url === detection.url
      ) {
        if (message.payload.status === "applied") {
          setApplyState("done");
          setApplyFeedback("Marked as applied.");
        } else if (message.payload.status === "queued") {
          setApplyState("idle");
          setApplyFeedback("Offline – will sync when back online.");
        } else if (message.payload.status === "error") {
          setApplyState("idle");
          setApplyFeedback("Unable to mark applied. Try again later.");
        }
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [detection.url]);

  useEffect(() => {
    if (!applyFeedback) return;
    const timer = setTimeout(() => setApplyFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [applyFeedback]);

  return (
    <div className="fixed inset-0 z-[2147483646] pointer-events-none">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        onClick={onCancel}
      />
      <div className="absolute right-0 top-0 h-full w-[520px] max-w-[95vw] bg-neutral-950 border-l border-neutral-800 shadow-2xl pointer-events-auto flex flex-col">
        <header className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <div className="text-xs text-neutral-500">Autofill preview</div>
            <div className="text-sm font-semibold text-neutral-200">
              {detection.fields.title ?? "Role"} @{" "}
              {detection.fields.company ?? new URL(detection.url).hostname}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200"
            aria-label="Close autofill"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading || !prepared ? (
            <div className="text-neutral-400">Scanning form…</div>
          ) : (
            <>
              <section className="rounded-lg border border-neutral-800 p-4 bg-neutral-900/40">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-neutral-100">
                      Summary
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      {readyCount} fields ready •{" "}
                      {prepared.fields.length - readyCount} unsupported
                    </div>
                  </div>
                  <div className="text-right text-xs text-neutral-500">
                    {prepared.board} • confidence {Math.round(detection.confidence * 100)}%
                    <div>Detected in {detection.timeToDetectMs}ms</div>
                  </div>
                </div>
                {missingRequired.length ? (
                  <div className="mt-3 text-xs text-amber-300">
                    Missing required fields:{" "}
                    {missingRequired.map((f) => f.label || f.key).join(", ")}
                  </div>
                ) : null}
                {!profile && (
                  <div className="mt-3 text-xs text-neutral-400">
                    Profile data not found. Connect your account to enable full autofill.
                  </div>
                )}
              </section>

              <section>
                <div className="text-sm font-semibold text-neutral-100 mb-2">
                  Fields
                </div>
                <div className="space-y-3">
                  {prepared.fields.map((field) => (
                    <div
                      key={field.id}
                      className={[
                        "flex items-start justify-between gap-3 rounded-lg border px-3 py-2",
                        field.status === "ready"
                          ? "border-neutral-800 bg-neutral-900"
                          : "border-neutral-800/60 bg-neutral-950",
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-neutral-200">
                          {field.label || field.key || "Unknown field"}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {field.value
                            ? field.value
                            : field.status === "unsupported"
                              ? "Unsupported field type"
                              : "Missing profile data"}
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-neutral-400">
                        <input
                          type="checkbox"
                          checked={!!fieldSelections[field.id]}
                          onChange={(e) =>
                            handleFieldToggle(field.id, e.target.checked)
                          }
                          disabled={!field.value}
                        />
                        Fill
                      </label>
                    </div>
                  ))}
                  {!prepared.fields.length && (
                    <div className="text-xs text-neutral-500">
                      No fillable inputs detected on this page.
                    </div>
                  )}
                </div>
              </section>

              {prepared.files.length ? (
                <section>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-neutral-100">
                      Attachments
                    </div>
                    {canAttachResume ? (
                      <div className="text-xs text-neutral-400">
                        {resumeOptions.length
                          ? `${resumeOptions.length} resume option${resumeOptions.length === 1 ? "" : "s"}`
                          : "Upload a resume variant"}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 space-y-3">
                    {prepared.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-neutral-800 px-3 py-2 bg-neutral-900"
                      >
                        <div>
                          <div className="text-sm text-neutral-200">
                            {file.label || file.kind}
                          </div>
                          <div className="text-xs text-neutral-500">
                            Accepts {file.accept || "any"} •{" "}
                            {file.required ? "Required" : "Optional"}
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-neutral-400">
                          <input
                            type="checkbox"
                            checked={!!fileSelections[file.id]}
                            onChange={(e) =>
                              handleFileToggle(file.id, e.target.checked)
                            }
                          />
                          Attach
                        </label>
                      </div>
                    ))}
                  </div>
                  {canAttachResume ? (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs text-neutral-400">
                        Resume variant
                      </div>
                      <select
                        value={selectedResumeId ?? ""}
                        onChange={(e) =>
                          setSelectedResumeId(
                            e.target.value || null,
                          )
                        }
                        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/40"
                      >
                        <option value="">Select a resume</option>
                        {resumeOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label ?? opt.filename ?? opt.id}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => filePickerRef.current?.click()}
                          className="text-xs text-indigo-300 hover:underline"
                        >
                          Upload new resume
                        </button>
                        {resumeVariant?.dataBase64 ? (
                          <span className="text-[11px] text-emerald-300">
                            Ready
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-300">
                            No file data. Upload required to attach.
                          </span>
                        )}
                      </div>
                      {resumeError ? (
                        <div className="text-[11px] text-amber-300">
                          {resumeError}
                        </div>
                      ) : null}
                      <input
                        ref={filePickerRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleResumeUpload(file);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-neutral-100">
                    Cover note
                  </div>
                  <div className="text-xs text-neutral-500">
                    Saved edits sync automatically
                  </div>
                </div>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Paste or edit your cover note…"
                  className="mt-2 w-full min-h-[120px] rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 resize-vertical"
                />
              </section>
            </>
          )}
        </div>

        <footer className="border-t border-neutral-800 px-5 py-4 flex items-center justify-between gap-3">
          <div className="text-xs text-neutral-500">
            Review before submit. ApplyAI never auto-submits.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onAssist}
              className="text-xs text-amber-300 hover:underline"
            >
              Assist to map
            </button>
            <button
              onClick={onCancel}
              className="text-xs text-neutral-400 hover:underline"
              disabled={phase === "running"}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={
                loading ||
                phase === "running" ||
                resumeBlocking
              }
              className={[
                "px-4 py-2 rounded-full text-xs font-semibold transition",
                "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40",
                phase === "running" ? "opacity-70 cursor-wait" : "hover:bg-emerald-500/30",
              ].join(" ")}
            >
              {phase === "running" ? "Filling…" : "Fill form"}
            </button>
          </div>
        </footer>

        {phase === "running" ? (
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm grid place-items-center text-neutral-200 text-sm">
            Filling… {progress}%
            <div className="mt-3 w-48 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}

        {phase === "success" && result ? (
          <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur grid place-items-center text-neutral-200 text-sm">
            <div className="rounded-xl border border-emerald-500/40 bg-neutral-900 px-6 py-5 text-center space-y-3 w-[360px]">
              <div className="text-emerald-300 font-semibold">
                Autofill complete
              </div>
              <div className="text-xs text-neutral-400">
                Filled {result.filledFieldIds.length} fields • attached {result.fileAttachments.length} files
              </div>
              {applyFeedback ? (
                <div className="text-[11px] text-neutral-300">{applyFeedback}</div>
              ) : null}
              <div className="flex items-center justify-center gap-4 text-xs">
                <button
                  onClick={onMarkApplied}
                  disabled={applyState !== "idle"}
                  className={[
                    "px-3 py-1.5 rounded-full border",
                    applyState === "done"
                      ? "border-emerald-500/60 text-emerald-200"
                      : "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10",
                    applyState === "pending" ? "opacity-60 cursor-wait" : "",
                  ].join(" ")}
                >
                  {applyState === "pending"
                    ? "Marking…"
                    : applyState === "done"
                      ? "Applied"
                      : "Mark as applied"}
                </button>
                <button
                  onClick={onClose}
                  className="text-xs text-neutral-300 hover:underline"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {phase === "error" && error ? (
          <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur grid place-items-center text-neutral-200 text-sm">
            <div className="rounded-xl border border-amber-500/40 bg-neutral-900 px-6 py-5 text-center space-y-2 w-[320px]">
              <div className="text-amber-300 font-semibold">Autofill failed</div>
              <div className="text-xs text-neutral-400">{error}</div>
              <button
                onClick={() => {
                  setPhase("preview");
                  setError(null);
                }}
                className="text-xs text-amber-300 hover:underline"
              >
                Back to preview
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
