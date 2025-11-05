import { nanoid } from "../autofill/utils";

const STORAGE_KEY = "applyai.fieldMappings.v1";
const CURRENT_VERSION = 1;
export const FIELD_MAPPING_STORAGE_KEY = STORAGE_KEY;

export type ProfileToken =
  | "firstName"
  | "lastName"
  | "fullName"
  | "preferredName"
  | "email"
  | "phone"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "state"
  | "postalCode"
  | "country"
  | "linkedin"
  | "website"
  | "currentCompany"
  | "currentTitle"
  | "summary"
  | "coverLetterText"
  | "resume";

export interface FieldSignature {
  name?: string;
  id?: string;
  type?: string;
  tagName?: string;
  placeholder?: string;
  ariaLabel?: string;
  labelText?: string;
  dataset?: Record<string, string>;
}

export type FieldControlKind = "input" | "textarea" | "select" | "checkbox" | "radio" | "file";

export interface FieldMappingEntry {
  id: string;
  token: ProfileToken;
  pathPattern: string;
  signature: FieldSignature;
  createdAt: number;
  updatedAt: number;
  control: FieldControlKind;
  inputType?: string;
}

export interface DomainMappingRecord {
  domain: string;
  autoApply: boolean;
  entries: FieldMappingEntry[];
}

export interface FieldMappingState {
  version: number;
  domains: DomainMappingRecord[];
}

function normalizeState(raw: unknown): FieldMappingState {
  if (!raw || typeof raw !== "object") {
    return { version: CURRENT_VERSION, domains: [] };
  }
  const version =
    typeof (raw as any).version === "number"
      ? (raw as any).version
      : CURRENT_VERSION;
  const domains: DomainMappingRecord[] = Array.isArray((raw as any).domains)
    ? (raw as any).domains
        .map((domain: any) => {
          if (!domain || typeof domain !== "object") return null;
          const entries: FieldMappingEntry[] = Array.isArray(domain.entries)
            ? domain.entries
                .map((entry: any) => {
                  if (!entry || typeof entry !== "object") return null;
                  const signatureObj = entry.signature ?? {};
                  const signature: FieldSignature = {
                    name:
                      typeof signatureObj.name === "string"
                        ? signatureObj.name
                        : undefined,
                    id:
                      typeof signatureObj.id === "string"
                        ? signatureObj.id
                        : undefined,
                    type:
                      typeof signatureObj.type === "string"
                        ? signatureObj.type
                        : undefined,
                    tagName:
                      typeof signatureObj.tagName === "string"
                        ? signatureObj.tagName
                        : undefined,
                    placeholder:
                      typeof signatureObj.placeholder === "string"
                        ? signatureObj.placeholder
                        : undefined,
                    ariaLabel:
                      typeof signatureObj.ariaLabel === "string"
                        ? signatureObj.ariaLabel
                        : undefined,
                    labelText:
                      typeof signatureObj.labelText === "string"
                        ? signatureObj.labelText
                        : undefined,
                    dataset:
                      signatureObj.dataset && typeof signatureObj.dataset === "object"
                        ? Object.entries(signatureObj.dataset).reduce<
                            Record<string, string>
                          >((acc, [key, value]) => {
                            if (typeof value === "string") acc[key] = value;
                            return acc;
                          }, {})
                        : undefined,
                  };
                  const entryToken = entry.token;
                  if (typeof entryToken !== "string") return null;
                  return {
                    id:
                      typeof entry.id === "string" && entry.id.length
                        ? entry.id
                        : nanoid(),
                    token: entryToken as ProfileToken,
                    pathPattern:
                      typeof entry.pathPattern === "string" && entry.pathPattern.length
                        ? entry.pathPattern
                        : "/",
                    signature,
                    createdAt:
                      typeof entry.createdAt === "number"
                        ? entry.createdAt
                        : Date.now(),
                    updatedAt:
                      typeof entry.updatedAt === "number"
                        ? entry.updatedAt
                        : Date.now(),
                    control:
                      entry.control === "textarea" ||
                      entry.control === "select" ||
                      entry.control === "checkbox" ||
                      entry.control === "radio" ||
                      entry.control === "file"
                        ? entry.control
                        : "input",
                    inputType:
                      typeof entry.inputType === "string"
                        ? entry.inputType
                        : undefined,
                  } satisfies FieldMappingEntry;
                })
                .filter(Boolean) as FieldMappingEntry[]
            : [];
          return {
            domain:
              typeof domain.domain === "string" && domain.domain.length
                ? domain.domain
                : "unknown",
            autoApply:
              typeof domain.autoApply === "boolean"
                ? domain.autoApply
                : true,
            entries,
          } satisfies DomainMappingRecord;
        })
        .filter(Boolean) as DomainMappingRecord[]
    : [];

  return { version, domains };
}

async function loadState(): Promise<FieldMappingState> {
  try {
    const stored = await chrome.storage.sync.get(STORAGE_KEY);
    return normalizeState(stored?.[STORAGE_KEY]);
  } catch {
    return { version: CURRENT_VERSION, domains: [] };
  }
}

async function saveState(state: FieldMappingState): Promise<void> {
  const payload: FieldMappingState = {
    version: CURRENT_VERSION,
    domains: state.domains.map((domain) => ({
      ...domain,
      entries: domain.entries.map((entry) => ({
        ...entry,
        signature: {
          ...entry.signature,
          dataset: entry.signature.dataset
            ? { ...entry.signature.dataset }
            : undefined,
        },
      })),
    })),
  };
  await chrome.storage.sync.set({ [STORAGE_KEY]: payload });
}

function findDomain(state: FieldMappingState, domain: string): DomainMappingRecord | undefined {
  return state.domains.find((item) => item.domain === domain);
}

function ensureDomain(state: FieldMappingState, domain: string): DomainMappingRecord {
  let record = findDomain(state, domain);
  if (!record) {
    record = { domain, autoApply: true, entries: [] };
    state.domains.push(record);
  }
  return record;
}

function signaturesMatch(a: FieldSignature, b: FieldSignature): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  if (a.name && b.name && a.name === b.name) return true;
  if (
    a.labelText &&
    b.labelText &&
    a.labelText.toLowerCase() === b.labelText.toLowerCase()
  ) {
    return true;
  }
  if (
    a.placeholder &&
    b.placeholder &&
    a.placeholder.toLowerCase() === b.placeholder.toLowerCase()
  ) {
    return true;
  }
  if (
    a.ariaLabel &&
    b.ariaLabel &&
    a.ariaLabel.toLowerCase() === b.ariaLabel.toLowerCase()
  ) {
    return true;
  }
  if (a.dataset && b.dataset) {
    for (const key of Object.keys(a.dataset)) {
      if (b.dataset[key] && b.dataset[key] === a.dataset[key]) return true;
    }
  }
  return false;
}

export async function recordFieldMapping(
  domain: string,
  entry: Omit<FieldMappingEntry, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
): Promise<FieldMappingEntry> {
  const state = await loadState();
  const record = ensureDomain(state, domain);
  const existing = record.entries.find(
    (item) =>
      item.pathPattern === entry.pathPattern &&
      item.token === entry.token &&
      signaturesMatch(item.signature, entry.signature),
  );
  const now = Date.now();
  if (existing) {
    existing.updatedAt = now;
    existing.signature = {
      ...existing.signature,
      ...entry.signature,
    };
    existing.control = entry.control;
    existing.inputType = entry.inputType;
    await saveState(state);
    return existing;
  }
  const next: FieldMappingEntry = {
    id: entry.id ?? nanoid(),
    token: entry.token,
    pathPattern: entry.pathPattern,
    signature: entry.signature,
    createdAt: now,
    updatedAt: now,
    control: entry.control,
    inputType: entry.inputType,
  };
  record.entries.push(next);
  await saveState(state);
  return next;
}

export async function getDomainMappings(domain: string): Promise<DomainMappingRecord> {
  const state = await loadState();
  return (
    findDomain(state, domain) ?? {
      domain,
      autoApply: true,
      entries: [],
    }
  );
}

export async function setDomainAutoApply(domain: string, autoApply: boolean): Promise<void> {
  const state = await loadState();
  const record = ensureDomain(state, domain);
  record.autoApply = autoApply;
  await saveState(state);
}

export async function removeFieldMapping(
  domain: string,
  mappingId: string,
): Promise<void> {
  const state = await loadState();
  const record = findDomain(state, domain);
  if (!record) return;
  record.entries = record.entries.filter((entry) => entry.id !== mappingId);
  await saveState(state);
}

export async function exportFieldMappings(): Promise<FieldMappingState> {
  const state = await loadState();
  return state;
}

export async function importFieldMappings(state: FieldMappingState): Promise<void> {
  const normalized = normalizeState(state);
  await saveState(normalized);
}
