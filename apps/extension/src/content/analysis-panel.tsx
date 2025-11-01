import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { normalizeJD } from "../lib/ai/normalizer";
import { computeMatch, normalizeKeywordsFromText } from "../lib/ai/scoring";
import { generateSuggestions, type AIGenInput } from "../lib/ai/provider";
import {
  loadJobRecord,
  saveJobRecord,
  type JobAnalysisRecord,
} from "../lib/storage/jobStore";
import { emitAnalysisTelemetry } from "../lib/telemetry-analysis";

type LaunchPayload = {
  url: string;
  jdHtmlOrText: string;
  title?: string;
  company?: string;
  resumeText?: string; // user’s own data only (AC4)
  plan?: { metered?: boolean; monthlyLimit?: number; monthlyUsed?: number };
};

let root: ReturnType<typeof createRoot> | null = null;
let host: HTMLDivElement | null = null;

export function openAnalysisPanel(payload: LaunchPayload) {
  if (!host) {
    host = document.createElement("div");
    host.id = "applyai-analysis-root";
    document.documentElement.appendChild(host);
    root = createRoot(host);
  }
  root!.render(<Panel payload={payload} />);
}

export function closeAnalysisPanel() {
  if (root && host) {
    root.unmount();
    host.remove();
  }
  root = null;
  host = null;
}

function Ring({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const stroke = 8;
  const r = 32;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width="80" height="80" className="shrink-0">
      <circle
        cx="40"
        cy="40"
        r={r}
        strokeWidth={stroke}
        className="fill-none stroke-neutral-800"
      />
      <circle
        cx="40"
        cy="40"
        r={r}
        strokeWidth={stroke}
        className="fill-none stroke-emerald-400"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-neutral-200 text-sm font-semibold"
      >
        {pct}%
      </text>
    </svg>
  );
}

function Panel({ payload }: { payload: LaunchPayload }) {
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<{
    score: number;
    missing: string[];
    top: string[];
    detail: any;
  } | null>(null);
  const [bullets, setBullets] = useState<string[]>([]);
  const [cover, setCover] = useState("");
  const [usage, setUsage] = useState<{
    in?: number;
    out?: number;
    model?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  const domain = useMemo(() => {
    try {
      return new URL(payload.url).hostname;
    } catch {
      return "";
    }
  }, [payload.url]);

  // Kick off analysis
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t0 = performance.now();

      // Load any previous edits
      const prior = await loadJobRecord(payload.url);
      if (prior && !cancelled) {
        setBullets(prior.bullets);
        setCover(prior.coverNote);
      }

      // 1) Normalize JD (fast)
      const jd = normalizeJD(
        payload.jdHtmlOrText,
        payload.title,
        payload.company,
      );

      // 2) Build profile keyword set
      const resumeText = (payload.resumeText || "").slice(0, 20000);
      const profileKw = normalizeKeywordsFromText(resumeText);

      // Split JD keywords into required / nice
      const reqKw = jd.requirements.flatMap(normalizeKeywordsFromText);
      const nthKw = jd.niceToHaves.flatMap(normalizeKeywordsFromText);

      // 3) Local match scoring (fast)
      const m = computeMatch({
        jdRequired: reqKw,
        jdNice: nthKw,
        profileKeywords: profileKw,
      });
      if (cancelled) return;
      setMatch({
        score: m.score,
        missing: m.missing.slice(0, 25),
        top: m.topSkills,
        detail: m.detail,
      });

      // 4) AI suggestions with timeout + fallback
      const aiInput: AIGenInput = {
        jd: {
          title: jd.titleGuess ?? payload.title,
          company: jd.companyGuess ?? payload.company,
          responsibilities: jd.responsibilities,
          requirements: jd.requirements,
          niceToHaves: jd.niceToHaves,
        },
        profile: { resumeText },
        matchScore: m.score,
        missingKeywords: m.missing,
        topSkills: m.topSkills,
      };

      const ai = await generateSuggestions(aiInput, {
        aiEndpoint: undefined, // set to your backend proxy URL when ready
        timeoutMs: 3200,
        metered: payload.plan?.metered,
      });

      if (cancelled) return;

      // Keep existing edits if user already started typing
      setBullets((prev) => (prev.length ? prev : ai.bullets.slice(0, 5)));
      setCover((prev) => (prev?.trim() ? prev : ai.coverNote));
      setUsage({
        in: ai.usage.tokensIn,
        out: ai.usage.tokensOut,
        model: ai.usage.model,
      });

      // Telemetry
      emitAnalysisTelemetry({
        kind: "job_analysis_v1",
        url: payload.url,
        domain,
        latencyMs: Math.round(performance.now() - t0),
        tokensIn: ai.usage.tokensIn,
        tokensOut: ai.usage.tokensOut,
        model: ai.usage.model,
        score: m.score,
        reqHit: m.detail.reqHit,
        reqTotal: m.detail.reqTotal,
        nthHit: m.detail.nthHit,
        nthTotal: m.detail.nthTotal,
        ts: Date.now(),
      });

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [payload.url]);

  // Autosave (debounced)
  useEffect(() => {
    const id = setTimeout(async () => {
      if (!match) return;
      setSaving(true);
      const rec: JobAnalysisRecord = {
        url: payload.url,
        matchScore: match.score,
        missingKeywords: match.missing,
        topSkills: match.top,
        bullets,
        coverNote: cover,
        updatedAt: Date.now(),
        tokens: { in: usage.in ?? 0, out: usage.out ?? 0, model: usage.model },
      };
      await saveJobRecord(rec);
      setSaving(false);
    }, 600);
    return () => clearTimeout(id);
  }, [bullets, cover, match?.score]);

  // UI
  return (
    <div className="fixed inset-0 z-[2147483646] pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 pointer-events-auto"
        onClick={closeAnalysisPanel}
      />
      {/* Panel */}
      <div
        className="absolute right-0 top-0 h-full w-[480px] max-w-[90vw] bg-neutral-950 border-l border-neutral-800 shadow-2xl pointer-events-auto
                      transition-transform will-change-transform translate-x-0"
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div>
            <div className="text-sm text-neutral-400">
              AI-generated (editable)
            </div>
            <div className="text-base font-semibold text-neutral-200">
              {payload.title ?? "Role"} @ {payload.company ?? domain}
            </div>
          </div>
          <button
            onClick={closeAnalysisPanel}
            className="text-neutral-400 hover:text-neutral-200"
          >
            ✕
          </button>
        </div>

        {/* Header stats */}
        <div className="p-4 flex items-center gap-4">
          <Ring value={match?.score ?? 0} />
          <div className="flex-1">
            <div className="text-sm text-neutral-400">Match score</div>
            <div className="text-2xl font-semibold">{match?.score ?? 0}%</div>
            <div className="text-xs text-neutral-500">
              Computed locally; final edits autosave
            </div>
          </div>

          {/* Token meter (metered plans only) */}
          {payload.plan?.metered ? (
            <div className="text-right">
              <div className="text-xs text-neutral-400">Tokens</div>
              <div className="text-sm text-neutral-200">
                {(usage.in ?? 0) + (usage.out ?? 0)}
              </div>
              <div className="text-[11px] text-neutral-500">
                {usage.model ?? "n/a"}
              </div>
            </div>
          ) : null}
        </div>

        {/* Missing & Top skills */}
        <div className="px-4 grid grid-cols-2 gap-3">
          <div className="border border-neutral-800 rounded-lg p-3">
            <div className="text-sm font-semibold mb-2">Missing keywords</div>
            <div className="flex flex-wrap gap-2">
              {(match?.missing ?? []).slice(0, 20).map((k) => (
                <span
                  key={k}
                  className="px-2 py-1 rounded bg-amber-500/10 text-amber-300 text-xs border border-amber-600/30"
                >
                  {k}
                </span>
              ))}
              {(!match || match.missing.length === 0) && (
                <span className="text-xs text-neutral-500">None detected</span>
              )}
            </div>
          </div>
          <div className="border border-neutral-800 rounded-lg p-3">
            <div className="text-sm font-semibold mb-2">Top aligned skills</div>
            <div className="flex flex-wrap gap-2">
              {(match?.top ?? []).slice(0, 10).map((k) => (
                <span
                  key={k}
                  className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-600/30"
                >
                  {k}
                </span>
              ))}
              {(!match || match.top.length === 0) && (
                <span className="text-xs text-neutral-500">No overlap</span>
              )}
            </div>
          </div>
        </div>

        {/* Bullets (editable) */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Bullet suggestions</div>
            <div className="text-xs text-neutral-500">
              {saving ? "Saving…" : "Autosaved"}
            </div>
          </div>
          <div className="mt-2 space-y-2">
            {Array.from({ length: Math.max(3, bullets.length || 3) }).map(
              (_, i) => (
                <textarea
                  key={i}
                  value={bullets[i] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBullets((b) => {
                      const copy = [...b];
                      copy[i] = v;
                      return copy;
                    });
                  }}
                  placeholder={`Bullet ${i + 1}`}
                  className="w-full resize-vertical min-h-[56px] rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              ),
            )}
          </div>
        </div>

        {/* Cover note (editable) */}
        <div className="px-4 pb-4">
          <div className="text-sm font-semibold">Brief cover note</div>
          <textarea
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            placeholder="2–3 sentences…"
            className="mt-2 w-full resize-vertical min-h-[84px] rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          />
        </div>

        {/* Footer */}
        <div className="mt-auto p-4 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            AI output may contain errors. Review before use.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => document.execCommand("copy")}
              className="text-xs text-blue-300 hover:underline"
            >
              Copy
            </button>
            <button
              onClick={closeAnalysisPanel}
              className="text-xs text-neutral-300 hover:underline"
            >
              Close
            </button>
          </div>
        </div>

        {/* Skeleton overlay */}
        {loading && (
          <div className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm grid place-items-center">
            <div className="animate-pulse text-neutral-400">Analyzing…</div>
          </div>
        )}
      </div>
    </div>
  );
}
