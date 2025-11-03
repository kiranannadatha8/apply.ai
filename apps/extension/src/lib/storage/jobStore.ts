// Autosave analysis to job record. Keyed by URL by default (compatible with MVP).
// You can swap this to your backend client later.

const KEY = "applyai.jobRecords.v1";

export interface JobAnalysisRecord {
  url: string;
  matchScore: number;
  missingKeywords: string[];
  topSkills: string[];
  bullets: string[];
  coverNote: string;
  updatedAt: number;
  tokens?: { in: number; out: number; model?: string };
  resumeVariantId?: string;
  coverLetterAssetId?: string;
  lastAutofillAt?: number;
}

export async function loadJobRecord(
  url: string,
): Promise<JobAnalysisRecord | null> {
  const { [KEY]: state = {} } = await chrome.storage.local.get(KEY);
  return state[url] ?? null;
}

export async function saveJobRecord(rec: JobAnalysisRecord): Promise<void> {
  const { [KEY]: state = {} } = await chrome.storage.local.get(KEY);
  state[rec.url] = rec;
  await chrome.storage.local.set({ [KEY]: state });
}
