import { search } from "fast-fuzzy";
import { SectionSpan } from "../../types/onboarding.types";

const SECTION_ALIASES: Record<string, string[]> = {
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment",
    "work history",
  ],
  education: ["education", "academic", "academics", "education & training"],
  projects: ["projects", "personal projects", "academic projects"],
  skills: ["skills", "technical skills", "technologies", "tech stack"],
  summary: ["summary", "profile", "objective", "about me"],
};

const aliasToNormMap = new Map<string, string>();
for (const [normName, aliases] of Object.entries(SECTION_ALIASES)) {
  for (const alias of aliases) {
    aliasToNormMap.set(alias, normName);
  }
}
const allSectionNames = [...aliasToNormMap.keys()];

export function detectSections(lines: string[]): SectionSpan[] {
  const candidates: { idx: number; text: string }[] = [];

  lines.forEach((line, i) => {
    // We use two "clean" strings:
    // 1. cleanForTest: For checking style (case, word count)
    // 2. cleanForMatch: For fuzzy matching (lowercase, no special chars)
    const cleanForTest = line.replace(/[^A-Za-z ]/g, "").trim();
    const cleanForMatch = line
      .replace(/[^A-Za-z &]/g, "")
      .trim()
      .toLowerCase();

    if (cleanForTest.length === 0 || cleanForTest.length > 40) {
      return;
    }

    // --- MAIN FIX: Tighter isHeaderish logic ---
    // A header is either ALL CAPS (e.g., "SKILLS")
    const isAllCaps = cleanForTest === cleanForTest.toUpperCase();
    // Or it's a short Title-Case line (e.g., "Technical Skills")
    const wordCount = cleanForTest.split(/\s+/).length;
    const isShortHeader = wordCount <= 3;

    // This check replaces the overly-permissive Title Case regex.
    // It now filters out long lines like "Software Engineer Bangalore, India"
    const isHeaderish =
      (isAllCaps || isShortHeader) && /[A-Za-z]/.test(cleanForTest);
    // --- END FIX ---

    if (isHeaderish) {
      candidates.push({ idx: i, text: cleanForMatch });
    }
  });

  const spans: SectionSpan[] = [];
  for (const c of candidates) {
    const matches = search(c.text, allSectionNames, { returnMatchData: true });

    // Skip if fuzzy search found no good matches
    if (!matches || matches.length === 0) {
      continue;
    }

    const best = matches[0];
    // Use best.item for fast-fuzzy v2, fallback to best.key for v1
    const bestKey = (best as any).item || (best as any).key;
    const score = Math.min(1, Math.max(0, best.score));

    // --- IMPROVEMENT: Use the Map for normalization ---
    const normName = aliasToNormMap.get(bestKey);

    // Filter out low-score matches (e.g., "Kiran Annadata" matching "academic")
    // and ensure we found a normalized name
    if (score >= 0.45 && normName) {
      spans.push({
        name: normName,
        startLine: c.idx,
        endLine: lines.length,
        score,
      });
    }
  }

  // Sort by startLine and cap endLine to next header start
  spans.sort((a, b) => a.startLine - b.startLine);
  for (let i = 0; i < spans.length; i++) {
    spans[i].endLine = spans[i + 1]?.startLine ?? lines.length;
  }
  return spans;
}
