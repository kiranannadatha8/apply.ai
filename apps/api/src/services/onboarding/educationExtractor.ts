import { EducationItem, Scored } from "../../types/onboarding.types";
import { parseDateRange, looksLikeDateLine } from "../../utils/date";

// --- FIX: Improved Regex ---
// This regex stops at a comma, newline, or an open-parenthesis
// to avoid consuming the (GPA...) part.
const DEGREE_RE =
  /\b(B\.?Sc\.?|B\.?Eng\.?|B\.?Tech\.?|B\.?E\.?|M\.?Sc\.?|M\.?Eng\.?|M\.?Tech\.?|M\.?S\.?|Ph\.?D\.?|Bachelor|Master|Doctor)\b[^\n,(]*/i;

// This regex now correctly captures GPA from formats like (GPA: 4.00 / 4.00)
const GPA_RE =
  /\bGPA\s*[:=]?\s*([0-4]\.[0-9]{1,2})(?:\s*\/\s*[0-4]\.[0-9]{1,2})?/i;

// This regex now allows ampersands (&) for majors
const MAJOR_RE = /(?:in|major(?:ing)?\s+in)\s+([A-Za-z\s&]+)/i;

// --- FIX: Rebuilt Function Logic ---
export function extractEducation(lines: string[]): EducationItem[] {
  const items: EducationItem[] = [];

  // 1. Find the start lines of each education item.
  // We assume a line with a date is the *start* of an item.
  const itemStartIndices = lines
    .map((l, i) => (looksLikeDateLine(l) ? i : -1))
    .filter((i) => i !== -1);

  const mk = <T>(v: T | null, c: number): Scored<T> => ({
    value: v,
    confidence: c,
    source: "rule",
  });

  // 2. Process each "block" of text
  for (let i = 0; i < itemStartIndices.length; i++) {
    const start = itemStartIndices[i];
    // The block ends where the *next* item starts, or at the end of the lines
    const end = itemStartIndices[i + 1] || lines.length;
    const blockLines = lines.slice(start, end);

    if (blockLines.length === 0) continue;

    // --- 3. Extract data from the block ---
    const dateLine = blockLines[0];
    const blockText = blockLines.join(" \n "); // Join all lines for easy regex matching

    // Extract Dates
    const dates = parseDateRange(dateLine);

    // Extract Institution
    // Heuristic: The institution is everything on the first line *before* the month name.
    const inst = (
      dateLine.split(
        /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i,
      )[0] || ""
    ).trim();

    // Extract Degree
    const degreeMatch = blockText.match(DEGREE_RE);
    const degreeRaw = (degreeMatch ? degreeMatch[0] : "").trim();

    // Extract Major
    const majorMatch = blockText.match(MAJOR_RE);
    // Use group 1, which is the text *after* "in"
    const majorRaw = (majorMatch ? majorMatch[1] : "").trim();

    // Extract GPA
    const gpaMatch = blockText.match(GPA_RE);
    // Use group 1, which is the GPA value
    const gpaRaw = (gpaMatch ? gpaMatch[1] : "").trim();

    items.push({
      institutionRaw: inst,
      degreeRaw,
      institution: mk(inst || null, inst ? 0.9 : 0),
      degree: mk(degreeRaw || null, degreeRaw ? 0.85 : 0),
      // FIX: Give major a confidence score if found
      major: mk(majorRaw || null, majorRaw ? 0.8 : 0),
      gpa: mk(gpaRaw || null, gpaRaw ? 0.9 : 0),
      dates: {
        start: dates.start,
        end: dates.end,
        isCurrent: dates.isCurrent,
        confidence: dates.confidence,
        source: "rule",
      },
    });
  }

  return items;
}
