import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  loadNormalizedProfile,
  type NormalizedProfile,
} from "../lib/autofill/profile";
import {
  loadJobRecord,
  saveJobRecord,
  upsertAnswerArtifact,
  type JobAnalysisRecord,
  type JobAnswerArtifact,
  type TonePreset,
} from "../lib/storage/jobStore";
import { nanoid } from "../lib/autofill/utils";
import { getCurrentDetection } from "../lib/detect/context";
import {
  buildAnswerArtifact,
  generateApplicationAnswer,
  type AssistantGenerationResult,
} from "../lib/ai/application-assistant";

type FieldElement = HTMLTextAreaElement | HTMLInputElement;

interface OverlayPayload {
  element: FieldElement;
  signature: FieldSignature;
  fieldLabel: string;
  question: string;
  maxLength?: number;
  placeholder?: string;
}

interface FieldSignature {
  id?: string;
  name?: string;
  placeholder?: string;
  labelText?: string;
  ariaLabel?: string;
  tagName: string;
  type?: string;
}

const TONE_OPTIONS: Array<{
  id: TonePreset;
  label: string;
  helper: string;
}> = [
  { id: "concise", label: "Concise", helper: "Direct and to the point." },
  {
    id: "enthusiastic",
    label: "Enthusiastic",
    helper: "Warmer with positive energy.",
  },
  {
    id: "technical",
    label: "Technical",
    helper: "Focus on metrics, systems, and detail.",
  },
];

let triggerButton: HTMLButtonElement | null = null;
let triggerField: FieldElement | null = null;
let overlayHost: HTMLDivElement | null = null;
let overlayRoot: ReturnType<typeof createRoot> | null = null;
let currentPayload: OverlayPayload | null = null;
let repositionRAF: number | null = null;

function isEligibleField(target: EventTarget | null): target is FieldElement {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLTextAreaElement) return !target.disabled && !target.readOnly;
  if (target instanceof HTMLInputElement) {
    const type = target.type.toLowerCase();
    if (["text", "search", "email", "url", "tel", "number", "password"].includes(type)) {
      return !target.disabled && !target.readOnly;
    }
  }
  return false;
}

function getLabel(element: HTMLElement): string | undefined {
  const id = element.id;
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    const text = label?.textContent?.trim();
    if (text) return text;
  }
  const parentLabel = element.closest("label");
  if (parentLabel) {
    const text = parentLabel.textContent?.trim();
    if (text) return text;
  }
  const aria = element.getAttribute("aria-label");
  if (aria) return aria;
  const describedBy = element.getAttribute("aria-labelledby");
  if (describedBy) {
    for (const ref of describedBy.split(/\s+/)) {
      const node = document.getElementById(ref);
      const text = node?.textContent?.trim();
      if (text) return text;
    }
  }
  return undefined;
}

function buildSignature(element: FieldElement): FieldSignature {
  return {
    id: element.id || undefined,
    name: element.name || undefined,
    placeholder: element.placeholder || undefined,
    labelText: getLabel(element),
    ariaLabel: element.getAttribute("aria-label") || undefined,
    tagName: element.tagName.toLowerCase(),
    type: element instanceof HTMLInputElement ? element.type : undefined,
  };
}

function computeFieldKey(signature: FieldSignature): string {
  const parts = [
    signature.id ? `id:${signature.id}` : null,
    signature.name ? `name:${signature.name}` : null,
    signature.labelText ? `label:${signature.labelText}` : null,
    signature.placeholder ? `placeholder:${signature.placeholder}` : null,
    signature.ariaLabel ? `aria:${signature.ariaLabel}` : null,
    signature.type ? `type:${signature.type}` : null,
    signature.tagName ? `tag:${signature.tagName}` : null,
  ].filter(Boolean);
  return parts.join("|") || nanoid();
}

function ensureTrigger(): HTMLButtonElement {
  if (triggerButton) return triggerButton;
  triggerButton = document.createElement("button");
  triggerButton.type = "button";
  triggerButton.className =
    "applyai-assist-trigger fixed z-[2147483638] rounded-full border border-blue-500/40 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 shadow-lg transition hover:shadow-xl hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400";
  triggerButton.textContent = "ApplyAI Answer";
  triggerButton.style.pointerEvents = "auto";
  triggerButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!triggerField) return;
    openOverlayForField(triggerField);
  });
  document.documentElement.appendChild(triggerButton);
  return triggerButton;
}

function hideTrigger() {
  if (triggerButton) {
    triggerButton.style.display = "none";
  }
  triggerField = null;
}

function positionTrigger(element: FieldElement) {
  const button = ensureTrigger();
  button.style.display = "block";
  const rect = element.getBoundingClientRect();
  const top = rect.top + window.scrollY;
  const left = rect.left + window.scrollX;
  button.style.top = `${Math.max(top - 36, 8)}px`;
  button.style.left = `${Math.min(left + rect.width - button.offsetWidth, window.scrollX + document.documentElement.clientWidth - button.offsetWidth - 16)}px`;
}

function scheduleReposition(element: FieldElement) {
  if (repositionRAF) cancelAnimationFrame(repositionRAF);
  repositionRAF = requestAnimationFrame(() => {
    positionTrigger(element);
  });
}

function ensureOverlayHost(): HTMLDivElement {
  if (overlayHost) return overlayHost;
  overlayHost = document.createElement("div");
  overlayHost.className = "applyai-assistant-root";
  overlayHost.style.position = "fixed";
  overlayHost.style.zIndex = "2147483639";
  overlayHost.style.top = "0";
  overlayHost.style.left = "0";
  overlayHost.style.width = "100%";
  overlayHost.style.height = "100%";
  overlayHost.style.pointerEvents = "none";
  document.documentElement.appendChild(overlayHost);
  return overlayHost;
}

function closeOverlay() {
  currentPayload = null;
  if (overlayRoot) {
    overlayRoot.render(null);
    overlayRoot.unmount();
  }
  if (overlayHost) {
    overlayHost.remove();
  }
  overlayHost = null;
  overlayRoot = null;
  if (triggerField) {
    triggerField.focus();
  }
}

function openOverlayForField(element: FieldElement) {
  const signature = buildSignature(element);
  const fieldLabel =
    signature.labelText ||
    signature.placeholder ||
    signature.name ||
    "This question";
  const maxAttr = element.getAttribute("maxlength");
  const maxLength = maxAttr ? Number(maxAttr) || undefined : undefined;
  const payload: OverlayPayload = {
    element,
    signature,
    fieldLabel,
    question: `What should I write for "${fieldLabel}"?`,
    maxLength,
    placeholder: element.placeholder || undefined,
  };
  currentPayload = payload;
  const host = ensureOverlayHost();
  if (!overlayRoot) {
    overlayRoot = createRoot(host);
  }
  overlayRoot.render(
    <AssistantOverlay payload={payload} onDismiss={closeOverlay} />,
  );
}

export function initApplicationAssistant() {
  document.addEventListener(
    "focusin",
    (event) => {
      if (!isEligibleField(event.target)) {
        hideTrigger();
        return;
      }
      triggerField = event.target;
      scheduleReposition(event.target);
    },
    true,
  );

  document.addEventListener(
    "scroll",
    () => {
      if (triggerField) scheduleReposition(triggerField);
    },
    true,
  );

  window.addEventListener("resize", () => {
    if (triggerField) scheduleReposition(triggerField);
  });

  document.addEventListener(
    "focusout",
    (event) => {
      if (event.target === triggerField && !currentPayload) {
        setTimeout(() => hideTrigger(), 150);
      }
    },
    true,
  );
}

interface OverlayProps {
  payload: OverlayPayload;
  onDismiss: () => void;
}

function AssistantOverlay({ payload, onDismiss }: OverlayProps) {
  const [profile, setProfile] = useState<NormalizedProfile | null>(null);
  const [jobRecord, setJobRecord] = useState<JobAnalysisRecord | null>(null);
  const [tone, setTone] = useState<TonePreset>("concise");
  const [question, setQuestion] = useState(payload.question);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssistantGenerationResult | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastArtifact, setLastArtifact] = useState<JobAnswerArtifact | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prof, job] = await Promise.all([
          loadNormalizedProfile(),
          loadJobRecord(window.location.href),
        ]);
        if (cancelled) return;
        setProfile(prof);
        setJobRecord(job);
        if (job?.qa) {
          const key = computeFieldKey(payload.signature);
          const prev = job.qa[key];
          if (prev) {
            setAnswer(prev.answer);
            setLastArtifact(prev);
          }
        }
      } finally {
        if (!cancelled) {
          payload.element.focus();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payload.signature, payload.element]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener("keydown", listener, true);
    return () => document.removeEventListener("keydown", listener, true);
  }, [onDismiss]);

  const previousAnswers = useMemo(() => {
    if (!jobRecord?.qa) return [];
    return Object.values(jobRecord.qa).map((entry) => ({
      question: entry.question,
      answer: entry.answer,
    }));
  }, [jobRecord]);

  const onGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const detection = getCurrentDetection();
      const context = {
        question,
        tone,
        fieldLabel: payload.fieldLabel,
        maxChars: payload.maxLength ?? undefined,
        profile,
        detection,
        previousAnswers,
        fieldPlaceholder: payload.placeholder,
        jobRecordSummary: jobRecord
          ? {
              missingKeywords: jobRecord.missingKeywords,
              topSkills: jobRecord.topSkills,
            }
          : undefined,
      };
      const generation = await generateApplicationAnswer(context);
      setResult(generation);
      setAnswer(generation.answer);
      setWarnings(generation.warnings);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate right now. Try again shortly.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fieldKey = useMemo(
    () => computeFieldKey(payload.signature),
    [payload.signature],
  );

  const onInsert = async () => {
    if (!answer.trim().length) {
      setError("Answer is empty.");
      return;
    }
    payload.element.value = answer;
    payload.element.dispatchEvent(new Event("input", { bubbles: true }));
    payload.element.dispatchEvent(new Event("change", { bubbles: true }));
    const citations = result?.citations ?? lastArtifact?.citations ?? [];
    const artifact = buildAnswerArtifact({
      url: window.location.href,
      fieldKey,
      fieldLabel: payload.fieldLabel,
      question,
      tone,
      answer,
      citations,
      maxLength: payload.maxLength,
    });
    await upsertAnswerArtifact(window.location.href, artifact);
    await saveJobRecord({
      url: window.location.href,
      qa: { [fieldKey]: artifact },
      updatedAt: Date.now(),
    });
    setLastArtifact(artifact);
    onDismiss();
  };

  return (
    <div className="pointer-events-auto fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              ApplyAI Assistant
            </p>
            <h2 className="text-base font-semibold text-slate-100">
              {payload.fieldLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close assistant"
          >
            ✕
          </button>
        </header>

        <section className="space-y-3 px-4 py-4">
          <label className="block text-sm font-medium text-slate-200">
            Prompt
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Describe your experience with…"
            />
          </label>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tone
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TONE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTone(option.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    tone === option.id
                      ? "border-blue-500 bg-blue-500/10 text-blue-200"
                      : "border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-400 hover:text-blue-100"
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-slate-400">{option.helper}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGenerate}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-500/50"
            >
              {loading ? "Generating…" : "Generate answer"}
            </button>
            {payload.maxLength ? (
              <span className="text-xs text-slate-500">
                Limit: {payload.maxLength} characters
              </span>
            ) : (
              <span className="text-xs text-slate-500">
                Aim for under 200 words
              </span>
            )}
          </div>

          {(error || warnings.length) && (
            <div className="rounded-lg border border-rose-600/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error ? (
                <p>{error}</p>
              ) : (
                warnings.map((warn) => <p key={warn}>{warn}</p>)
              )}
            </div>
          )}

          <label className="block text-sm font-medium text-slate-200">
            Answer (editable)
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              rows={8}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>

          {result?.citations?.length ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Citations
              </p>
              <ul className="mt-2 space-y-2 text-xs text-slate-300">
                {result.citations.map((citation) => (
                  <li key={citation.id}>
                    <span className="font-medium text-slate-200">
                      {citation.label}
                    </span>
                    <span className="text-slate-500"> — {citation.excerpt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-950 px-4 py-3">
          <div className="text-xs text-slate-500">
            ApplyAI never submits forms automatically.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onInsert}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-500"
            >
              Insert into field
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
