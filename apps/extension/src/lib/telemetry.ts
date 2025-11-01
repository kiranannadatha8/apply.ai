import type { DetectionResult, TelemetryEvent, Settings } from "./detect/types";

const STORAGE_KEY = "applyai.telemetryBuffer.v1";
const SETTINGS_KEY = "applyai.settings.v1";

async function getSettings(): Promise<Settings> {
  try {
    const { [SETTINGS_KEY]: s } = await chrome.storage.local.get(SETTINGS_KEY);
    return s || {};
  } catch {
    return {};
  }
}

async function bufferEvent(ev: TelemetryEvent) {
  const { [STORAGE_KEY]: buf = [] } =
    await chrome.storage.local.get(STORAGE_KEY);
  buf.push(ev);
  await chrome.storage.local.set({ [STORAGE_KEY]: buf.slice(-500) }); // cap
}

export async function emitTelemetry(det: DetectionResult) {
  const ev: TelemetryEvent = {
    kind: "job_detection_v1",
    domain: new URL(det.url).hostname,
    detectorId: det.board,
    detectorVersion: det.version,
    confidence: det.confidence,
    timeToDetectMs: det.timeToDetectMs,
    url: det.url,
    ts: det.timestamp,
  };

  await bufferEvent(ev);

  const settings = await getSettings();
  if (settings.telemetryEndpoint) {
    // Best-effort beacon from content context
    try {
      const payload = JSON.stringify(ev);
      // navigator.sendBeacon is available in page context; in content, use fetch keepalive
      fetch(settings.telemetryEndpoint, {
        method: "POST",
        body: payload,
        headers: { "content-type": "application/json" },
        keepalive: true,
        mode: "no-cors", // fire-and-forget
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }

  // Also notify background (for debugging / devtools logging)
  chrome.runtime
    .sendMessage({ type: "applyai.telemetry", payload: ev })
    .catch(() => {});
}
