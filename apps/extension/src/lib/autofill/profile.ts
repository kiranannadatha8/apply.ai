import { nanoid } from "./utils";

export interface ContactInfo {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  preferredName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  linkedin?: string;
  website?: string;
}

export interface ResumeVariant {
  id: string;
  label: string;
  filename?: string;
  mime?: string;
  sizeBytes?: number;
  updatedAt?: number;
  dataBase64?: string;
  tags?: string[];
}

export interface NormalizedProfile {
  contact: ContactInfo;
  summary?: string;
  skills?: string[];
  experience?: Array<{
    company?: string;
    role?: string;
    start?: string;
    end?: string;
    description?: string;
  }>;
  education?: Array<{
    school?: string;
    degree?: string;
    start?: string;
    end?: string;
    description?: string;
  }>;
  custom?: Record<string, unknown>;
  resumeVariants: ResumeVariant[];
  defaultResumeId?: string;
  resumeText?: string;
}

export const PROFILE_STORAGE_KEY = "applyai.userProfile.v1";

function val(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim().length) return v.trim();
  return undefined;
}

function pick<T extends string>(
  obj: Record<string, unknown> | undefined,
  keys: T[],
): string | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const candidate = obj[key];
    const str = val(candidate);
    if (str) return str;
  }
  return undefined;
}

function normalizeContact(raw: any): ContactInfo {
  const source =
    raw?.contact ??
    raw?.personal ??
    raw?.basics ??
    raw?.profile ??
    raw ??
    {};

  const firstName =
    val(source.firstName) ??
    pick(source, ["first_name", "givenName", "given_name", "fname"]);
  const lastName =
    val(source.lastName) ??
    pick(source, ["last_name", "familyName", "surname", "lname"]);
  let fullName =
    val(source.fullName) ?? pick(source, ["full_name", "name"]);
  if (!fullName) {
    const combined = [firstName, lastName].filter(Boolean).join(" ").trim();
    fullName = combined.length ? combined : undefined;
  }

  return {
    firstName,
    lastName,
    fullName,
    preferredName: val(source.preferredName) ?? pick(source, ["nickname"]),
    email: val(source.email) ?? pick(source, ["emailAddress"]),
    phone: val(source.phone) ?? pick(source, ["phoneNumber", "mobile"]),
    addressLine1:
      val(source.addressLine1) ?? pick(source, ["address1", "street", "line1"]),
    addressLine2:
      val(source.addressLine2) ??
      pick(source, ["address2", "apt", "line2", "suite"]),
    city: val(source.city) ?? pick(source, ["locality", "town"]),
    state:
      val(source.state) ??
      pick(source, ["region", "stateProvince", "province"]),
    postalCode:
      val(source.postalCode) ?? pick(source, ["zip", "zipCode", "postal"]),
    country: val(source.country),
    linkedin: val(source.linkedin) ?? pick(source, ["linkedinUrl", "linkedin"]),
    website:
      val(source.website) ??
      pick(source, ["portfolio", "portfolioUrl", "github", "site"]),
  };
}

function normalizeResumeVariants(raw: any): ResumeVariant[] {
  const variants: ResumeVariant[] = [];
  const list =
    Array.isArray(raw?.resumeVariants) && raw.resumeVariants.length
      ? raw.resumeVariants
      : Array.isArray(raw?.resumes)
        ? raw.resumes
        : [];

  for (const item of list) {
    if (!item) continue;
    const id = typeof item.id === "string" ? item.id : nanoid();
    variants.push({
      id,
      label:
        val(item.label) ??
        val(item.name) ??
        val(item.filename) ??
        "Resume",
      filename: val(item.filename) ?? val(item.name),
      mime: val(item.mime) ?? val(item.contentType),
      sizeBytes:
        typeof item.size === "number"
          ? item.size
          : typeof item.sizeBytes === "number"
            ? item.sizeBytes
            : undefined,
      updatedAt:
        typeof item.updatedAt === "number"
          ? item.updatedAt
          : typeof item.updatedAt === "string"
            ? Date.parse(item.updatedAt)
            : undefined,
      dataBase64: val(item.dataBase64) ?? val(item.base64),
      tags: Array.isArray(item.tags)
        ? item.tags
            .map((t: unknown) => (typeof t === "string" ? t : null))
            .filter(Boolean) as string[]
        : undefined,
    });
  }

  return variants;
}

export async function loadNormalizedProfile(): Promise<NormalizedProfile | null> {
  try {
    const { [PROFILE_STORAGE_KEY]: raw } =
      await chrome.storage.local.get(PROFILE_STORAGE_KEY);
    if (!raw) return null;

    const profile: NormalizedProfile = {
      contact: normalizeContact(raw),
      summary: val(raw.summary) ?? val(raw.about),
      skills: Array.isArray(raw.skills)
        ? (raw.skills.filter((s: unknown) => typeof s === "string") as string[])
        : undefined,
      experience: Array.isArray(raw.experience)
        ? raw.experience.map((item: any) => ({
            company: val(item.company),
            role: val(item.role) ?? val(item.title),
            start: val(item.start) ?? val(item.startDate),
            end: val(item.end) ?? val(item.endDate),
            description: val(item.description),
          }))
        : undefined,
      education: Array.isArray(raw.education)
        ? raw.education.map((item: any) => ({
            school: val(item.school) ?? val(item.institution),
            degree: val(item.degree),
            start: val(item.start) ?? val(item.startDate),
            end: val(item.end) ?? val(item.endDate),
            description: val(item.description),
          }))
        : undefined,
      custom: typeof raw.custom === "object" ? raw.custom : undefined,
      resumeVariants: normalizeResumeVariants(raw),
      defaultResumeId:
        typeof raw.defaultResumeId === "string" ? raw.defaultResumeId : undefined,
      resumeText: val(raw.resumeText),
    };

    if (!profile.contact.fullName) {
      profile.contact.fullName = [profile.contact.firstName, profile.contact.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
    }

    return profile;
  } catch (err) {
    console.warn("[ApplyAI] Failed to load profile", err);
    return null;
  }
}
