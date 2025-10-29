import crypto from "node:crypto";

export const sha256 = (buf: Buffer) =>
  crypto.createHash("sha256").update(buf).digest("hex");

export const normalizeWhitespace = (s: string) =>
  s
    .replace(/\u00A0/g, " ")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \u200B\u200C\u200D]+/g, " ")
    .trim();

export const toLines = (s: string) =>
  normalizeWhitespace(s)
    .split(/\r?\n/)
    .map((l) => l.trim());

export const compact = <T>(arr: (T | null | undefined)[]) =>
  arr.filter(Boolean) as T[];

export const uniq = (arr: string[]) =>
  Array.from(new Set(arr.map((a) => a.trim())));

export const bulletize = (lines: string[]) =>
  lines.map((l) => l.replace(/^[-–—•·◦\*]\s{0,2}/, "").trim());

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
