import { nanoid } from "./utils";
import type { ResumeVariant } from "./profile";

const LIBRARY_KEY = "applyai.resumeLibrary.v1";

export interface StoredResumeVariant extends ResumeVariant {
  dataBase64?: string;
  createdAt?: number;
}

async function readLibrary(): Promise<StoredResumeVariant[]> {
  try {
    const { [LIBRARY_KEY]: raw } = await chrome.storage.local.get(LIBRARY_KEY);
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (item): item is StoredResumeVariant =>
        item && typeof item === "object" && typeof item.id === "string",
    );
  } catch {
    return [];
  }
}

async function writeLibrary(list: StoredResumeVariant[]) {
  await chrome.storage.local.set({ [LIBRARY_KEY]: list.slice(-10) });
}

export async function loadResumeLibrary(): Promise<StoredResumeVariant[]> {
  return readLibrary();
}

export async function upsertResumeVariant(
  variant: Omit<StoredResumeVariant, "id"> & { id?: string },
): Promise<StoredResumeVariant[]> {
  const existing = await readLibrary();
  const id = variant.id ?? nanoid();
  const payload: StoredResumeVariant = {
    id,
    label: variant.label ?? "Resume",
    filename: variant.filename,
    mime: variant.mime ?? "application/pdf",
    sizeBytes: variant.sizeBytes,
    dataBase64: variant.dataBase64,
    updatedAt: Date.now(),
    createdAt: variant.createdAt ?? Date.now(),
    tags: variant.tags,
  };
  const next = existing.filter((item) => item.id !== id);
  next.push(payload);
  await writeLibrary(next);
  return next;
}
