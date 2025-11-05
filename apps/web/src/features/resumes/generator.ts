import type {
  ResumeRecord,
  ResumeSection,
  ResumeSectionKind,
  SectionSuggestion,
  VariantDraft,
  VariantGenerationInput,
} from "./types";

const STOP_WORDS = new Set(
  [
    "the",
    "and",
    "for",
    "with",
    "that",
    "from",
    "this",
    "will",
    "have",
    "your",
    "about",
    "into",
    "within",
    "across",
    "their",
    "they",
    "looking",
    "seeking",
    "experience",
    "skills",
    "responsibilities",
    "requirements",
    "team",
    "works",
    "work",
    "ability",
    "strong",
    "preferred",
    "job",
    "role",
    "minimum",
    "years",
    "plus",
    "must",
    "ability",
    "our",
    "we",
    "you",
    "your",
    "are",
    "who",
    "per",
    "performs",
    "permanent",
    "acumen",
    "drive",
    "deliver",
    "support",
  ].map((word) => word.toLowerCase()),
);

const PROCESSING_DELAY_MS = 1200;

function toTitleCase(word: string) {
  return word
    .split(/[\s-]+/)
    .map((segment) =>
      segment.length <= 2
        ? segment.toUpperCase()
        : segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
    )
    .join(" ");
}

function formatList(values: string[], conjunction = "and") {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} ${conjunction} ${values[1]}`;
  const head = values.slice(0, -1).join(", ");
  return `${head}, ${conjunction} ${values[values.length - 1]}`;
}

function lowercaseKeyword(keyword: string) {
  if (!keyword) return keyword;
  if (/^[A-Z0-9]+$/.test(keyword)) {
    return keyword;
  }
  return keyword.charAt(0).toLowerCase() + keyword.slice(1);
}

export function extractKeywords(text: string, limit = 12): string[] {
  const counts = new Map<string, number>();
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const ranked = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => toTitleCase(token));
  return ranked.slice(0, limit);
}

interface ParsedContext {
  title?: string;
  company?: string;
  location?: string;
}

export function guessJobContext(
  jobDescription: string,
  keywords: string[],
): ParsedContext {
  const lines = jobDescription
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const context: ParsedContext = {};

  for (const line of lines) {
    if (!context.company) {
      const companyMatch = line.match(/company[:-]\s*(.+)$/i);
      if (companyMatch) {
        context.company = companyMatch[1].trim();
      }
    }
    if (!context.title) {
      const titleMatch = line.match(
        /(role|title|position)[:-]\s*(.+)$/i,
      );
      if (titleMatch) {
        context.title = titleMatch[2].trim();
      }
    }
    if (!context.location) {
      const locationMatch = line.match(/location[:-]\s*(.+)$/i);
      if (locationMatch) {
        context.location = locationMatch[1].trim();
      }
    }
    if (context.company && context.title && context.location) break;
  }

  if (!context.title && lines.length) {
    const header = lines[0];
    if (header.length <= 90) {
      const atMatch = header.match(/(.+?)\s+@+\s*(.+)$/);
      if (atMatch) {
        context.title = atMatch[1].trim();
        context.company = context.company ?? atMatch[2].trim();
      } else {
        const hiringMatch = header.match(/hiring\s+(an?|the)\s+(.+)/i);
        if (hiringMatch) {
          context.title = hiringMatch[2].trim();
        } else {
          context.title = header;
        }
      }
    }
  }

  if (!context.company) {
    const keywordCompany = keywords.find((keyword) =>
      /(Labs|Studio|Systems|Inc|LLC|Corporation|Technologies|Company|Group|Holdings|Services|Works)$/i.test(
        keyword,
      ),
    );
    if (keywordCompany) context.company = keywordCompany;
  }

  return context;
}

function buildSummarySuggestions(
  section: ResumeSection,
  keywords: string[],
  context: ParsedContext,
): SectionSuggestion[] {
  const focus = keywords.slice(0, 3);
  if (!focus.length) return [];
  const summaryLine = context.title
    ? `${context.title} candidate`
    : "Candidate";
  const companyClause = context.company ? ` for ${context.company}` : "";
  const addition = `${summaryLine} emphasizing ${formatList(
    focus.map((kw) => lowercaseKeyword(kw)),
  )}${companyClause}, translating research into production impact.`;
  return [
    {
      id: crypto.randomUUID(),
      sectionId: section.id,
      changeType: "addition",
      summary: `Center the summary on ${formatList(focus)}.`,
      content: [addition],
      status: "pending",
      keywords: focus,
      rationale: `The job description highlights ${formatList(
        focus,
      )}; weaving them into the opener keeps the resume aligned.`,
    },
  ];
}

function buildExperienceSuggestions(
  section: ResumeSection,
  keywords: string[],
  context: ParsedContext,
): SectionSuggestion[] {
  if (!keywords.length) return [];
  const [primary, secondary, tertiary] = [
    keywords[0],
    keywords[1],
    keywords[2],
  ];
  const org = context.company ? `${context.company}` : "the target team";
  const role = context.title
    ? context.title.toLowerCase()
    : "this role";
  const additions: string[] = [];
  if (primary) {
    additions.push(
      `Owned ${primary.toLowerCase()} initiatives in partnership with stakeholders at ${org}, unlocking measurable impact for the ${role}.`,
    );
  }
  if (secondary) {
    additions.push(
      `Piloted a cross-functional program centered on ${secondary.toLowerCase()}, pairing rapid experimentation with responsible deployment.`,
    );
  }
  if (tertiary) {
    additions.push(
      `Documented reusable playbooks that accelerated adoption of ${tertiary.toLowerCase()} practices across product pods.`,
    );
  }
  const filtered = additions.filter(Boolean);
  if (!filtered.length) return [];
  return [
    {
      id: crypto.randomUUID(),
      sectionId: section.id,
      changeType: "addition",
      summary: `Add bullet points featuring ${formatList(
        filtered.map((_, idx) => keywords[idx] ?? ""),
      )}.`,
      content: filtered,
      status: "pending",
      keywords: keywords.slice(0, filtered.length),
      rationale:
        "Additional impact bullets surface the role-specific themes the JD calls out.",
    },
  ];
}

function buildSkillsSuggestions(
  section: ResumeSection,
  keywords: string[],
): SectionSuggestion[] {
  const existing = new Set(
    section.content.map((value) => value.toLowerCase()),
  );
  const candidates = keywords
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword && !existing.has(keyword.toLowerCase()))
    .slice(0, 6);

  if (!candidates.length) return [];
  return [
    {
      id: crypto.randomUUID(),
      sectionId: section.id,
      changeType: "addition",
      summary: `Append ${formatList(candidates)} to the skills section.`,
      content: candidates,
      status: "pending",
      keywords: candidates,
      rationale:
        "These keywords appear repeatedly in the JD and improve ATS alignment.",
    },
  ];
}

function buildEducationSuggestions(): SectionSuggestion[] {
  return [];
}

function buildSuggestionsForSections(
  sections: ResumeSection[],
  sectionsToAdapt: ResumeSectionKind[],
  keywords: string[],
  context: ParsedContext,
): SectionSuggestion[] {
  const all: SectionSuggestion[] = [];
  for (const section of sections) {
    if (!sectionsToAdapt.includes(section.kind)) continue;
    let suggestions: SectionSuggestion[] = [];
    switch (section.kind) {
      case "summary":
        suggestions = buildSummarySuggestions(section, keywords, context);
        break;
      case "experience_bullets":
        suggestions = buildExperienceSuggestions(section, keywords, context);
        break;
      case "skills":
        suggestions = buildSkillsSuggestions(section, keywords);
        break;
      case "education":
        suggestions = buildEducationSuggestions();
        break;
      default:
        suggestions = [];
    }
    if (suggestions.length) {
      all.push(...suggestions);
    }
  }
  return all;
}

function cloneSections(sections: ResumeSection[]): ResumeSection[] {
  return sections.map((section) => ({
    ...section,
    content: [...section.content],
  }));
}

function deriveDefaultVariantName(
  context: ParsedContext,
  timestampIso: string,
): string {
  if (context.company) {
    return `Variant for ${context.company}`;
  }
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestampIso));
  return `Untitled Variant – ${formatted}`;
}

export async function generateVariantDraft(
  input: VariantGenerationInput,
  baseResume: ResumeRecord,
): Promise<VariantDraft> {
  const timestamp = new Date().toISOString();
  const keywords = extractKeywords(input.jobDescription, 12);
  const parsedContext = guessJobContext(input.jobDescription, keywords);
  const sections = cloneSections(baseResume.sections);
  const suggestions = buildSuggestionsForSections(
    sections,
    input.sectionsToAdapt,
    keywords,
    parsedContext,
  );
  await new Promise((resolve) => setTimeout(resolve, PROCESSING_DELAY_MS));
  const name =
    input.presetVariantName ??
    deriveDefaultVariantName(parsedContext, timestamp);
  return {
    id: `draft-${crypto.randomUUID()}`,
    name,
    baseResumeId: baseResume.id,
    createdAt: timestamp,
    jobDescription: input.jobDescription,
    jobContext: {
      ...parsedContext,
      keywords,
    },
    sections,
    suggestions,
    sectionsToAdapt: input.sectionsToAdapt,
  };
}

export function buildVariantSectionsFromDraft(
  draft: VariantDraft,
  opts?: { includePending?: boolean },
): ResumeSection[] {
  const includePending = opts?.includePending ?? false;
  const suggestionsBySection = draft.suggestions.reduce<
    Record<string, SectionSuggestion[]>
  >((acc, suggestion) => {
    if (!acc[suggestion.sectionId]) {
      acc[suggestion.sectionId] = [suggestion];
    } else {
      acc[suggestion.sectionId].push(suggestion);
    }
    return acc;
  }, {});

  return draft.sections.map((section) => {
    const next: ResumeSection = {
      ...section,
      content: [...section.content],
    };
    const suggestions = suggestionsBySection[section.id] ?? [];
    for (const suggestion of suggestions) {
      if (
        suggestion.status === "accepted" ||
        (includePending && suggestion.status === "pending")
      ) {
        if (suggestion.changeType === "addition") {
          next.content = [...next.content, ...suggestion.content];
        } else if (suggestion.changeType === "replacement") {
          next.content = [...suggestion.content];
        }
      }
    }
    return next;
  });
}
