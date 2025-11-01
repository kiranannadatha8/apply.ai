import type { JobFields } from "./types";
import { clamp01 } from "./utils";

export interface ScoreInput {
  urlMatched: boolean;
  hasJsonLd: boolean;
  signatureScore?: number; // 0..1
  fields: JobFields;
}

export function scoreDetection(input: ScoreInput): number {
  let s = 0;

  // URL match is a strong prior but not decisive
  s += input.urlMatched ? 0.35 : 0;

  // JSON-LD is very reliable
  s += input.hasJsonLd ? 0.35 : 0;

  // Presence of critical fields
  const haveTitle = !!input.fields.title;
  const haveCompany = !!input.fields.company;
  const haveDesc = !!(
    input.fields.description && input.fields.description.length > 60
  );
  const haveLoc = !!input.fields.location;

  s += haveTitle ? 0.12 : 0;
  s += haveCompany ? 0.1 : 0;
  s += haveDesc ? 0.1 : 0;
  s += haveLoc ? 0.03 : 0;

  // Site-specific DOM signatures
  s += (input.signatureScore ?? 0) * 0.15;

  return clamp01(s);
}
