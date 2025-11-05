import type { NormalizedProfile } from "../autofill/profile";
import { nanoid, normalizeSpaces } from "../autofill/utils";
import type { DetectionResult } from "../detect/types";
import type {
  AnswerCitation,
  JobAnswerArtifact,
  TonePreset,
} from "../storage/jobStore";

const DEFAULT_MAX_WORDS = 200;
const CONFIDENTIAL_PATTERNS = [
  /\bssn\b/i,
  /\bsocial security\b/i,
  /\bpassport\b/i,
  /\bvisa number\b/i,
  /\bcredit card\b/i,
  /\bsecurity clearance\b/i,
  /\bconfidential\b/i,
];

const DIGIT_SCRUB = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g; // SSN style
const EMAIL_SCRUB =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_SCRUB =
  /\b(?:\+?\d{1,2}\s?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}\b/g;

export interface PreviousAnswer {
  question: string;
  answer: string;
}

export interface AssistantPromptContext {
  question: string;
  tone: TonePreset;
  fieldLabel?: string;
  maxWords?: number;
  maxChars?: number;
  detection?: DetectionResult | null;
  profile: NormalizedProfile | null;
  previousAnswers?: PreviousAnswer[];
  fieldPlaceholder?: string;
  fieldLimitHint?: string;
  jobRecordSummary?: {
    missingKeywords: string[];
    topSkills: string[];
  };
}

export interface AssistantGenerationResult {
  answer: string;
  citations: AnswerCitation[];
  usage: {
    tokensIn: number;
    tokensOut: number;
    durationMs: number;
    model: "fallback";
    from: "fallback";
  };
  warnings: string[];
}

interface ResumeSection {
  id: string;
  section: AnswerCitation["section"];
  label: string;
  content: string;
  keywords: string[];
}

function toWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function buildResumeSections(profile: NormalizedProfile | null): ResumeSection[] {
  if (!profile) return [];
  const sections: ResumeSection[] = [];
  if (profile.summary) {
    sections.push({
      id: nanoid(),
      section: "summary",
      label: "Professional Summary",
      content: profile.summary,
      keywords: toWords(profile.summary),
    });
  }
  if (Array.isArray(profile.experience)) {
    profile.experience.forEach((exp, idx) => {
      const lines = [
        exp.role,
        exp.company,
        exp.description,
      ]
        .filter(Boolean)
        .join(" – ");
      if (!lines) return;
      sections.push({
        id: nanoid(),
        section: "experience",
        label: [exp.role, exp.company].filter(Boolean).join(" @ ") ||
          `Experience ${idx + 1}`,
        content: lines,
        keywords: toWords(lines),
      });
    });
  }
  if (Array.isArray(profile.education)) {
    profile.education.forEach((edu, idx) => {
      const lines = [
        edu.degree,
        edu.school,
        edu.description,
      ]
        .filter(Boolean)
        .join(" – ");
      if (!lines) return;
      sections.push({
        id: nanoid(),
        section: "education",
        label: [edu.degree, edu.school].filter(Boolean).join(" – ") ||
          `Education ${idx + 1}`,
        content: lines,
        keywords: toWords(lines),
      });
    });
  }
  if (Array.isArray(profile.skills) && profile.skills.length) {
    const content = profile.skills.join(", ");
    sections.push({
      id: nanoid(),
      section: "skill",
      label: "Skills",
      content,
      keywords: toWords(content),
    });
  }
  if (profile.custom) {
    Object.entries(profile.custom).forEach(([key, value]) => {
      const text =
        typeof value === "string"
          ? value
          : Array.isArray(value)
            ? value.join(", ")
            : "";
      if (!text) return;
      sections.push({
        id: nanoid(),
        section: "custom",
        label: key,
        content: text,
        keywords: toWords(text),
      });
    });
  }
  return sections;
}

function extractJobKeywords(det: DetectionResult | null | undefined): string[] {
  if (!det?.fields?.description) return [];
  const text = det.fields.description
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 16000);
  return Array.from(new Set(toWords(text))).slice(0, 120);
}

function scoreSection(
  questionWords: string[],
  jobWords: string[],
  section: ResumeSection,
): number {
  const set = new Set(section.keywords);
  let score = 0;
  for (const word of questionWords) {
    if (set.has(word)) score += 3;
  }
  for (const word of jobWords) {
    if (set.has(word)) score += 1;
  }
  return score;
}

function selectTopSections(
  sections: ResumeSection[],
  question: string,
  jobWords: string[],
): ResumeSection[] {
  if (!sections.length) return [];
  const qWords = toWords(question);
  return sections
    .map((section) => ({
      section,
      score: scoreSection(qWords, jobWords, section),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.section);
}

function sanitizeExcerpt(text: string): string {
  const cleaned =
    normalizeSpaces(
      text
        .replace(DIGIT_SCRUB, "[redacted]")
        .replace(EMAIL_SCRUB, "[email removed]")
        .replace(PHONE_SCRUB, "[phone removed]"),
    ) ?? "";
  return cleaned.slice(0, 200);
}

function composeTonePrefix(tone: TonePreset): string {
  switch (tone) {
    case "enthusiastic":
      return "I'm genuinely excited about this opportunity because";
    case "technical":
      return "From a technical standpoint, I approach this by";
    case "concise":
    default:
      return "In previous roles I";
  }
}

function applyToneTransform(text: string, tone: TonePreset): string {
  if (tone === "concise") {
    return text.replace(/\.\s+/g, ". ").replace(/\s{2,}/g, " ");
  }
  if (tone === "enthusiastic") {
    return text.replace(/\./g, "!");
  }
  if (tone === "technical") {
    return text.replace(/I /g, "I strategically ");
  }
  return text;
}

function enforceLimits(answer: string, maxChars?: number, maxWords?: number): string {
  let text = normalizeSpaces(answer.trim()) ?? "";
  if (maxWords && maxWords > 0) {
    const words = text.split(/\s+/);
    if (words.length > maxWords) {
      text = `${words.slice(0, maxWords).join(" ")}…`;
    }
  }
  if (maxChars && maxChars > 0 && text.length > maxChars) {
    text = `${text.slice(0, maxChars - 1)}…`;
  }
  return text;
}

function detectWarnings(text: string): string[] {
  const warnings: string[] = [];
  CONFIDENTIAL_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) {
      warnings.push("Possible confidential or restricted information detected. Review before submitting.");
    }
  });
  return warnings;
}

export function buildAnswerArtifact(params: {
  url: string;
  fieldKey: string;
  fieldLabel?: string;
  question: string;
  tone: TonePreset;
  answer: string;
  citations: AnswerCitation[];
  maxLength?: number;
}): JobAnswerArtifact {
  const words = params.answer.trim().split(/\s+/).filter(Boolean);
  return {
    id: nanoid(),
    fieldKey: params.fieldKey,
    fieldLabel: params.fieldLabel,
    question: params.question,
    answer: params.answer,
    tone: params.tone,
    citations: params.citations,
    wordCount: words.length,
    charCount: params.answer.length,
    maxLength: params.maxLength,
    updatedAt: Date.now(),
  };
}

export async function generateApplicationAnswer(
  context: AssistantPromptContext,
): Promise<AssistantGenerationResult> {
  const started = performance.now();
  const sections = buildResumeSections(context.profile);
  const jobWords = extractJobKeywords(context.detection);
  const topSections = selectTopSections(sections, context.question, jobWords);
  const tonePrefix = composeTonePrefix(context.tone);

  const detailLines: string[] = topSections.map((section) =>
    `${section.label}: ${section.content}`,
  );
  const previous =
    context.previousAnswers?.slice(-3).map((item) => item.answer) ?? [];
  const skills =
    context.jobRecordSummary?.topSkills?.slice(0, 6).join(", ") ?? "";
  const missing =
    context.jobRecordSummary?.missingKeywords?.slice(0, 4).join(", ") ?? "";

  const baseAnswer = [
    `${tonePrefix} I have addressed similar${context.fieldLabel ? ` ${context.fieldLabel.toLowerCase()}` : ""} challenges by:`,
    ...detailLines.map((line, idx) => `${idx + 1}. ${line}`),
    previous.length
      ? `Previously submitted answers for this job: ${previous.join(" | ")}`
      : "",
    skills ? `Relevant strengths: ${skills}.` : "",
    missing ? `I remain proactive about areas like ${missing}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const toned = applyToneTransform(baseAnswer, context.tone);
  const limited = enforceLimits(
    toned,
    context.maxChars,
    context.maxWords ?? DEFAULT_MAX_WORDS,
  );
  const scrubbed = sanitizeExcerpt(limited);
  const warnings = detectWarnings(scrubbed);

  const citations: AnswerCitation[] = topSections.map((section) => ({
    id: section.id,
    section: section.section,
    label: section.label,
    excerpt: sanitizeExcerpt(section.content),
  }));

  return {
    answer: scrubbed,
    citations,
    warnings,
    usage: {
      tokensIn: baseAnswer.length / 4,
      tokensOut: scrubbed.length / 4,
      durationMs: Math.round(performance.now() - started),
      model: "fallback",
      from: "fallback",
    },
  };
}
