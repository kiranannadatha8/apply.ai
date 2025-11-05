import { nanoid } from "../autofill/utils";

const KEY = "applyai.timeline.v1";

export type TimelineEventType = "analyzed" | "saved" | "autofilled";

export interface TimelineEventRecord {
  id: string;
  type: TimelineEventType;
  title: string;
  url: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface TimelineEventInput {
  type: TimelineEventType;
  title: string;
  url: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

export async function logTimelineEvent(
  event: TimelineEventInput,
): Promise<TimelineEventRecord> {
  const { [KEY]: existing = [] } = await chrome.storage.local.get(KEY);
  const record: TimelineEventRecord = {
    id: nanoid(),
    type: event.type,
    title: event.title,
    url: event.url,
    timestamp: event.timestamp ?? Date.now(),
    metadata: event.metadata,
  };
  const next = [record, ...(Array.isArray(existing) ? existing : [])];
  const trimmed = next.slice(0, 500);
  await chrome.storage.local.set({ [KEY]: trimmed });
  return record;
}

export async function listTimelineEvents(
  limit = 100,
): Promise<TimelineEventRecord[]> {
  const { [KEY]: existing = [] } = await chrome.storage.local.get(KEY);
  if (!Array.isArray(existing)) return [];
  return existing.slice(0, limit);
}

export async function clearTimeline() {
  await chrome.storage.local.remove(KEY);
}
