import { ExperienceItem, Scored } from "../../types/onboarding.types";
import { parseDateRange, looksLikeDateLine } from "../../utils/date";
import { bulletize } from "../../utils/text.js";

// We no longer need HEADER_PATTERNS

export function extractExperience(
  blocks: { lines: string[] }[],
): ExperienceItem[] {
  const items: ExperienceItem[] = [];

  for (const b of blocks) {
    // A valid experience block needs at least 2 lines for the header
    if (b.lines.length < 2) continue;

    // --- FIX 1: Parse the multi-line header ---

    // Line 1: "Software AG Jan 2023 – Dec 2023"
    const line1 = b.lines[0];
    // Line 2: "Software Engineer Bangalore, India"
    const line2 = b.lines[1];

    // Extract Dates and Company from Line 1
    const datesParsed = parseDateRange(line1);
    const companyRaw = datesParsed.start
      ? line1.replace(datesParsed.start, "").trim()
      : line1.trim();

    // Extract Title and Location from Line 2
    // We assume location is a "City, Country" or "City, ST" at the end.
    const locMatch = line2.match(/([A-Za-z\s]+,\s*[A-Za-z\s]+)$/i);
    const locationRaw = locMatch ? locMatch[1].trim() : null;
    const titleRaw = locMatch
      ? line2.replace(locMatch[0], "").trim()
      : line2.trim();

    // --- END FIX 1 ---

    // --- FIX 2: Correct bullet extraction ---

    // Bullets start on the 3rd line (index 2)
    const bulletStartIdx = 2;
    const bulletLines = b.lines.slice(bulletStartIdx);

    const bullets = bulletize(bulletLines).filter((s) => s.length > 2);

    // --- END FIX 2 ---

    const mk = <T>(v: T | null, conf: number): Scored<T> => ({
      value: v,
      confidence: conf,
      source: "rule",
    });

    items.push({
      titleRaw,
      companyRaw,
      title: mk(titleRaw || null, titleRaw ? 0.9 : 0),
      company: mk(companyRaw || null, companyRaw ? 0.9 : 0),
      location: mk(locationRaw || null, locationRaw ? 0.6 : 0), // Give confidence if found
      dates: {
        start: datesParsed.start,
        end: datesParsed.end,
        isCurrent: datesParsed.isCurrent,
        confidence: datesParsed.confidence,
        source: "rule",
      },
      bullets: mk(bullets, bullets.length ? 0.85 : 0),
    });
  }
  return items;
}
