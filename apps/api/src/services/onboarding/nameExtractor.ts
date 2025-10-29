import { Scored } from "../../types/onboarding.types";

export function refineName(candidate: Scored<string>): Scored<string> {
  if (!candidate.value) return candidate;
  const v = candidate.value
    .replace(/\b(RESUME|CURRICULUM VITAE|CV)\b/i, "")
    .replace(/[^A-Za-z ,.'-]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  const conf = v
    ? Math.min(1, candidate.confidence + 0.05)
    : candidate.confidence;
  return { ...candidate, value: v || candidate.value, confidence: conf };
}
