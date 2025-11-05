// Autosave analysis to job record. Keyed by URL by default (compatible with MVP).
// You can swap this to your backend client later.

const KEY = "applyai.jobRecords.v1";

export type JobStage = "saved" | "applied" | "interviewing" | "offer" | "rejected";

export type TonePreset = "concise" | "enthusiastic" | "technical";

export interface AnswerCitation {
  id: string;
  section:
    | "summary"
    | "experience"
    | "education"
    | "skill"
    | "custom"
    | "project";
  label: string;
  excerpt: string;
}

export interface JobAnswerArtifact {
  id: string;
  fieldKey: string;
  fieldLabel?: string;
  question: string;
  answer: string;
  tone: TonePreset;
  citations: AnswerCitation[];
  wordCount: number;
  charCount: number;
  maxLength?: number;
  updatedAt: number;
}

export interface JobAnalysisRecord {
  url: string;
  title?: string;
  company?: string;
  matchScore: number;
  missingKeywords: string[];
  topSkills: string[];
  bullets: string[];
  coverNote: string;
  updatedAt: number;
  createdAt: number;
  savedAt?: number;
  stage?: JobStage;
  tokens?: { in: number; out: number; model?: string };
  resumeVariantId?: string;
  coverLetterAssetId?: string;
  lastAutofillAt?: number;
  qa?: Record<string, JobAnswerArtifact>;
}

export async function loadJobRecord(
  url: string,
): Promise<JobAnalysisRecord | null> {
  const { [KEY]: state = {} } = await chrome.storage.local.get(KEY);
  return state[url] ?? null;
}

function createEmptyRecord(url: string): JobAnalysisRecord {
  return {
    url,
    title: undefined,
    company: undefined,
    matchScore: 0,
    missingKeywords: [],
    topSkills: [],
    bullets: [],
    coverNote: "",
    updatedAt: Date.now(),
    createdAt: Date.now(),
    qa: {},
  };
}

export async function saveJobRecord(
  rec: Partial<JobAnalysisRecord> & { url: string },
): Promise<JobAnalysisRecord> {
  const { [KEY]: state = {} } = await chrome.storage.local.get(KEY);
  const prev: JobAnalysisRecord | undefined = state[rec.url];
  const base = prev ?? createEmptyRecord(rec.url);
  const next: JobAnalysisRecord = {
    ...base,
    ...rec,
    title: rec.title ?? base.title,
    company: rec.company ?? base.company,
    missingKeywords: rec.missingKeywords ?? base.missingKeywords,
    topSkills: rec.topSkills ?? base.topSkills,
    bullets: rec.bullets ?? base.bullets,
    coverNote: rec.coverNote ?? base.coverNote,
    stage: rec.stage ?? base.stage,
    savedAt: rec.savedAt ?? base.savedAt,
    tokens: rec.tokens ?? base.tokens,
    resumeVariantId: rec.resumeVariantId ?? base.resumeVariantId,
    coverLetterAssetId: rec.coverLetterAssetId ?? base.coverLetterAssetId,
    lastAutofillAt: rec.lastAutofillAt ?? base.lastAutofillAt,
    qa: {
      ...(base.qa ?? {}),
      ...(rec.qa ?? {}),
    },
    updatedAt: rec.updatedAt ?? Date.now(),
  };
  state[rec.url] = next;
  await chrome.storage.local.set({ [KEY]: state });
  return next;
}

export async function listJobRecords(): Promise<JobAnalysisRecord[]> {
  const { [KEY]: state = {} } = await chrome.storage.local.get(KEY);
  const list = Object.values(state) as JobAnalysisRecord[];
  return list.sort((a, b) => {
    const left = a.savedAt ?? a.updatedAt ?? 0;
    const right = b.savedAt ?? b.updatedAt ?? 0;
    return right - left;
  });
}

export async function updateJobStage(
  url: string,
  stage: JobStage,
): Promise<JobAnalysisRecord | null> {
  const { [KEY]: state = {} } = await chrome.storage.local.get(KEY);
  const prev: JobAnalysisRecord | undefined = state[url];
  if (!prev) return null;
  const next: JobAnalysisRecord = {
    ...prev,
    stage,
    savedAt: prev.savedAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  state[url] = next;
  await chrome.storage.local.set({ [KEY]: state });
  return next;
}

export async function upsertAnswerArtifact(
  url: string,
  artifact: JobAnswerArtifact,
): Promise<JobAnswerArtifact> {
  const { [KEY]: state = {} } = await chrome.storage.local.get(KEY);
  const prev: JobAnalysisRecord | undefined = state[url];
  const base = prev ?? createEmptyRecord(url);
  const qa = { ...(base.qa ?? {}) };
  qa[artifact.fieldKey] = artifact;
  const next: JobAnalysisRecord = {
    ...base,
    qa,
    updatedAt: Date.now(),
  };
  state[url] = next;
  await chrome.storage.local.set({ [KEY]: state });
  return artifact;
}

export async function removeAnswerArtifact(
  url: string,
  fieldKey: string,
): Promise<void> {
  const { [KEY]: state = {} } = await chrome.storage.local.get(KEY);
  const prev: JobAnalysisRecord | undefined = state[url];
  if (!prev?.qa?.[fieldKey]) return;
  const qa = { ...prev.qa };
  delete qa[fieldKey];
  state[url] = {
    ...prev,
    qa,
    updatedAt: Date.now(),
  };
  await chrome.storage.local.set({ [KEY]: state });
}

export async function listAnswerArtifacts(
  url: string,
): Promise<JobAnswerArtifact[]> {
  const { [KEY]: state = {} } = await chrome.storage.local.get(KEY);
  const record: JobAnalysisRecord | undefined = state[url];
  if (!record?.qa) return [];
  return Object.values(record.qa);
}
