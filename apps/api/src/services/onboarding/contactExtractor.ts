import { compact, uniq } from "../../utils/text";
import { Scored } from "../../types/onboarding.types";
import { findPhoneNumbersInText, type NumberFound } from "libphonenumber-js";

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const URL_RE =
  /\b(?:(?:https?:\/\/)?(?:[\w-]+\.)+(?:com|org))(?:\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?\b/gi;

export function extractEmail(text: string): Scored<string> {
  const m = text.match(EMAIL_RE);
  return { value: m?.[0] || null, confidence: m ? 0.99 : 0, source: "rule" };
}

export function extractLinks(text: string): Scored<string[]> {
  const matches = text.match(new RegExp(URL_RE, "gi")) || [];
  const links = uniq(
    matches.map((m) => (m.startsWith("http") ? m : `https://${m}`)),
  );
  return { value: links, confidence: links.length ? 0.95 : 0, source: "rule" };
}

export function extractPhone(text: string): Scored<string> {
  // Try multiple slices (top block typically contains phone)
  const result: NumberFound[] = findPhoneNumbersInText(text);
  if (result.length) {
    return {
      value: result[0].number.toString(),
      confidence: 0.95,
      source: "rule",
    };
  }
  // fallback: raw digit grab
  const raw = (text.match(
    /(?<!\d)(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}(?!\d)/,
  ) || [])[0];
  return { value: raw || null, confidence: raw ? 0.7 : 0, source: "rule" };
}

export function extractName(text: string, emailHint?: string): Scored<string> {
  const top = text
    .split(/\n/)
    .slice(0, 8)
    .map((s) => s.trim())
    .filter(Boolean);
  // Prefer all-caps or title case first line if it's likely a name
  const likely = top.find(
    (l) => /\b[A-Za-z]{2,}\b/.test(l) && !EMAIL_RE.test(l) && l.length <= 60,
  );
  let candidate = likely || "";

  // Heuristic: if email is john.doe@..., use prefix parts
  if (!candidate && emailHint) {
    const local = emailHint.split("@")[0].replace(/[\d_]+/g, " ");
    const parts = local
      .split(/[._\- ]+/)
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase() + p.slice(1));
    if (parts.length >= 2) candidate = parts.slice(0, 2).join(" ");
  }

  const value = candidate || null;
  const conf = value ? 0.85 : 0;
  return { value, confidence: conf, source: "rule" };
}

export function extractLocation(text: string): Scored<string> {
  // Combined regex to find "City, ST" OR "City, Country"
  const locationRegex = /\b[A-Z][a-zA-Z]+,\s*(?:[A-Z]{2}|[A-Z][a-zA-Z]+)\b/;

  const lines = text.split(/\n/).slice(0, 25);

  for (const line of lines) {
    // Use .match() to find the specific pattern in the line
    const match = line.match(locationRegex);

    if (match) {
      // If a match is found, match[0] is the extracted text (e.g., "Fairfax, VA")
      return { value: match[0], confidence: 0.75, source: "rule" };
    }
  }

  // No location found in any of the lines
  return { value: null, confidence: 0, source: "rule" };
}
