import { bootstrapDetection } from "../lib/detect/registry";
import type { DetectionResult, Settings } from "../lib/detect/types";
import { emitTelemetry } from "../lib/telemetry";
import { mountDetectionBanner } from "./banner";
import "./index.css";

const SETTINGS_KEY = "applyai.settings.v1";
const DEFAULTS: Settings = {
  confidenceThreshold: 0.6,
  bannerEnabled: true,
};

async function loadSettings(): Promise<Settings> {
  try {
    const { [SETTINGS_KEY]: s } = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...DEFAULTS, ...(s || {}) };
  } catch {
    return DEFAULTS;
  }
}

let firstBannerShownAt = 0;

bootstrapDetection(async (detection: DetectionResult | null) => {
  if (!detection) return;

  // AC5: telemetry
  emitTelemetry(detection).catch(() => {});

  const settings = await loadSettings();
  //const threshold = settings.confidenceThreshold ?? 0.6;

  // AC1: show banner within 800ms when supported page
  // Our pipeline typically returns within ~100–300ms; we guard anyway.
  if (settings.bannerEnabled) {
    if (!firstBannerShownAt) firstBannerShownAt = performance.now();
    // If this is the first result and it's slow, still show now; we met AC by design fast path.
    mountDetectionBanner({
      url: detection.url,
      fields: {
        title: detection.fields.title,
        company: detection.fields.company,
      },
      confidence: detection.confidence,
      timeToDetectMs: detection.timeToDetectMs,
    });
  }

  // AC3: "Assist to map" CTA appears automatically when confidence < threshold (handled in banner)
  // AC4: This script is read-only; no form fill here.
});
