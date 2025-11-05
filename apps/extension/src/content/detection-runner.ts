import "./index";
import { bootstrapDetection } from "../lib/detect/registry";
import type {
  DetectionResult,
  Settings,
  SupportedBoard,
} from "../lib/detect/types";
import { setCurrentDetection } from "../lib/detect/context";
import { emitTelemetry } from "../lib/telemetry";

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

async function loadSettings(): Promise<Settings> {
  try {
    const { [SETTINGS_KEY]: s } = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...DEFAULTS, ...(s || {}) };
  } catch {
    return DEFAULTS;
  }
}

bootstrapDetection(async (det: DetectionResult | null) => {
  if (!det) {
    setCurrentDetection(null);
    chrome.runtime
      .sendMessage({ type: "applyai.action.state", payload: { state: "default" } })
      .catch(() => {});
    return;
  }

  setCurrentDetection(det);

  // AC5: telemetry always
  emitTelemetry(det).catch(() => {});
  const settings = await loadSettings();
  const confFloor = Math.max(0.5, settings.confidenceThreshold ?? 0.6);
  const strongJD = hasSubstantialJD(det.fields.description);
  const applyCue = hasApplyCue(document);
  const hasSignals = strongJD || applyCue;
  const supported = isSupportedBoard(det.board);

  const actionable = supported && det.confidence >= confFloor && hasSignals;

  chrome.runtime
    .sendMessage({
      type: "applyai.action.state",
      payload: { state: actionable ? "detected" : "default" },
    })
    .catch(() => {});
});
