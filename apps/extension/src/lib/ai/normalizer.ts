// Heuristic JD normalizer: fast, deterministic, zero-AI.
// Splits into responsibilities, requirements, niceToHaves and extracts bullet lines.

export interface NormalizedJD {
  raw: string;
  titleGuess?: string;
  companyGuess?: string;
  responsibilities: string[];
  requirements: string[];
  niceToHaves: string[];
  keywords: string[]; // deduped normalized keywords for matching
}

const HEADING_RESP =
  /responsibilit|what you'll do|what you will do|duties|you will/i;
const HEADING_REQ =
  /requirement|qualification|must[-\s]?have|you have|about you/i;
const HEADING_NTH = /nice[-\s]?to[-\s]?have|preferred|bonus|good to have/i;

const STOPWORDS = new Set([
  "and",
  "or",
  "the",
  "a",
  "an",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "by",
  "as",
  "at",
  "be",
  "is",
  "are",
  "this",
  "that",
  "our",
  "your",
  "we",
  "you",
  "will",
  "ability",
  "etc",
  "including",
  "such",
  "using",
  "use",
  "years",
  "year",
  "plus",
  "within",
  "across",
]);

function normalizeToken(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9+#.\-]/g, "");
}

function explodeKeywords(text: string): string[] {
  const raw = text
    .replace(/[\u2022\u25CF\u25A0•▪︎►]/g, " ")
    .replace(/[()/:,;|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");
  const out: string[] = [];
  for (const r of raw) {
    const k = normalizeToken(r);
    if (!k || k.length <= 2 || STOPWORDS.has(k)) continue;
    out.push(k);
  }
  // Dedup while preserving order
  return Array.from(new Set(out));
}

function splitBullets(block: string): string[] {
  return block
    .split(/\n+/)
    .flatMap((l) => l.split(/[•\u2022\u25CF\u25A0\-–—]\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normalizeJD(
  jdHtmlOrText: string,
  fallbackTitle?: string,
  fallbackCompany?: string,
): NormalizedJD {
  // Strip HTML tags if present (very cheap)
  const text = jdHtmlOrText
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  const lines = text.split("\n").map((s) => s.trim());
  const sections: Record<
    "responsibilities" | "requirements" | "niceToHaves" | "other",
    string[]
  > = {
    responsibilities: [],
    requirements: [],
    niceToHaves: [],
    other: [],
  };

  let mode: keyof typeof sections = "other";
  for (const ln of lines) {
    const l = ln.toLowerCase();
    if (HEADING_RESP.test(l)) {
      mode = "responsibilities";
      continue;
    }
    if (HEADING_REQ.test(l)) {
      mode = "requirements";
      continue;
    }
    if (HEADING_NTH.test(l)) {
      mode = "niceToHaves";
      continue;
    }
    sections[mode].push(ln);
  }

  const resp = splitBullets(sections.responsibilities.join("\n"));
  const reqs = splitBullets(sections.requirements.join("\n"));
  const nth = splitBullets(sections.niceToHaves.join("\n"));

  const keywords = explodeKeywords(
    [
      resp.join(" "),
      reqs.join(" "),
      nth.join(" "),
      sections.other.join(" "),
    ].join(" "),
  );

  // weak guesses
  const titleGuess = fallbackTitle;
  const companyGuess = fallbackCompany;

  return {
    raw: text,
    titleGuess,
    companyGuess,
    responsibilities: resp,
    requirements: reqs,
    niceToHaves: nth,
    keywords,
  };
}
