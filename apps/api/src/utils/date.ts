import * as chrono from "chrono-node";
import { clamp01 } from "../utils/text.js";

const monthRegex =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/iu;

export function looksLikeDateLine(line: string) {
  return (
    monthRegex.test(line) ||
    /\b\d{4}\b/.test(line) ||
    /(present|current)/i.test(line)
  );
}

export function parseDateRange(input: string) {
  // Try to parse ranges like "Jan 2020 – Mar 2022", "2019-2021", "2020 - Present"
  const parts = input
    .replace(/[—–]/g, "-")
    .split(/\bto\b|\-|–|—/i)
    .map((s) => s.trim())
    .filter(Boolean);

  let startStr: string | undefined;
  let endStr: string | undefined;
  let isCurrent = false;

  if (parts.length >= 1) {
    const start = chrono.parseDate(parts[0]);
    if (start) startStr = start.toISOString().slice(0, 10);
  }
  if (parts.length >= 2) {
    if (/present|current/i.test(parts[1])) {
      isCurrent = true;
    } else {
      const end = chrono.parseDate(parts[1]);
      if (end) endStr = end.toISOString().slice(0, 10);
    }
  }

  const conf = clamp01((startStr ? 0.5 : 0) + (endStr || isCurrent ? 0.5 : 0));
  return { start: startStr, end: endStr, isCurrent, confidence: conf };
}
