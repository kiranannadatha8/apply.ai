import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  loadNormalizedProfile,
  type NormalizedProfile,
} from "../lib/autofill/profile";
import {
  loadResumeLibrary,
  type StoredResumeVariant,
} from "../lib/autofill/resume-library";
import { makeFileFromBase64 } from "../lib/autofill/utils";
import type {
  FieldControlKind,
  FieldSignature,
  ProfileToken,
} from "../lib/storage/fieldMappingStore";
import {
  getDomainMappings,
  recordFieldMapping,
  type FieldMappingEntry,
  setDomainAutoApply,
  FIELD_MAPPING_STORAGE_KEY,
} from "../lib/storage/fieldMappingStore";
import { createShadowHost, ensurePersistentShadowHost } from "./shadow-root";

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface OverlayPayload {
  element: FieldElement;
  signature: FieldSignature;
  domain: string;
  pathPattern: string;
  control: FieldControlKind;
  inputType?: string;
}

interface TokenOption {
  token: ProfileToken;
  label: string;
  description: string;
  controls?: FieldControlKind[];
}

const TOKEN_OPTIONS: TokenOption[] = [
  {
    token: "firstName",
    label: "First Name",
    description: "Profile contact given name",
  },
  {
    token: "lastName",
    label: "Last Name",
    description: "Profile contact family name",
  },
  {
    token: "fullName",
    label: "Full Name",
    description: "Profile contact full name",
  },
  {
    token: "preferredName",
    label: "Preferred Name",
    description: "Profile nickname or preferred name",
  },
  {
    token: "email",
    label: "Email",
    description: "Primary email address",
  },
  {
    token: "phone",
    label: "Phone",
    description: "Primary phone number",
  },
  {
    token: "addressLine1",
    label: "Address Line 1",
    description: "Street address line 1",
  },
  {
    token: "addressLine2",
    label: "Address Line 2",
    description: "Apartment, suite, line 2",
  },
  {
    token: "city",
    label: "City",
    description: "City or locality",
  },
  {
    token: "state",
    label: "State / Province",
    description: "State, region, or province",
  },
  {
    token: "postalCode",
    label: "ZIP / Postal Code",
    description: "Postal or ZIP code",
  },
  {
    token: "country",
    label: "Country",
    description: "Country or region",
  },
  {
    token: "linkedin",
    label: "LinkedIn URL",
    description: "Profile LinkedIn link",
  },
  {
    token: "website",
    label: "Website / Portfolio",
    description: "Portfolio or personal site",
  },
  {
    token: "currentCompany",
    label: "Current Company",
    description: "Current employer",
  },
  {
    token: "currentTitle",
    label: "Current Title",
    description: "Current job title",
  },
  {
    token: "summary",
    label: "Professional Summary",
    description: "Summary / About you text",
    controls: ["textarea", "input"],
  },
  {
    token: "coverLetterText",
    label: "Cover Letter Text",
    description: "Default cover letter body",
    controls: ["textarea", "input"],
  },
  {
    token: "resume",
    label: "Resume File",
    description: "Uploads your default resume",
    controls: ["file"],
  },
];

const HOLD_THRESHOLD_MS = 600;

let overlayHost: HTMLDivElement | null = null;
let overlayShadow: ShadowRoot | null = null;
let overlayMount: HTMLDivElement | null = null;
let overlayRoot: ReturnType<typeof createRoot> | null = null;
let currentPayload: OverlayPayload | null = null;
let holdTimer: number | null = null;
let holdStart: { x: number; y: number } | null = null;
let clearedByMove = false;
let initialized = false;
const INDICATOR_STYLE_ID = "applyai-mapped-style";

let profilePromise: Promise<void> | null = null;
let profileCache: NormalizedProfile | null = null;
let resumeCache: StoredResumeVariant[] = [];
let applyScheduled = false;
let applyInFlight = false;
const appliedMappingIds = new Set<string>();
let indicatorStylesInjected = false;
let toggleHost: HTMLDivElement | null = null;
let toggleShadow: ShadowRoot | null = null;
let toggleContainer: HTMLDivElement | null = null;
let toggleState = {
  domain: "",
  autoApply: true,
  visible: false,
};
let mutationObserver: MutationObserver | null = null;
let lastAppliedKey = "";
let pendingApplyHandle: number | null = null;

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  if (FIELD_MAPPING_STORAGE_KEY in changes) {
    scheduleApply(150);
  }
});

function isFieldElement(node: EventTarget | null): node is FieldElement {
  if (!(node instanceof Element)) return false;
  if (overlayMount && overlayMount.contains(node)) return false;
  if (node instanceof HTMLInputElement) {
    const type = node.type.toLowerCase();
    if (type === "button" || type === "submit" || type === "reset") {
      return false;
    }
    return true;
  }
  if (node instanceof HTMLTextAreaElement) return true;
  if (node instanceof HTMLSelectElement) return true;
  return false;
}

function detectControl(element: FieldElement): FieldControlKind {
  if (element instanceof HTMLTextAreaElement) return "textarea";
  if (element instanceof HTMLSelectElement) return "select";
  const type = element.type.toLowerCase();
  if (type === "checkbox") return "checkbox";
  if (type === "radio") return "radio";
  if (type === "file") return "file";
  return "input";
}

function collectDataset(element: Element): Record<string, string> | undefined {
  const entries: Record<string, string> = {};
  for (const attr of element.getAttributeNames()) {
    if (!attr.startsWith("data-")) continue;
    if (
      attr === "data-reactid" ||
      attr.startsWith("data-v-") ||
      attr.startsWith("data-w-id")
    ) {
      continue;
    }
    const value = element.getAttribute(attr);
    if (value) {
      entries[attr] = value;
    }
  }
  return Object.keys(entries).length ? entries : undefined;
}

function getLabelText(element: FieldElement): string | undefined {
  const id = element.id;
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    const text = label?.textContent?.trim();
    if (text) return text;
  }
  const parentLabel = element.closest("label");
  const text = parentLabel?.textContent?.trim();
  if (text) return text;
  const describedBy = element.getAttribute("aria-labelledby");
  if (describedBy) {
    for (const ref of describedBy.split(/\s+/)) {
      const node = document.getElementById(ref);
      const label = node?.textContent?.trim();
      if (label) return label;
    }
  }
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;
  return undefined;
}

function buildSignature(element: FieldElement): FieldSignature {
  const tagName = element.tagName.toLowerCase();
  return {
    id: element.id || undefined,
    name: element.getAttribute("name") || undefined,
    type:
      element instanceof HTMLInputElement
        ? element.type || undefined
        : element instanceof HTMLSelectElement
          ? "select"
          : "textarea",
    tagName,
    placeholder:
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
        ? element.placeholder || undefined
        : undefined,
    ariaLabel: element.getAttribute("aria-label") || undefined,
    labelText: getLabelText(element),
    dataset: collectDataset(element),
  };
}

function computePathPattern(path: string): string {
  let pattern = path || "/";
  pattern = pattern.replace(/\d{2,}/g, ":num");
  pattern = pattern.replace(/[0-9a-f]{6,}/gi, ":hex");
  if (!pattern.startsWith("/")) pattern = `/${pattern}`;
  if (pattern.length > 1 && pattern.endsWith("/")) {
    pattern = pattern.slice(0, -1);
  }
  return pattern;
}

function ensureOverlayRoot() {
  if (overlayHost && overlayMount && overlayRoot) return;

  if (!overlayHost || !overlayShadow) {
    const { host, shadow } = createShadowHost("applyai-manual-assist");
    overlayHost = host;
    overlayShadow = shadow;
    overlayMount = document.createElement("div");
    overlayMount.className = "applyai-manual-assist-root";
    overlayShadow.appendChild(overlayMount);
    document.documentElement.appendChild(host);
  } else if (!overlayMount || !overlayMount.isConnected) {
    overlayMount = document.createElement("div");
    overlayMount.className = "applyai-manual-assist-root";
    overlayShadow.appendChild(overlayMount);
  }

  if (!overlayRoot && overlayMount) {
    overlayRoot = createRoot(overlayMount);
  }
}

function closeOverlay() {
  currentPayload = null;
  if (overlayRoot) {
    overlayRoot.render(null);
    overlayRoot.unmount();
  }
  if (overlayHost) {
    overlayHost.remove();
  }
  overlayRoot = null;
  overlayHost = null;
  overlayShadow = null;
  overlayMount = null;
}

function openOverlay(payload: OverlayPayload) {
  currentPayload = payload;
  ensureOverlayRoot();
  overlayRoot?.render(
    <ManualAssistOverlay payload={payload} onDismiss={closeOverlay} />,
  );
}

function resetHoldState() {
  if (holdTimer) {
    window.clearTimeout(holdTimer);
    holdTimer = null;
  }
  holdStart = null;
  clearedByMove = false;
}

function onPointerDown(event: PointerEvent) {
  if (currentPayload) return; // overlay open
  if (!isFieldElement(event.target)) return;
  const element = event.target as FieldElement;
  if (element.disabled) return;
  if (
    (element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement) &&
    element.readOnly
  ) {
    return;
  }
  holdStart = { x: event.clientX, y: event.clientY };
  clearedByMove = false;
  const domain = window.location.hostname;
  const pathPattern = computePathPattern(window.location.pathname);
  const signature = buildSignature(element);
  const control = detectControl(element);
  const inputType =
    element instanceof HTMLInputElement ? element.type : undefined;
  holdTimer = window.setTimeout(() => {
    holdTimer = null;
    openOverlay({
      element,
      signature,
      domain,
      pathPattern,
      control,
      inputType,
    });
  }, HOLD_THRESHOLD_MS);
}

function onPointerMove(event: PointerEvent) {
  if (!holdTimer || !holdStart) return;
  const dx = Math.abs(event.clientX - holdStart.x);
  const dy = Math.abs(event.clientY - holdStart.y);
  if (dx > 8 || dy > 8) {
    clearedByMove = true;
    resetHoldState();
  }
}

function onPointerUp() {
  if (!clearedByMove) {
    resetHoldState();
  }
}

function onPointerCancel() {
  resetHoldState();
}

export function initManualAssist() {
  if (initialized) return;
  initialized = true;
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerup", onPointerUp, true);
  document.addEventListener("pointercancel", onPointerCancel, true);
  scheduleApply(200);
  mutationObserver = new MutationObserver(() => scheduleApply(250));
  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export function teardownManualAssist() {
  if (!initialized) return;
  initialized = false;
  document.removeEventListener("pointerdown", onPointerDown, true);
  document.removeEventListener("pointermove", onPointerMove, true);
  document.removeEventListener("pointerup", onPointerUp, true);
  document.removeEventListener("pointercancel", onPointerCancel, true);
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  clearIndicators();
  if (toggleHost) {
    toggleHost.remove();
    toggleHost = null;
  }
  toggleState = { domain: "", autoApply: true, visible: false };
  if (pendingApplyHandle) {
    window.clearTimeout(pendingApplyHandle);
    pendingApplyHandle = null;
  }
  appliedMappingIds.clear();
  resetHoldState();
  closeOverlay();
}

interface OverlayProps {
  payload: OverlayPayload;
  onDismiss: () => void;
}

function ManualAssistOverlay({ payload, onDismiss }: OverlayProps) {
  const { element, signature, domain, pathPattern, control, inputType } =
    payload;
  const [selectedToken, setSelectedToken] = useState<ProfileToken | null>(null);
  const [existing, setExisting] = useState<FieldMappingEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<NormalizedProfile | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const availableOptions = useMemo(() => {
    return TOKEN_OPTIONS.filter((option) => {
      if (!option.controls?.length) return true;
      return option.controls.includes(control);
    });
  }, [control]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [mapping, profileData] = await Promise.all([
          getDomainMappings(domain),
          loadNormalizedProfile(),
        ]);
        if (cancelled) return;
        setProfile(profileData);
        const match = mapping.entries.find(
          (entry) =>
            entry.pathPattern === pathPattern &&
            entry.control === control &&
            entry.signature &&
            signaturesSimilar(entry.signature, signature),
        );
        if (match) {
          setExisting(match);
          setSelectedToken(match.token);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [domain, pathPattern, signature, control]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
    };
  }, [onDismiss]);

  useEffect(() => {
    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLElement) {
      activeEl.blur();
    }
  }, []);

  const fieldLabel =
    signature.labelText ||
    signature.placeholder ||
    signature.name ||
    signature.id ||
    "Untitled field";

  const saveMapping = async () => {
    if (!selectedToken) {
      setStatus("Choose a token to map.");
      return;
    }
    setSaving(true);
    try {
      const liveSignature = buildSignature(element);
      const stored = await recordFieldMapping(domain, {
        token: selectedToken,
        pathPattern,
        signature: liveSignature,
        control,
        inputType,
        id: existing?.id,
      });
      setExisting(stored);
      scheduleApply(120);
      setStatus("Mapping saved.");
      setTimeout(() => {
        onDismiss();
      }, 600);
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : "Unable to save mapping right now.",
      );
    } finally {
      setSaving(false);
    }
  };

  const previewValue = useMemo(() => {
    if (!profile || !selectedToken) return "";
    return tokenPreview(profile, selectedToken);
  }, [profile, selectedToken]);

  return (
    <div className="fixed inset-0 z-[2147483640] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">
              Bind Field to Profile Token
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Hold on any field to open this mapper. Mapping is saved per
              domain.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            onClick={onDismiss}
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M10 8.586 4.707 3.293 3.293 4.707 8.586 10l-5.293 5.293 1.414 1.414L10 11.414l5.293 5.293 1.414-1.414L11.414 10l5.293-5.293-1.414-1.414L10 8.586Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-700">{fieldLabel}</p>
            <p className="text-xs text-slate-500">
              {controlLabel(control, inputType)} • {window.location.hostname}
              {pathPattern}
            </p>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Select token
            </p>
            <div className="mt-2 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1">
              {availableOptions.map((option) => (
                <button
                  key={option.token}
                  type="button"
                  className={`flex w-full flex-col items-start rounded-lg border px-3 py-2 text-left transition ${
                    selectedToken === option.token
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/60"
                  }`}
                  onClick={() => setSelectedToken(option.token)}
                >
                  <span className="text-sm font-medium text-slate-900">
                    {option.label}
                  </span>
                  <span className="text-xs text-slate-500">
                    {option.description}
                  </span>
                </button>
              ))}
              {!availableOptions.length && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  No profile tokens support this field type yet.
                </div>
              )}
            </div>
          </div>
          {selectedToken && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Preview
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {previewValue || "No profile data available for this token."}
              </p>
            </div>
          )}
          {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            onClick={onDismiss}
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {existing && (
              <span className="text-xs text-slate-500">
                Bound to{" "}
                <span className="font-medium text-slate-700">
                  {tokenLabel(existing.token)}
                </span>
              </span>
            )}
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              onClick={saveMapping}
              disabled={saving || loading || !selectedToken}
            >
              {saving ? "Saving…" : "Save Mapping"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function tokenPreview(profile: NormalizedProfile, token: ProfileToken): string {
  switch (token) {
    case "firstName":
      return profile.contact.firstName ?? "";
    case "lastName":
      return profile.contact.lastName ?? "";
    case "fullName":
      return profile.contact.fullName ?? "";
    case "preferredName":
      return profile.contact.preferredName ?? "";
    case "email":
      return profile.contact.email ?? "";
    case "phone":
      return profile.contact.phone ?? "";
    case "addressLine1":
      return profile.contact.addressLine1 ?? "";
    case "addressLine2":
      return profile.contact.addressLine2 ?? "";
    case "city":
      return profile.contact.city ?? "";
    case "state":
      return profile.contact.state ?? "";
    case "postalCode":
      return profile.contact.postalCode ?? "";
    case "country":
      return profile.contact.country ?? "";
    case "linkedin":
      return profile.contact.linkedin ?? "";
    case "website":
      return profile.contact.website ?? "";
    case "currentCompany":
      return profile.experience?.[0]?.company ?? "";
    case "currentTitle":
      return profile.experience?.[0]?.role ?? "";
    case "summary":
      return profile.summary ?? "";
    case "coverLetterText":
      return profile.resumeText ?? "";
    case "resume":
      return profile.resumeVariants?.[0]?.label ?? "";
    default:
      return "";
  }
}

function controlLabel(kind: FieldControlKind, type?: string) {
  switch (kind) {
    case "textarea":
      return "Textarea";
    case "select":
      return "Select";
    case "checkbox":
      return "Checkbox";
    case "radio":
      return "Radio";
    case "file":
      return "File upload";
    default:
      if (type) {
        return `Input (${type})`;
      }
      return "Input";
  }
}

function tokenLabel(token: ProfileToken): string {
  const match = TOKEN_OPTIONS.find((option) => option.token === token);
  return match ? match.label : token;
}

function signaturesSimilar(a: FieldSignature, b: FieldSignature): boolean {
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
      const av = a.dataset[key];
      const bv = b.dataset[key];
      if (av && bv && av === bv) return true;
    }
  }
  return false;
}

export function promptManualAssist(element?: FieldElement) {
  const target =
    element && isFieldElement(element)
      ? element
      : (document.activeElement as FieldElement | null);
  if (target && isFieldElement(target)) {
    const domain = window.location.hostname;
    const pathPattern = computePathPattern(window.location.pathname);
    openOverlay({
      element: target,
      signature: buildSignature(target),
      domain,
      pathPattern,
      control: detectControl(target),
      inputType: target instanceof HTMLInputElement ? target.type : undefined,
    });
    return;
  }
  const toast = document.createElement("div");
  toast.className =
    "fixed bottom-6 right-6 z-[2147483642] rounded-lg bg-slate-900/95 px-4 py-3 text-sm text-white shadow-lg";
  toast.textContent = "Hold on any form field for a moment to map it.";
  document.documentElement.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add("opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}

interface FieldCandidate {
  element: FieldElement;
  signature: FieldSignature;
  control: FieldControlKind;
  inputType?: string;
}

async function ensureProfileData(force = false): Promise<void> {
  if (force) {
    profilePromise = null;
  }
  if (!profilePromise) {
    profilePromise = Promise.all([loadNormalizedProfile(), loadResumeLibrary()])
      .then(([profile, resumes]) => {
        profileCache = profile;
        resumeCache = resumes;
      })
      .catch(() => {
        profileCache = null;
        resumeCache = [];
      });
  }
  await profilePromise;
}

function collectFieldCandidates(): FieldCandidate[] {
  const nodes = Array.from(
    document.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input, textarea, select"),
  );
  const list: FieldCandidate[] = [];
  const seen = new Set<Element>();
  for (const node of nodes) {
    if (seen.has(node)) continue;
    if (!isFieldElement(node)) continue;
    if (node.disabled) continue;
    seen.add(node);
    list.push({
      element: node,
      signature: buildSignature(node),
      control: detectControl(node),
      inputType: node instanceof HTMLInputElement ? node.type : undefined,
    });
  }
  return list;
}

function findCandidateForEntry(
  entry: FieldMappingEntry,
  candidates: FieldCandidate[],
): FieldCandidate | null {
  if (!candidates.length) return null;
  const matches = candidates.filter(
    (candidate) => candidate.control === entry.control,
  );
  const signature = entry.signature;
  if (!matches.length) return null;

  if (signature.id) {
    const match = matches.find(
      (candidate) => candidate.signature.id === signature.id,
    );
    if (match) return match;
  }
  if (signature.name) {
    const match = matches.find(
      (candidate) => candidate.signature.name === signature.name,
    );
    if (match) return match;
  }
  if (signature.dataset) {
    for (const [key, value] of Object.entries(signature.dataset)) {
      const match = matches.find(
        (candidate) => candidate.signature.dataset?.[key] === value,
      );
      if (match) return match;
    }
  }
  const loose = matches.find((candidate) =>
    signaturesSimilar(candidate.signature, signature),
  );
  return loose ?? null;
}

function ensureIndicatorStyles() {
  if (indicatorStylesInjected) return;
  const style = document.createElement("style");
  style.id = INDICATOR_STYLE_ID;
  style.textContent = `
.applyai-mapped-field {
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.5), 0 0 0 4px rgba(191, 219, 254, 0.35) !important;
  transition: box-shadow 0.2s ease;
}
.applyai-mapped-field:hover {
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.8), 0 0 0 5px rgba(191, 219, 254, 0.65) !important;
}
`;
  document.head.appendChild(style);
  indicatorStylesInjected = true;
}

function markFieldIndicator(element: FieldElement, token: ProfileToken) {
  ensureIndicatorStyles();
  element.classList.add("applyai-mapped-field");
  const label = tokenLabel(token);
  if (element instanceof HTMLElement) {
    const prev = element.getAttribute("title");
    if (prev && !prev.startsWith("ApplyAI •")) {
      element.dataset.applyaiPrevTitle = prev;
    } else if (!prev) {
      element.dataset.applyaiPrevTitle = "";
    }
    element.dataset.applyaiTokenLabel = label;
    element.setAttribute("title", `ApplyAI • ${label}`);
  }
}

function clearIndicators() {
  const nodes = document.querySelectorAll<HTMLElement>(".applyai-mapped-field");
  nodes.forEach((node) => {
    node.classList.remove("applyai-mapped-field");
    if (node.dataset.applyaiPrevTitle !== undefined) {
      const prev = node.dataset.applyaiPrevTitle;
      if (prev) {
        node.setAttribute("title", prev);
      } else {
        node.removeAttribute("title");
      }
      delete node.dataset.applyaiPrevTitle;
    }
    delete node.dataset.applyaiTokenLabel;
  });
  appliedMappingIds.clear();
}

function setInputValueNormalized(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): boolean {
  if (!value) return false;
  const prototype = Object.getPrototypeOf(element);
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (setter) {
    setter.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function setSelectValueNormalized(
  field: HTMLSelectElement,
  value: string,
): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  const match = Array.from(field.options).find((option) => {
    const text = option.textContent?.trim().toLowerCase() ?? "";
    const val = option.value?.trim().toLowerCase() ?? "";
    return text === normalized || val === normalized;
  });
  if (match) {
    field.value = match.value;
    field.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  const partial = Array.from(field.options).find((option) => {
    const text = option.textContent?.trim().toLowerCase() ?? "";
    return normalized.includes(text) || text.includes(normalized);
  });
  if (partial) {
    field.value = partial.value;
    field.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  return false;
}

function setCheckboxValueNormalized(
  input: HTMLInputElement,
  value: string,
): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    if (input.checked) {
      input.checked = false;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return true;
  }
  const truthy = ["true", "yes", "y", "1", "on", "checked"];
  const falsy = ["false", "no", "n", "0", "off", "unchecked"];
  const shouldCheck = truthy.includes(normalized)
    ? true
    : falsy.includes(normalized)
      ? false
      : true;
  if (input.checked !== shouldCheck) {
    input.checked = shouldCheck;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
  return true;
}

function setRadioValueNormalized(
  input: HTMLInputElement,
  value: string,
): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  const name = input.name;
  if (name) {
    const radios = document.querySelectorAll<HTMLInputElement>(
      `input[type="radio"][name="${CSS.escape(name)}"]`,
    );
    for (const radio of Array.from(radios)) {
      const radioValue = radio.value?.trim().toLowerCase() ?? "";
      if (radioValue === normalized) {
        if (!radio.checked) {
          radio.checked = true;
          radio.dispatchEvent(new Event("input", { bubbles: true }));
          radio.dispatchEvent(new Event("change", { bubbles: true }));
        }
        return true;
      }
    }
    return false;
  }
  const radioValue = input.value?.trim().toLowerCase() ?? "";
  if (radioValue === normalized) {
    if (!input.checked) {
      input.checked = true;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return true;
  }
  return false;
}

function attachFileToInput(el: HTMLInputElement, file: File) {
  const dt = new DataTransfer();
  dt.items.add(file);
  el.files = dt.files;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function pickResumeAsset(): {
  label: string;
  dataBase64: string;
  mime?: string;
  filename?: string;
} | null {
  if (!profileCache) return null;
  const variants = profileCache.resumeVariants ?? [];
  let candidate =
    (profileCache.defaultResumeId
      ? variants.find((variant) => variant.id === profileCache?.defaultResumeId)
      : null) ?? variants.find((variant) => !!variant);
  if (candidate) {
    const stored = resumeCache.find((item) => item.id === candidate!.id);
    const candidateData =
      typeof (candidate as any)?.dataBase64 === "string"
        ? ((candidate as any).dataBase64 as string)
        : undefined;
    const data = stored?.dataBase64 ?? candidateData;
    if (data) {
      return {
        label: candidate.label ?? "Resume",
        dataBase64: data,
        mime: candidate.mime ?? stored?.mime ?? "application/pdf",
        filename:
          candidate.filename ??
          stored?.filename ??
          candidate.label.replace(/\s+/g, "-").toLowerCase() + ".pdf",
      };
    }
  }
  const fallback = resumeCache.find((item) => item.dataBase64);
  if (fallback) {
    return {
      label: fallback.label ?? "Resume",
      dataBase64: fallback.dataBase64!,
      mime: fallback.mime ?? "application/pdf",
      filename:
        fallback.filename ??
        (fallback.label
          ? fallback.label.replace(/\s+/g, "-").toLowerCase() + ".pdf"
          : "resume.pdf"),
    };
  }
  return null;
}

async function applyEntryToCandidate(
  entry: FieldMappingEntry,
  candidate: FieldCandidate,
): Promise<boolean> {
  if (!profileCache) return false;
  const element = candidate.element;
  try {
    if (entry.control === "file") {
      if (!(element instanceof HTMLInputElement)) return false;
      if (entry.token !== "resume") return false;
      await ensureProfileData();
      const asset = pickResumeAsset();
      if (!asset || !asset.dataBase64) return false;
      const file = makeFileFromBase64(
        asset.dataBase64,
        asset.filename ?? "resume.pdf",
        asset.mime ?? "application/pdf",
      );
      attachFileToInput(element, file);
      markFieldIndicator(element, entry.token);
      return true;
    }
    const value = tokenPreview(profileCache, entry.token);
    if (!value) return false;
    switch (entry.control) {
      case "select":
        if (!(element instanceof HTMLSelectElement)) return false;
        if (!setSelectValueNormalized(element, value)) return false;
        break;
      case "textarea":
        if (
          !(element instanceof HTMLTextAreaElement) &&
          !(element instanceof HTMLInputElement)
        )
          return false;
        if (!setInputValueNormalized(element, value)) return false;
        break;
      case "checkbox":
        if (!(element instanceof HTMLInputElement)) return false;
        if (!setCheckboxValueNormalized(element, value)) return false;
        break;
      case "radio":
        if (!(element instanceof HTMLInputElement)) return false;
        if (!setRadioValueNormalized(element, value)) return false;
        break;
      case "input":
      default:
        if (
          !(element instanceof HTMLInputElement) &&
          !(element instanceof HTMLTextAreaElement)
        )
          return false;
        if (!setInputValueNormalized(element, value)) return false;
        break;
    }
    markFieldIndicator(element, entry.token);
    return true;
  } catch {
    return false;
  }
}

async function applyMappingsToDocument() {
  if (applyInFlight) {
    applyScheduled = true;
    return;
  }
  applyInFlight = true;
  applyScheduled = false;
  try {
    const domain = window.location.hostname;
    const pathPattern = computePathPattern(window.location.pathname);
    const key = `${domain}:${pathPattern}`;
    if (key !== lastAppliedKey) {
      clearIndicators();
      lastAppliedKey = key;
    }
    const mapping = await getDomainMappings(domain);
    updateAutoApplyToggle(
      domain,
      mapping.entries.length > 0,
      mapping.autoApply,
    );
    if (!mapping.autoApply || !mapping.entries.length) {
      return;
    }
    await ensureProfileData();
    if (!profileCache) return;
    const relevant = mapping.entries.filter(
      (entry) => entry.pathPattern === pathPattern,
    );
    if (!relevant.length) return;
    const candidates = collectFieldCandidates();
    for (const entry of relevant) {
      if (appliedMappingIds.has(entry.id)) continue;
      const candidate = findCandidateForEntry(entry, candidates);
      if (!candidate) continue;
      const success = await applyEntryToCandidate(entry, candidate);
      if (success) {
        appliedMappingIds.add(entry.id);
      }
    }
  } finally {
    applyInFlight = false;
    if (applyScheduled) {
      scheduleApply(250);
    }
  }
}

function scheduleApply(delay = 0) {
  if (pendingApplyHandle) {
    window.clearTimeout(pendingApplyHandle);
  }
  pendingApplyHandle = window.setTimeout(() => {
    pendingApplyHandle = null;
    applyMappingsToDocument().catch(() => {
      /* noop */
    });
  }, delay);
}

export function triggerManualApply(delay = 100) {
  scheduleApply(delay);
}

function ensureToggleContainer(): HTMLDivElement {
  if (toggleContainer && toggleContainer.isConnected && toggleShadow)
    return toggleContainer;

  const { host, shadow } = ensurePersistentShadowHost(
    "applyai-autoapply-toggle",
  );
  toggleHost = host;
  toggleShadow = shadow;

  let container = shadow.querySelector<HTMLDivElement>(
    "#applyai-autoapply-toggle-root",
  );
  if (!container) {
    container = document.createElement("div");
    container.id = "applyai-autoapply-toggle-root";
    container.className =
      "fixed bottom-6 left-6 z-[2147483641] flex items-center justify-center";
    shadow.appendChild(container);
  }

  toggleContainer = container;
  return toggleContainer;
}

function updateAutoApplyToggle(
  domain: string,
  hasMappings: boolean,
  autoApply: boolean,
) {
  if (!hasMappings) {
    if (toggleContainer) {
      toggleContainer.innerHTML = "";
    }
    if (toggleHost) {
      toggleHost.remove();
    }
    toggleState = { domain: "", autoApply: true, visible: false };
    toggleHost = null;
    toggleShadow = null;
    toggleContainer = null;
    return;
  }

  if (
    toggleState.visible &&
    toggleState.domain === domain &&
    toggleState.autoApply === autoApply
  ) {
    return;
  }

  toggleState = { domain, autoApply, visible: true };
  const container = ensureToggleContainer();
  container.innerHTML = "";

  const button = document.createElement("button");
  button.type = "button";
  button.className = `rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
    autoApply
      ? "bg-blue-600 hover:bg-blue-700"
      : "bg-slate-500 hover:bg-slate-600"
  }`;
  button.textContent = autoApply
    ? "ApplyAI auto-map: On"
    : "ApplyAI auto-map: Off";

  button.addEventListener("click", async () => {
    const next = !toggleState.autoApply;
    try {
      await setDomainAutoApply(domain, next);
      toggleState = { domain, autoApply: next, visible: true };
      if (!next) {
        clearIndicators();
      } else {
        appliedMappingIds.clear();
        await ensureProfileData(true);
      }
      updateAutoApplyToggle(domain, true, next);
      if (next) {
        scheduleApply(100);
      }
    } catch {
      // ignored
    }
  });

  container.appendChild(button);
}
