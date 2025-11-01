/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

/** ============== Types ============== */
export interface DetectionForBanner {
  url: string;
  fields: {
    title?: string;
    company?: string;
  };
  confidence: number; // 0..1
  timeToDetectMs: number;
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
export async function mountDetectionBanner(det: DetectionForBanner) {
  if (dismissedThisLoad) return;

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
  onDismiss,
}: {
  det: DetectionForBanner;
  onDismiss: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(true); // for slide-in

  useEffect(() => {
    // Defer to ensure paint within ≤800ms from detection caller
    const t = setTimeout(() => setHidden(false), 0);
    return () => clearTimeout(t);
  }, []);

  const domain = useMemo(() => getDomain(det.url), [det.url]);
  const iconHref = useMemo(() => computeFaviconHref(det.url), [det.url]);

  const title = det.fields.title ?? "Untitled role";
  const company = det.fields.company ?? "";

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
    const jdHtml =
      document.querySelector("[data-qa='job-description']")?.innerHTML ||
      document.querySelector("#jobDescriptionText")?.innerHTML ||
      document.body.innerText.slice(0, 50000);

    // Pull resume/profile from your store or background (user’s own data only).
    chrome.storage.local
      .get("applyai.userProfile.v1")
      .then(({ ["applyai.userProfile.v1"]: profile }) => {
        chrome.runtime.sendMessage({
          type: "applyai.analyzeJob",
          payload: {
            url: det.url,
            jdHtmlOrText: jdHtml,
            title: det.fields.title,
            company: det.fields.company,
            resumeText: profile?.resumeText ?? "",
            plan: { metered: true }, // toggle meter if applicable
          },
        });
      });
  };

  const onSave = () => {
    chrome.runtime
      .sendMessage({ type: "applyai.saveJob", payload: { url: det.url } })
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
          "shadow-xl backdrop-blur supports-[backdrop-filter]:backdrop-saturate-150",
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
            Job detected • {domain} • {pct(det.confidence)} •{" "}
            {det.timeToDetectMs}ms
          </div>
          <div className="text-sm font-semibold truncate" title={title}>
            {title}
          </div>
          {company ? (
            <div className="text-xs text-neutral-400 truncate" title={company}>
              {company}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
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
            onClick={onSave}
            className={[
              "px-3 py-1.5 rounded-full text-xs font-semibold",
              "bg-blue-500/10 text-blue-300 border border-blue-600/40",
              "hover:bg-blue-500/20 active:scale-[0.99] transition",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/40",
            ].join(" ")}
          >
            Save
          </button>

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
                <button
                  onClick={openSidePanel}
                  className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-neutral-800"
                  role="menuitem"
                >
                  Open Side Panel
                </button>
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
