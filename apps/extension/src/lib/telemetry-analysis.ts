// Telemetry for E02
export interface AnalysisTelemetry {
  kind: "job_analysis_v1";
  url: string;
  domain: string;
  latencyMs: number;
  tokensIn?: number;
  tokensOut?: number;
  model?: string;
  score: number;
  reqHit?: number;
  reqTotal?: number;
  nthHit?: number;
  nthTotal?: number;
  ts: number;
}

const BUCKET = "applyai.telemetryBuffer.v1";

export async function emitAnalysisTelemetry(ev: AnalysisTelemetry) {
  try {
    const { [BUCKET]: arr = [] } = await chrome.storage.local.get(BUCKET);
    arr.push(ev);
    await chrome.storage.local.set({ [BUCKET]: arr.slice(-500) });
    chrome.runtime
      .sendMessage({ type: "applyai.telemetry.analysis", payload: ev })
      .catch(() => {});
  } catch {
    /* noop */
  }
}
