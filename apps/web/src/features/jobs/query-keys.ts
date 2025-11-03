import type { BoardFilters, JobListParams } from "./api";

const serialize = (value: Record<string, unknown> | undefined) => {
  if (!value) return undefined;
  const sorted = Object.keys(value)
    .filter((key) => value[key] !== undefined && value[key] !== null && value[key] !== "")
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = value[key] as unknown;
      return acc;
    }, {});
  return JSON.stringify(sorted);
};

export const jobKeys = {
  all: ["jobs"] as const,
  board: (filters?: BoardFilters) =>
    [
      "jobs",
      "board",
      filters ? serialize(filters as Record<string, unknown>) : undefined,
    ] as const,
  list: (params?: JobListParams) =>
    [
      "jobs",
      "list",
      params ? serialize(params as Record<string, unknown>) : undefined,
    ] as const,
  detail: (id: string, scope?: string | undefined) =>
    ["jobs", "detail", id, scope] as const,
  events: (id: string, scope?: string | undefined) =>
    ["jobs", "events", id, scope] as const,
};

export type JobBoardKey = ReturnType<typeof jobKeys.board>;
