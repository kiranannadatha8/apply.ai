export type SupportedBoard =
  | "greenhouse"
  | "lever"
  | "workday"
  | "ashby"
  | "smartrecruiters"
  | "taleo"
  | "indeed"
  | "linkedin"
  | "bamboohr"
  | "icims"
  | "generic";

export interface JobFields {
  title?: string;
  company?: string;
  location?: string;
  description?: string; // raw HTML allowed
  applyUrl?: string;
  postingDate?: string; // ISO if possible
}

export interface DetectorContext {
  url: URL;
  doc: Document;
  startedAt: number;
  abortSignal?: AbortSignal;
}

export interface Detector {
  id: SupportedBoard;
  // Fast URL heuristics (cheap)
  urlMatch: (url: URL) => boolean;
  // Optional DOM signature to confirm detail page (cheap)
  isJobDetail?: (ctx: DetectorContext) => boolean;
  // Extraction (may be multi-pass, but must be fast)
  extract: (ctx: DetectorContext) => Partial<JobFields>;
  // Optional: additional signals for scoring
  signatureScore?: (ctx: DetectorContext) => number; // 0..1
  version?: string; // override global version if needed
}

export interface DetectionResult {
  board: SupportedBoard;
  version: string;
  url: string;
  fields: JobFields;
  confidence: number; // 0..1
  timeToDetectMs: number;
  timestamp: number;
}

export interface TelemetryEvent {
  kind: "job_detection_v1";
  domain: string;
  detectorId: SupportedBoard;
  detectorVersion: string;
  confidence: number;
  timeToDetectMs: number;
  url: string;
  ts: number;
}

export interface Settings {
  telemetryEndpoint?: string; // optional remote endpoint
  confidenceThreshold?: number; // default 0.6
  bannerEnabled?: boolean; // default true
}
