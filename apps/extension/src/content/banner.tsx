/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { DetectionResult } from "../lib/detect/types";
import { promptManualAssist } from "./manual-assist";

/** ============== Types ============== */
export type BannerMode = "detected" | "assist";

export interface BannerMountOptions {
  detection: DetectionResult;
  mode: BannerMode;
  message?: string;
}

/** ============== Storage Keys ============== */
const STORAGE_KEYS = {
  DISABLED_DOMAINS: "applyai.disabledDomains.v1", // string[]
} as const;

/** ============== Utilities ============== */
const getDomain = (u: string) => {
  try {
    return new URL(u).hostname;
  } catch {
    return "";
  }
};

async function getDisabledDomains(): Promise<string[]> {
  const { [STORAGE_KEYS.DISABLED_DOMAINS]: arr } =
    await chrome.storage.sync.get(STORAGE_KEYS.DISABLED_DOMAINS);
  return Array.isArray(arr) ? arr : [];
}
async function setDisabledDomains(arr: string[]) {
  await chrome.storage.sync.set({ [STORAGE_KEYS.DISABLED_DOMAINS]: arr });
}

/** Try best-effort favicon */
function computeFaviconHref(pageUrl: string): string | undefined {
  try {
    const u = new URL(pageUrl);
    // 1) <link rel="icon"> if present
    const link =
      (document.querySelector('link[rel~="icon"]') as HTMLLinkElement | null)
        ?.href ||
      (
        document.querySelector(
          'link[rel="shortcut icon"]',
        ) as HTMLLinkElement | null
      )?.href;
    if (link) return new URL(link, u.origin).toString();
    // 2) Default /favicon.ico
    return `${u.origin}/favicon.ico`;
  } catch {
    return undefined;
  }
}

/** format percent */
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** ============== Mount Container ============== */
let root: ReturnType<typeof createRoot> | null = null;
let containerEl: HTMLDivElement | null = null;
// Per-refresh dismiss memory
let dismissedThisLoad = false;

/**
 * Public API: call when a job page is detected.
 * Invisible until called.
 */
export async function mountDetectionBanner(options: BannerMountOptions) {
  if (dismissedThisLoad) return;

  const { detection: det, mode } = options;
  const domain = getDomain(det.url);
  const disabled = await getDisabledDomains();
  if (disabled.includes(domain)) return; // Invisible when disabled for this site

  if (!containerEl) {
    containerEl = document.createElement("div");
    containerEl.id = "applyai-banner-root";
    // Attach to page (no Shadow DOM so Tailwind works out-of-the-box)
    document.documentElement.appendChild(containerEl);
    root = createRoot(containerEl);
  }

  // Render (re-render updates values)
  root!.render(
    <Banner
      det={det}
      mode={mode}
      message={options.message}
      onDismiss={() => {
        dismissedThisLoad = true;
        unmountDetectionBanner();
      }}
    />,
  );
}

/** Optional: unmount (used by dismiss action) */
export function unmountDetectionBanner() {
  if (root && containerEl) {
    root.unmount();
    containerEl.remove();
  }
  root = null;
  containerEl = null;
}

/** ============== Banner Component ============== */
function Banner({
  det,
  mode,
  message,
  onDismiss,
}: {
  det: DetectionResult;
  mode: BannerMode;
  message?: string;
  onDismiss: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(true); // for slide-in
  const [saveState, setSaveState] = useState<"idle" | "pending">("idle");
  const [status, setStatus] = useState<{
    text: string;
    tone: "success" | "info" | "warn";
  } | null>(null);

  useEffect(() => {
    const listener = (message: any) => {
      if (
        message?.type === "applyai.saveJob.result" &&
        message.payload?.url === det.url
      ) {
        setSaveState("idle");
        const st = message.payload.status;
        if (st === "created") {
          setStatus({ text: "Saved to ApplyAI.", tone: "success" });
        } else if (st === "updated") {
          setStatus({ text: "Already saved in ApplyAI.", tone: "info" });
        } else if (st === "queued") {
          setStatus({ text: "Offline – will sync when back online.", tone: "warn" });
        } else if (st === "error") {
          setStatus({ text: "Save failed. Try again in a moment.", tone: "warn" });
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [det.url]);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    // Defer to ensure paint within ≤800ms from detection caller
    const t = setTimeout(() => setHidden(false), 0);
    return () => clearTimeout(t);
  }, []);

  const domain = useMemo(() => getDomain(det.url), [det.url]);
  const iconHref = useMemo(() => computeFaviconHref(det.url), [det.url]);

  const title = det.fields.title ?? "Untitled role";
  const company = det.fields.company ?? "";
  const confidencePct = pct(det.confidence);

  const disableOnThisSite = async () => {
    const list = await getDisabledDomains();
    if (!list.includes(domain)) {
      list.push(domain);
      await setDisabledDomains(list);
    }
    onDismiss();
  };

  const openSidePanel = () => {
    // You can wire chrome.sidePanel directly if your extension has it enabled,
    // or signal background to open a panel/page.
    chrome.runtime
      .sendMessage({
        type: "applyai.openSidePanel",
        payload: { from: "banner" },
      })
      .catch(() => {});
    setMenuOpen(false);
  };

  const onAnalyze = () => {
    // Pull resume/profile from your store or background (user’s own data only).
    chrome.storage.local
      .get("applyai.userProfile.v1")
      .then(({ ["applyai.userProfile.v1"]: profile }) => {
        chrome.runtime.sendMessage({
          type: "applyai.analyzeJob",
          payload: {
            url: det.url,
            jdHtmlOrText: det.fields.description
              ? det.fields.description
              : document.body.innerText.slice(0, 50000),
            title: det.fields.title,
            company: det.fields.company,
            resumeText: profile?.resumeText ?? "",
            plan: { metered: true }, // toggle meter if applicable
          },
        });
      });
  };

  const onAutofill = () => {
    chrome.runtime
      .sendMessage({
        type: "applyai.autofill.preview",
        payload: {
          detection: {
            ...det,
            // Strip heavy description HTML to keep message light
            fields: {
              ...det.fields,
              description: undefined,
            },
          },
        },
      })
      .catch(() => {});
  };

  const onAssist = () => {
    promptManualAssist();
    setMenuOpen(false);
  };

  const onSave = () => {
    setSaveState("pending");
    setStatus(null);
    chrome.runtime
      .sendMessage({
        type: "applyai.saveJob",
        payload: {
          detection: {
            ...det,
            fields: {
              ...det.fields,
              description: det.fields.description?.slice(0, 20000),
            },
          },
        },
      })
      .catch(() => {});
  };

  return (
    <div
      className={[
        "fixed top-4 right-4 z-[2147483647]",
        "transition-transform duration-300",
        hidden ? "translate-x-4 opacity-0" : "translate-x-0 opacity-100",
      ].join(" ")}
      role="region"
      aria-label="ApplyAI job detection"
    >
      <div
        className={[
          "flex items-center gap-2",
          "rounded-full border border-neutral-800/70 bg-neutral-900/95",
          "shadow-xl backdrop-blur supports-backdrop-filter:backdrop-saturate-150",
          "px-3 py-2",
          "text-neutral-200",
          "max-w-[460px]",
        ].join(" ")}
      >
        {/* Favicon */}
        <div className="size-5 shrink-0 rounded overflow-hidden bg-neutral-800">
          {iconHref ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconHref}
              alt=""
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="h-full w-full" />
          )}
        </div>

        {/* Title / Company (truncated) */}
        <div className="min-w-0 flex-1">
          <div className="text-xs text-neutral-400 leading-none mb-0.5">
            {mode === "detected"
              ? `Job detected • ${domain} • ${confidencePct} • ${det.timeToDetectMs}ms`
              : `Low confidence (${confidencePct}) • ${domain}`}
          </div>
          <div className="text-sm font-semibold truncate" title={title}>
            {title}
          </div>
          {company ? (
            <div className="text-xs text-neutral-400 truncate" title={company}>
              {company}
            </div>
          ) : null}
          {status ? (
            <div
              className={[
                "text-[11px] mt-0.5",
                status.tone === "success"
                  ? "text-emerald-300"
                  : status.tone === "info"
                    ? "text-blue-300"
                    : "text-amber-300",
              ].join(" ")}
            >
              {status.text}
            </div>
          ) : null}
          {mode === "assist" && message ? (
            <div className="text-[11px] text-neutral-500 mt-0.5">{message}</div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {mode === "detected" ? (
            <>
              <button
                onClick={onAnalyze}
                className={[
                  "px-3 py-1.5 rounded-full text-xs font-semibold",
                  "bg-emerald-500/15 text-emerald-300 border border-emerald-600/40",
                  "hover:bg-emerald-500/25 active:scale-[0.99] transition",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/40",
                ].join(" ")}
              >
                Analyze
              </button>

              <button
                onClick={onAutofill}
                className={[
                  "px-3 py-1.5 rounded-full text-xs font-semibold",
                  "bg-indigo-500/15 text-indigo-200 border border-indigo-600/40",
                  "hover:bg-indigo-500/25 active:scale-[0.99] transition",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
                ].join(" ")}
              >
                Autofill
              </button>

              <button
                onClick={onSave}
                disabled={saveState === "pending"}
                className={[
                  "px-3 py-1.5 rounded-full text-xs font-semibold",
                  "bg-blue-500/10 text-blue-300 border border-blue-600/40",
                  saveState === "pending"
                    ? "opacity-70 cursor-wait"
                    : "hover:bg-blue-500/20 active:scale-[0.99] transition",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/40",
                ].join(" ")}
              >
                {saveState === "pending" ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <button
              onClick={onAssist}
              className={[
                "px-3 py-1.5 rounded-full text-xs font-semibold",
                "bg-amber-500/15 text-amber-200 border border-amber-600/40",
                "hover:bg-amber-500/25 active:scale-[0.99] transition",
                "focus:outline-none focus:ring-2 focus:ring-amber-500/40",
              ].join(" ")}
            >
              Assist to map
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className={[
                "size-8 grid place-items-center rounded-full",
                "text-neutral-300 hover:bg-neutral-800/60 border border-neutral-700/60",
                "focus:outline-none focus:ring-2 focus:ring-neutral-600/50",
              ].join(" ")}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="More options"
              title="More"
            >
              ⋯
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl p-1"
              >
                <button
                  onClick={disableOnThisSite}
                  className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-neutral-800"
                  role="menuitem"
                >
                  Disable on this site
                </button>
                {mode === "detected" ? (
                  <button
                    onClick={openSidePanel}
                    className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-neutral-800"
                    role="menuitem"
                  >
                    Open Side Panel
                  </button>
                ) : (
                  <button
                    onClick={onAssist}
                    className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-neutral-800"
                    role="menuitem"
                  >
                    Assist to map
                  </button>
                )}
              </div>
            ) : null}
          </div>

          {/* Dismiss (X) */}
          <button
            onClick={onDismiss}
            className="size-8 grid place-items-center rounded-full text-neutral-400 hover:bg-neutral-800/60 border border-neutral-700/60"
            aria-label="Dismiss"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
