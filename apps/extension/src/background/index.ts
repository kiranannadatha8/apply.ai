// Minimal background to log telemetry and (optionally) forward to an API later.
chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg?.type === "applyai.telemetry") {
    // Dev log
    console.debug("[ApplyAI][telemetry]", msg.payload);
  }
  if (msg?.type === "applyai.analyzeJob") {
    // If banner sends only URL, we can pull JD from content tab via another message.
    // For MVP we assume the content side has JD in memory and will open directly.
    if (_sender.tab?.id) {
      chrome.tabs.sendMessage(_sender.tab.id, {
        type: "applyai.analyzeJob",
        payload: msg.payload,
      });
    }
  }
  if (msg?.type === "applyai.assistToMap") {
    // Open ApplyAI mapping UI (E07) — placeholder route for now
    chrome.tabs.create({
      url: `https://app.applyai.local/mapping?src=${encodeURIComponent(msg.payload.url)}`,
    });
  }
});
import type { DetectionResult } from "../lib/detect/types";
import { getExtToken } from "../services/storage";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const QUEUE_KEY = "applyai.pendingActions.v1";
const AUTOFILL_AUDIT_KEY = "applyai.autofill.audit.v1";
const JOB_STORE_KEY = "applyai.jobRecords.v1";

type PendingAction =
  | {
      kind: "save";
      detection: DetectionResult;
      queuedAt: number;
      attempts: number;
    }
  | {
      kind: "apply";
      jobUrl: string;
      resumeVariantId?: string | null;
      answers?: Array<Record<string, unknown>>;
      coverLetterProvided?: boolean;
      metadata?: Record<string, unknown>;
      board?: string;
      queuedAt: number;
      attempts: number;
    };

type AutofillAudit = {
  detection: {
    url: string;
    board: string;
    version: string;
    confidence: number;
  };
  filledFieldIds: string[];
  skippedFieldIds: string[];
  fileAttachments: string[];
  resumeVariantId: string | null;
  coverLetterProvided: boolean;
  fieldSelections: Record<string, boolean>;
  fileSelections: Record<string, boolean>;
  startedAt: number;
  completedAt: number;
  timestamp: number;
};

let processingQueue = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function postJson(
  path: string,
  body: unknown,
  token: string,
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const err = new Error(
      typeof data === "object" && data?.title ? data.title : res.statusText,
    );
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }

  return { status: res.status, data };
}

function sanitizeDescription(html?: string): string | undefined {
  if (!html) return undefined;
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return undefined;
  return stripped.slice(0, 12000);
}

function boardToSourceKind(board: string): string {
  switch (board) {
    case "greenhouse":
      return "GREENHOUSE";
    case "lever":
      return "LEVER";
    case "workday":
      return "WORKDAY";
    case "indeed":
      return "INDEED";
    case "linkedin":
      return "LINKEDIN";
    default:
      return "OTHER";
  }
}

function extractSourceId(det: DetectionResult): string | undefined {
  try {
    const url = new URL(det.url);
    if (det.board === "greenhouse") {
      const ghJid = url.searchParams.get("gh_jid");
      if (ghJid) return ghJid;
      const match = url.pathname.match(/\/jobs\/(\d+)/);
      if (match) return match[1];
    }
    if (det.board === "lever") {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length) return parts[parts.length - 1];
    }
    if (det.board === "workday") {
      const jobReq = url.searchParams.get("jobReqNo");
      if (jobReq) return jobReq;
      const seg = url.pathname.split("/").pop();
      if (seg && seg.length > 6) return seg;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function attemptSave(
  detection: DetectionResult,
): Promise<"created" | "updated"> {
  const token = await getExtToken();
  if (!token) throw new Error("Missing extension session");

  const companyName =
    detection.fields.company ||
    (() => {
      try {
        const { hostname } = new URL(detection.url);
        return hostname.replace(/^www\./i, "");
      } catch {
        return "Unknown";
      }
    })();

  const domain = (() => {
    try {
      return new URL(detection.url).hostname.replace(/^www\./i, "");
    } catch {
      return undefined;
    }
  })();

  const payload = {
    title: detection.fields.title ?? "Unknown role",
    company: { name: companyName, domain },
    jobUrl: detection.url,
    sourceKind: boardToSourceKind(detection.board),
    sourceId: extractSourceId(detection),
    location: detection.fields.location,
    jdText: sanitizeDescription(detection.fields.description),
    tags: [detection.board],
  };

  const { status } = await postJson("/v1/ext/jobs/save", payload, token);
  return status === 201 ? "created" : "updated";
}

async function attemptApply(action: Extract<PendingAction, { kind: "apply" }>) {
  const token = await getExtToken();
  if (!token) throw new Error("Missing extension session");
  await postJson(
    "/v1/ext/jobs/apply",
    {
      jobUrl: action.jobUrl,
      resumeVariantId: action.resumeVariantId ?? undefined,
      answers: action.answers ?? [],
      coverLetterProvided: action.coverLetterProvided ?? false,
      metadata: {
        board: action.board,
        ...(action.metadata ?? {}),
      },
    },
    token,
  );
}

async function loadQueue(): Promise<PendingAction[]> {
  const { [QUEUE_KEY]: raw } = await chrome.storage.local.get(QUEUE_KEY);
  if (!Array.isArray(raw)) return [];
  return raw as PendingAction[];
}

async function storeQueue(list: PendingAction[]): Promise<void> {
  await chrome.storage.local.set({ [QUEUE_KEY]: list.slice(0, 100) });
}

async function enqueueAction(action: PendingAction) {
  const queue = await loadQueue();
  queue.push(action);
  await storeQueue(queue);
}

function scheduleFlush(delay = 2000) {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await processQueue();
  }, delay);
}

async function processQueue(): Promise<void> {
  if (processingQueue) return;
  processingQueue = true;
  try {
    const queue = await loadQueue();
    if (!queue.length) return;
    const remaining: PendingAction[] = [];
    for (const action of queue) {
      if (action.attempts >= 10) {
        console.warn("[ApplyAI][queue] dropping action after max attempts", action);
        continue;
      }
      const success = await processAction(action);
      if (!success) {
        remaining.push({ ...action, attempts: action.attempts + 1 });
      }
    }
    await storeQueue(remaining);
    if (remaining.length) scheduleFlush(15000);
  } finally {
    processingQueue = false;
  }
}

async function processAction(action: PendingAction): Promise<boolean> {
  const online = globalThis.navigator?.onLine ?? true;
  if (!online) return false;
  try {
    if (action.kind === "save") {
      await attemptSave(action.detection);
      return true;
    }
    if (action.kind === "apply") {
      await attemptApply(action);
      return true;
    }
    return true;
  } catch (err: any) {
    const status = err?.status ?? err?.data?.status;
    if (status && status >= 400 && status < 500 && status !== 429) {
      console.warn("[ApplyAI][queue] dropping non-retryable action", err);
      return true;
    }
    console.warn("[ApplyAI][queue] action failed, will retry", err);
    return false;
  }
}

async function recordAutofillAudit(entry: AutofillAudit) {
  const { [AUTOFILL_AUDIT_KEY]: raw } =
    await chrome.storage.local.get(AUTOFILL_AUDIT_KEY);
  const arr = Array.isArray(raw) ? (raw as AutofillAudit[]) : [];
  arr.push(entry);
  await chrome.storage.local.set({
    [AUTOFILL_AUDIT_KEY]: arr.slice(-200),
  });
}

async function updateJobRecordFromAutofill(payload: {
  url: string;
  resumeVariantId: string | null;
  coverLetterProvided: boolean;
}) {
  const { [JOB_STORE_KEY]: state = {} } =
    await chrome.storage.local.get(JOB_STORE_KEY);
  if (!state || typeof state !== "object") return;
  const existing = state[payload.url];
  if (!existing) return;
  state[payload.url] = {
    ...existing,
    resumeVariantId: payload.resumeVariantId ?? existing.resumeVariantId,
    lastAutofillAt: Date.now(),
  };
  await chrome.storage.local.set({ [JOB_STORE_KEY]: state });
}

async function handleSaveJob(
  detection: DetectionResult,
  tabId?: number,
): Promise<void> {
  try {
    const result = await attemptSave(detection);
    if (typeof tabId === "number") {
      chrome.tabs
        .sendMessage(tabId, {
          type: "applyai.saveJob.result",
          payload: { status: result, url: detection.url },
        })
        .catch(() => {});
    }
  } catch (err) {
    await enqueueAction({
      kind: "save",
      detection,
      queuedAt: Date.now(),
      attempts: 1,
    });
    scheduleFlush();
    if (typeof tabId === "number") {
      chrome.tabs
        .sendMessage(tabId, {
          type: "applyai.saveJob.result",
          payload: { status: "queued", url: detection.url },
        })
        .catch(() => {});
    }
  }
}

async function handleApplyJob(
  payload: {
    jobUrl: string;
    resumeVariantId?: string | null;
    answers?: Array<Record<string, unknown>>;
    coverLetterProvided?: boolean;
    metadata?: Record<string, unknown>;
    board?: string;
  },
  tabId?: number,
): Promise<void> {
  try {
    await attemptApply({
      kind: "apply",
      jobUrl: payload.jobUrl,
      resumeVariantId: payload.resumeVariantId ?? null,
      answers: payload.answers ?? [],
      coverLetterProvided: payload.coverLetterProvided ?? false,
      metadata: payload.metadata ?? {},
      board: payload.board,
      queuedAt: Date.now(),
      attempts: 1,
    });
    if (typeof tabId === "number") {
      chrome.tabs
        .sendMessage(tabId, {
          type: "applyai.applyJob.result",
          payload: { status: "applied", url: payload.jobUrl },
        })
        .catch(() => {});
    }
  } catch (err) {
    await enqueueAction({
      kind: "apply",
      jobUrl: payload.jobUrl,
      resumeVariantId: payload.resumeVariantId ?? null,
      answers: payload.answers ?? [],
      coverLetterProvided: payload.coverLetterProvided ?? false,
      metadata: payload.metadata ?? {},
      board: payload.board,
      queuedAt: Date.now(),
      attempts: 1,
    });
    scheduleFlush();
    if (typeof tabId === "number") {
      chrome.tabs
        .sendMessage(tabId, {
          type: "applyai.applyJob.result",
          payload: { status: "queued", url: payload.jobUrl },
        })
        .catch(() => {});
    }
  }
}

chrome.runtime.onMessage.addListener((msg, sender, _sendResponse) => {
  switch (msg?.type) {
    case "applyai.telemetry":
      console.debug("[ApplyAI][telemetry]", msg.payload);
      break;
    case "applyai.analyzeJob":
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: "applyai.analyzeJob",
          payload: msg.payload,
        });
      }
      break;
    case "applyai.assistToMap":
      chrome.tabs.create({
        url: `https://app.applyai.local/mapping?src=${encodeURIComponent(msg.payload.url)}`,
      });
      break;
    case "applyai.saveJob":
      if (msg.payload?.detection) {
        handleSaveJob(msg.payload.detection as DetectionResult, sender.tab?.id);
      }
      break;
    case "applyai.applyJob":
      if (msg.payload?.jobUrl) {
        handleApplyJob(msg.payload, sender.tab?.id);
      }
      break;
    case "applyai.autofill.completed":
      recordAutofillAudit({
        detection: msg.payload.detection,
        filledFieldIds: msg.payload.result?.filledFieldIds ?? [],
        skippedFieldIds: msg.payload.result?.skippedFieldIds ?? [],
        fileAttachments: msg.payload.result?.fileAttachments ?? [],
        resumeVariantId: msg.payload.resumeVariantId ?? null,
        coverLetterProvided: !!msg.payload.coverLetterProvided,
        fieldSelections: msg.payload.fieldSelections ?? {},
        fileSelections: msg.payload.fileSelections ?? {},
        startedAt: msg.payload.result?.startedAt ?? Date.now(),
        completedAt: msg.payload.result?.completedAt ?? Date.now(),
        timestamp: Date.now(),
      }).catch(() => {});
      updateJobRecordFromAutofill({
        url: msg.payload.detection?.url,
        resumeVariantId: msg.payload.resumeVariantId ?? null,
        coverLetterProvided: !!msg.payload.coverLetterProvided,
      }).catch(() => {});
      break;
    default:
      break;
  }
});

scheduleFlush(1000);
