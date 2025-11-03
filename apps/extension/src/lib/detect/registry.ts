import type {
  Detector,
  DetectorContext,
  DetectionResult,
  JobFields,
} from "./types";
import { extractJobFromJsonLd, onReady, VERSION } from "./utils";
import { scoreDetection } from "./scoring";
// Detectors
import Greenhouse from "../detectors/greenhouse";
import Lever from "../detectors/lever";
import Workday from "../detectors/workday";
import Ashby from "../detectors/ashby";
import SmartRecruiters from "../detectors/smartrecruiters";
import Taleo from "../detectors/taleo";
import Indeed from "../detectors/indeed";
import LinkedIn from "../detectors/linkedin";
import BambooHR from "../detectors/bamboohr";
import ICIMS from "../detectors/icims";

const detectors: Detector[] = [
  Greenhouse,
  Lever,
  Workday,
  Ashby,
  SmartRecruiters,
  Taleo,
  Indeed,
  LinkedIn,
  BambooHR,
  ICIMS,
];

// Very cheap URL pass to shortlist detectors
export function shortlistByUrl(u: URL): Detector[] {
  const list = detectors.filter((d) => d.urlMatch(u));
  return list.length ? list : detectors; // if unknown, try all
}

export function runDetection(ctx: DetectorContext): DetectionResult | null {
  const started = performance.now();
  const url = ctx.url;

  // 1) JSON-LD fast path
  const jsonLdFields = extractJobFromJsonLd(ctx.doc);
  const hasJsonLd = !!(
    jsonLdFields.title ||
    jsonLdFields.description ||
    jsonLdFields.company
  );

  // 2) URL shortlist + DOM pass
  const candidates = shortlistByUrl(url);
  for (const det of candidates) {
    const urlMatched = det.urlMatch(url);
    const isDetail = det.isJobDetail ? det.isJobDetail(ctx) : true;
    if (!isDetail && !hasJsonLd) continue;

    const extracted = det.extract(ctx);
    const fields: JobFields = {
      ...extracted,
      // Prefer JSON-LD when present; DOM fills gaps
      title: jsonLdFields.title ?? extracted.title,
      company: jsonLdFields.company ?? extracted.company,
      location: jsonLdFields.location ?? extracted.location,
      description: jsonLdFields.description ?? extracted.description,
      applyUrl: jsonLdFields.applyUrl ?? extracted.applyUrl,
      postingDate: jsonLdFields.postingDate ?? extracted.postingDate,
    };

    const signatureScore = det.signatureScore?.(ctx) ?? 0;
    const confidence = scoreDetection({
      urlMatched,
      hasJsonLd,
      signatureScore,
      fields,
    });

    const timeToDetectMs = Math.round(performance.now() - started);

    // We require at least a title to emit
    if (fields.title) {
      return {
        board: det.id,
        version: det.version || VERSION,
        url: url.toString(),
        fields,
        confidence,
        timeToDetectMs,
        timestamp: Date.now(),
      };
    }
  }

  // 3) As a last resort, if JSON-LD had a title, emit generic
  if (jsonLdFields.title) {
    return {
      board: "generic",
      version: VERSION,
      url: url.toString(),
      fields: jsonLdFields as JobFields,
      confidence: scoreDetection({
        urlMatched: false,
        hasJsonLd: true,
        fields: jsonLdFields as JobFields,
        signatureScore: 0.2,
      }),
      timeToDetectMs: Math.round(performance.now() - started),
      timestamp: Date.now(),
    };
  }

  return null;
}

// Run immediately when DOM is ready, and on SPA URL changes
export function bootstrapDetection(run: (r: DetectionResult | null) => void) {
  const fire = () => {
    const ctx: DetectorContext = {
      url: new URL(location.href),
      doc: document,
      startedAt: Date.now(),
    };
    const res = runDetection(ctx);
    run(res);
  };

  onReady(() => {
    // Fast pass (likely within ~100-300ms)
    fire();

    // Re-try lightly after small delays to catch late-loading DOM
    setTimeout(fire, 250);
    setTimeout(fire, 700);
  });

  // SPA navigation watcher (pushState/replaceState + popstate + DOM mutations)
  let lastHref = location.href;
  const checkUrl = () => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      fire();
      setTimeout(fire, 300); // after SPA renders
    }
  };

  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args) {
    const r = origPush.apply(this, args as any);
    checkUrl();
    return r;
  };
  history.replaceState = function (...args) {
    const r = origReplace.apply(this, args as any);
    checkUrl();
    return r;
  };
  window.addEventListener("popstate", checkUrl);

  const mo = new MutationObserver(() => {
    // Cheap heuristic: if title node or large content changes, consider re-check
    // but throttle it by URL change (no-op if URL is stable)
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}
