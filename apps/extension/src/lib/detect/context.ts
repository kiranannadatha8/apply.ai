import type { DetectionResult } from "./types";

let currentDetection: DetectionResult | null = null;

export function setCurrentDetection(det: DetectionResult | null) {
  currentDetection = det;
  document.dispatchEvent(new CustomEvent("applyai:detection", { detail: det }));
}

export function getCurrentDetection(): DetectionResult | null {
  return currentDetection;
}
