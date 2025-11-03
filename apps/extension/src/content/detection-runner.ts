import "./index";
import { bootstrapDetection } from "../lib/detect/registry";
import type {
  DetectionResult,
  Settings,
  SupportedBoard,
} from "../lib/detect/types";
import { emitTelemetry } from "../lib/telemetry";
import { mountDetectionBanner } from "./banner";

const SETTINGS_KEY = "applyai.settings.v1";
const DEFAULTS: Settings = {
  confidenceThreshold: 0.6,
  bannerEnabled: true,
};

// Allowlist: banner appears only for these boards (no generic)
const SUPPORTED: SupportedBoard[] = [
  "greenhouse",
  "lever",
  "workday",
  "ashby",
  "smartrecruiters",
  "taleo",
  "indeed",
  "linkedin",
  "bamboohr",
  "icims",
];

function isSupportedBoard(b: DetectionResult["board"]) {
  return SUPPORTED.includes(b as SupportedBoard);
}

// Extra guardrails to avoid false positives
function hasApplyCue(doc: Document): boolean {
  const sels = [
    'a[href*="apply"]',
    'button[aria-label*="apply" i]',
    'button:has(svg[aria-label*="apply" i])',
    'input[type="submit"][value*="apply" i]',
    '[data-automation-id="applyButton"]',
    "#apply_button",
    ".posting-apply-button",
    ".jobs-apply-button",
  ];
  return sels.some((s) => !!doc.querySelector(s));
}

function hasSubstantialJD(html?: string): boolean {
  if (!html) return false;
  // Require at least ~120 chars of text content to consider it a JD
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length >= 120;
}

let lastBannerKey = "";

async function loadSettings(): Promise<Settings> {
  try {
    const { [SETTINGS_KEY]: s } = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...DEFAULTS, ...(s || {}) };
  } catch {
    return DEFAULTS;
  }
}

bootstrapDetection(async (det: DetectionResult | null) => {
  if (!det) return;

  // AC5: telemetry always
  emitTelemetry(det).catch(() => {});

  const settings = await loadSettings();
  if (!settings.bannerEnabled) return;

  // Confidence & page-cue gates
  const confFloor = Math.max(0.5, settings.confidenceThreshold ?? 0.6); // never below 0.5
  const strongJD = hasSubstantialJD(det.fields.description);
  const applyCue = hasApplyCue(document);
  const hasSignals = strongJD || applyCue;
  const supported = isSupportedBoard(det.board);

  let mode: "detected" | "assist" | null = null;
  let message: string | undefined;

  if (supported && det.confidence >= confFloor && hasSignals) {
    mode = "detected";
  } else if ((supported || det.board === "generic") && hasSignals) {
    if (det.confidence < confFloor && det.confidence >= Math.max(0.2, confFloor - 0.3)) {
      mode = "assist";
      message = supported
        ? "Confidence is below your threshold. Map the fields to improve detection."
        : "Help map this page so ApplyAI can support it.";
    }
  }

  if (!mode) return;

  // Dedupe by URL
  const key = `${mode}:${det.url}`;
  if (lastBannerKey === key) return;
  lastBannerKey = key;

  // Still within AC1: we run from DOM ready and fast detector passes
  mountDetectionBanner({ detection: det, mode, message });
});
