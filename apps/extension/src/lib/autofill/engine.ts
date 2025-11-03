import { normalizeSpaces, nanoid, makeFileFromBase64 } from "./utils";
import type { NormalizedProfile, ResumeVariant } from "./profile";
import type { DetectionResult } from "../detect/types";

type InputElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

export type FieldKey =
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
  | "coverLetterText";

export interface FieldPreview {
  id: string;
  key: FieldKey | null;
  label: string;
  hint: string;
  required: boolean;
  value?: string;
  status: "ready" | "missing" | "unsupported";
  element: InputElement;
}

export type FileKind = "resume" | "coverLetter" | "other";

export interface FilePreview {
  id: string;
  kind: FileKind;
  label: string;
  accept: string | null;
  required: boolean;
  element: HTMLInputElement;
  status: "ready" | "missing";
}

export interface PreparedAutofill {
  detection: DetectionResult;
  board: string;
  form: HTMLFormElement | null;
  fields: FieldPreview[];
  files: FilePreview[];
  timestamp: number;
  profilePresent: boolean;
}

export interface ApplyOptions {
  includeFields: Record<string, boolean>;
  resumeVariant?: ResumeVariant & { dataBase64?: string };
  coverLetterText?: string;
  attachCoverLetterFile?: boolean;
  includeFileIds?: Record<string, boolean>;
}

export interface ApplyResult {
  filledFieldIds: string[];
  skippedFieldIds: string[];
  fileAttachments: string[];
  errors: Record<string, string>;
  startedAt: number;
  completedAt: number;
}

interface FieldRule {
  key: FieldKey;
  weight: number;
  patterns: RegExp[];
  attributes?: RegExp[];
  types?: string[];
}

const FIELD_RULES: FieldRule[] = [
  {
    key: "firstName",
    weight: 10,
    patterns: [/\bfirst\b.*\bname\b/i, /\bgiven\b.*\bname\b/i],
    attributes: [/first[_-]?name/i, /given[_-]?name/i, /^fname$/i],
  },
  {
    key: "lastName",
    weight: 10,
    patterns: [/\blast\b.*\bname\b/i, /\bfamily\b.*\bname\b/i],
    attributes: [/last[_-]?name/i, /family[_-]?name/i, /^lname$/i],
  },
  {
    key: "preferredName",
    weight: 6,
    patterns: [/\bpreferred\b.*\bname\b/i, /\bnick\b.*\bname\b/i],
    attributes: [/preferred[_-]?name/i, /nickname/i],
  },
  {
    key: "fullName",
    weight: 4,
    patterns: [/\bfull\b.*\bname\b/i, /\blegal\b.*\bname\b/i, /\bname\b/i],
    attributes: [/full[_-]?name/i, /^name$/i],
  },
  {
    key: "email",
    weight: 10,
    patterns: [/\bemail\b/i, /\bemail\b.*\baddress\b/i],
    attributes: [/email/i],
    types: ["email", "text"],
  },
  {
    key: "phone",
    weight: 10,
    patterns: [/\bphone\b/i, /\bmobile\b/i, /\bcell\b/i],
    attributes: [/phone/i, /mobile/i],
    types: ["tel", "text"],
  },
  {
    key: "addressLine1",
    weight: 7,
    patterns: [/\baddress\b(?!.*line\s*2)/i, /\bstreet\b/i],
    attributes: [/address1/i, /line1/i, /^street$/i],
  },
  {
    key: "addressLine2",
    weight: 5,
    patterns: [/\baddress\b.*(line|apt).*\b2\b/i, /\bapt\b/i, /\bsuite\b/i],
    attributes: [/address2/i, /line2/i, /apt/i],
  },
  {
    key: "city",
    weight: 6,
    patterns: [/\bcity\b/i, /\btown\b/i],
    attributes: [/city/i, /locality/i],
  },
  {
    key: "state",
    weight: 6,
    patterns: [/\bstate\b/i, /\bprovince\b/i, /\bregion\b/i],
    attributes: [/state/i, /province/i, /region/i],
  },
  {
    key: "postalCode",
    weight: 6,
    patterns: [/\bzip\b/i, /\bpostal\b/i, /\bpostcode\b/i],
    attributes: [/zip/i, /postal/i],
  },
  {
    key: "country",
    weight: 6,
    patterns: [/\bcountry\b/i],
    attributes: [/country/i],
  },
  {
    key: "linkedin",
    weight: 5,
    patterns: [/\blinked/i],
    attributes: [/linkedin/i],
    types: ["url", "text"],
  },
  {
    key: "website",
    weight: 4,
    patterns: [/\bportfolio\b/i, /\bwebsite\b/i, /\bgithub\b/i],
    attributes: [/portfolio/i, /website/i, /github/i],
    types: ["url", "text"],
  },
  {
    key: "currentCompany",
    weight: 3,
    patterns: [/\bcurrent\b.*\bcompany\b/i, /\bemployer\b/i],
    attributes: [/current[_-]?company/i],
  },
  {
    key: "currentTitle",
    weight: 3,
    patterns: [/\bcurrent\b.*\btitle\b/i, /\bcurrent\b.*\brole\b/i],
    attributes: [/current[_-]?title/i, /current[_-]?role/i],
  },
  {
    key: "summary",
    weight: 2,
    patterns: [/\bsummary\b/i, /\babout\b.*\byou\b/i],
    attributes: [/summary/i, /about/i],
    types: ["textarea"],
  },
  {
    key: "coverLetterText",
    weight: 12,
    patterns: [/\bcover\b.*\bletter\b/i],
    attributes: [/cover[_-]?letter/i],
    types: ["textarea", "text"],
  },
];

const MULTI_USE_KEYS: Set<FieldKey> = new Set(["addressLine2", "summary"]);

function getLabelText(el: Element): string {
  const id = (el as HTMLElement).id;
  if (id) {
    const label = el.ownerDocument?.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) return normalizeSpaces(label.textContent ?? "") ?? "";
  }
  let parent: Element | null = el.parentElement;
  const maxDepth = 3;
  let depth = 0;
  while (parent && depth < maxDepth) {
    if (parent.tagName.toLowerCase() === "label") {
      return normalizeSpaces(parent.textContent ?? "") ?? "";
    }
    parent = parent.parentElement;
    depth++;
  }
  return "";
}

function fieldKeyFor(
  field: InputElement,
  label: string,
  hint: string,
  assigned: Set<FieldKey>,
): FieldKey | null {
  const type = field.tagName.toLowerCase() === "select" ? "select" : (field as any).type ?? "text";
  let best: { key: FieldKey; score: number } | null = null;
  for (const rule of FIELD_RULES) {
    if (rule.types && !rule.types.includes(type)) continue;
    let score = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(label)) score += rule.weight;
      else if (pattern.test(hint)) score += rule.weight * 0.7;
    }
    if (rule.attributes) {
      for (const attr of rule.attributes) {
        if (attr.test(hint)) score += rule.weight * 0.8;
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      if (assigned.has(rule.key) && !MULTI_USE_KEYS.has(rule.key)) continue;
      best = { key: rule.key, score };
    }
  }
  return best?.key ?? null;
}

interface ValueContext {
  coverLetterText?: string;
}

function valueForKey(
  profile: NormalizedProfile | null,
  key: FieldKey,
  ctx: ValueContext,
): string | undefined {
  if (!profile) return undefined;
  const contact = profile.contact ?? {};
  switch (key) {
    case "firstName":
      return contact.firstName;
    case "lastName":
      return contact.lastName;
    case "preferredName":
      return contact.preferredName ?? contact.firstName;
    case "fullName":
      return contact.fullName ?? [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
    case "email":
      return contact.email;
    case "phone":
      return contact.phone;
    case "addressLine1":
      return contact.addressLine1;
    case "addressLine2":
      return contact.addressLine2;
    case "city":
      return contact.city;
    case "state":
      if (!contact.state) return undefined;
      return contact.state.length <= 3
        ? contact.state.toUpperCase()
        : contact.state;
    case "postalCode":
      return contact.postalCode;
    case "country":
      return contact.country;
    case "linkedin": {
      const link = contact.linkedin;
      if (!link) return undefined;
      if (/^https?:\/\//i.test(link)) return link;
      const sanitized = link.replace(/^@/, "").replace(/^linkedin\.com\//i, "");
      return `https://www.linkedin.com/in/${sanitized}`;
    }
    case "website": {
      const site = contact.website;
      if (!site) return undefined;
      if (/^https?:\/\//i.test(site)) return site;
      return `https://${site.replace(/^https?:\/\//i, "")}`;
    }
    case "currentCompany":
      return profile.experience?.find(Boolean)?.company;
    case "currentTitle":
      return profile.experience?.find(Boolean)?.role;
    case "summary":
      return profile.summary;
    case "coverLetterText":
      return ctx.coverLetterText;
    default:
      return undefined;
  }
}

function labelForField(field: InputElement, labelText: string): string {
  const placeholder = (field as HTMLInputElement).placeholder;
  const aria = (field as HTMLInputElement).getAttribute("aria-label");
  return (
    normalizeSpaces(labelText) ??
    normalizeSpaces(placeholder ?? "") ??
    normalizeSpaces(aria ?? "") ??
    ""
  );
}

function buildHint(field: InputElement, label: string): string {
  const attrs = [
    field.getAttribute("name"),
    field.getAttribute("id"),
    field.getAttribute("data-testid"),
    field.getAttribute("data-qa"),
    field.getAttribute("aria-label"),
    (field as HTMLInputElement).placeholder,
  ]
    .filter(Boolean)
    .join("|");
  return [label, attrs].filter(Boolean).join("|").toLowerCase();
}

function classifyFileKind(label: string, accept: string | null): FileKind {
  const text = `${label} ${accept ?? ""}`.toLowerCase();
  if (/\bcover\b/.test(text)) return "coverLetter";
  if (/\bresume\b/.test(text) || /\bcv\b/.test(text)) return "resume";
  return "other";
}

export function prepareAutofill(
  profile: NormalizedProfile | null,
  detection: DetectionResult,
  ctx: ValueContext = {},
): PreparedAutofill {
  const timestamp = Date.now();
  const doc = document;
  const forms = Array.from(doc.querySelectorAll("form"));
  const form =
    forms.length === 1
      ? forms[0]
      : forms.sort((a, b) => b.querySelectorAll("input, textarea, select").length - a.querySelectorAll("input, textarea, select").length)[0] ??
        null;

  const scope: ParentNode = form ?? doc;

  const assigned = new Set<FieldKey>();
  const fields: FieldPreview[] = [];

  const candidates = Array.from(
    scope.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select",
    ),
  ).filter((el) => {
    if (el instanceof HTMLInputElement) {
      const type = el.type?.toLowerCase() ?? "text";
      if (["hidden", "submit", "button", "reset", "file"].includes(type)) return false;
      if (el.disabled) return false;
      return true;
    }
    if (el instanceof HTMLTextAreaElement) {
      if (el.disabled) return false;
      return true;
    }
    if (el instanceof HTMLSelectElement) {
      if (el.disabled) return false;
      if (el.multiple) return false;
      return true;
    }
    return false;
  });

  for (const el of candidates) {
    const labelText = getLabelText(el);
    const label = labelForField(el, labelText);
    const hint = buildHint(el, labelText);
    const key = fieldKeyFor(el, labelText, hint, assigned);
    if (key) assigned.add(key);
    const value = key ? valueForKey(profile, key, ctx) : undefined;
    const status: FieldPreview["status"] =
      !key
        ? "unsupported"
        : value
          ? "ready"
          : "missing";

    fields.push({
      id: nanoid(),
      key,
      label,
      hint,
      required: (el as HTMLInputElement).required ?? false,
      value: value ? normalizeSpaces(value) : undefined,
      status,
      element: el,
    });
  }

  const files: FilePreview[] = Array.from(
    scope.querySelectorAll<HTMLInputElement>('input[type="file"]'),
  ).map((el) => {
    const labelText = getLabelText(el);
    const label = labelForField(el, labelText);
    const accept = el.getAttribute("accept");
    const kind = classifyFileKind(label.toLowerCase(), accept);
    return {
      id: nanoid(),
      kind,
      label,
      accept,
      required: el.required,
      element: el,
      status:
        kind === "resume"
          ? profile?.resumeVariants?.length
            ? "ready"
            : "missing"
          : kind === "coverLetter"
            ? "ready"
            : "missing",
    };
  });

  return {
    detection,
    board: detection.board,
    form,
    fields,
    files,
    timestamp,
    profilePresent: !!profile,
  };
}

function setInputValue(field: InputElement, value: string): void {
  if (field instanceof HTMLSelectElement) {
    const target = Array.from(field.options).find((opt) => {
      const text = normalizeSpaces(opt.textContent ?? "")?.toLowerCase();
      const val = normalizeSpaces(opt.value)?.toLowerCase();
      const targetVal = normalizeSpaces(value)?.toLowerCase();
      return text === targetVal || val === targetVal;
    });
    if (target) {
      field.value = target.value;
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    // fallback: include partial match
    const fallback = Array.from(field.options).find((opt) => {
      const text = normalizeSpaces(opt.textContent ?? "")?.toLowerCase() ?? "";
      return value.toLowerCase().includes(text) || text.includes(value.toLowerCase());
    });
    if (fallback) {
      field.value = fallback.value;
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    throw new Error("No matching option");
  }

  const input = field as HTMLInputElement | HTMLTextAreaElement;
  const nativeSetter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(input),
    "value",
  )?.set;
  if (nativeSetter) {
    nativeSetter.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function attachFile(
  el: HTMLInputElement,
  file: File,
): void {
  const dt = new DataTransfer();
  dt.items.add(file);
  el.files = dt.files;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export async function applyAutofill(
  prepared: PreparedAutofill,
  options: ApplyOptions,
): Promise<ApplyResult> {
  const startedAt = Date.now();
  const filledFieldIds: string[] = [];
  const skippedFieldIds: string[] = [];
  const errors: Record<string, string> = {};

  for (const field of prepared.fields) {
    const include = options.includeFields[field.id] ?? field.status === "ready";
    if (!include) {
      skippedFieldIds.push(field.id);
      continue;
    }
    const valueOverride =
      field.key === "coverLetterText" && options.coverLetterText
        ? options.coverLetterText
        : field.value;
    if (!valueOverride) {
      skippedFieldIds.push(field.id);
      if (field.required) {
        errors[field.id] = "Missing profile data";
      }
      continue;
    }
    try {
      setInputValue(field.element, valueOverride);
      filledFieldIds.push(field.id);
    } catch (err) {
      errors[field.id] =
        err instanceof Error ? err.message : "Failed to set value";
      skippedFieldIds.push(field.id);
    }
  }

  const fileAttachments: string[] = [];

  if (prepared.files.length) {
    for (const file of prepared.files) {
      const include =
        options.includeFileIds?.[file.id] ??
        (file.kind === "resume" || file.kind === "coverLetter");
      if (!include) continue;
      try {
        if (file.kind === "resume") {
          const resume = options.resumeVariant;
          if (!resume || !resume.dataBase64) {
            if (file.required) {
              errors[file.id] = "Missing resume variant";
            }
            continue;
          }
          const filename =
            resume.filename ??
            resume.label.replace(/\s+/g, "-").toLowerCase() + ".pdf";
          const mime = resume.mime ?? "application/pdf";
          const blob = makeFileFromBase64(resume.dataBase64, filename, mime);
          attachFile(file.element, blob);
          fileAttachments.push(file.id);
          continue;
        }
        if (file.kind === "coverLetter") {
          if (!options.coverLetterText) {
            if (file.required) {
              errors[file.id] = "Missing cover letter content";
            }
            continue;
          }
          if (options.attachCoverLetterFile === false) continue;
          const blob = new File(
            [options.coverLetterText],
            "cover-letter.txt",
            { type: "text/plain" },
          );
          attachFile(file.element, blob);
          fileAttachments.push(file.id);
          continue;
        }
        // other attachments not handled automatically
      } catch (err) {
        errors[file.id] =
          err instanceof Error ? err.message : "Failed to attach file";
      }
    }
  }

  return {
    filledFieldIds,
    skippedFieldIds,
    fileAttachments,
    errors,
    startedAt,
    completedAt: Date.now(),
  };
}
