import {
  differenceInCalendarDays,
  endOfDay,
  format,
  isValid,
  max as maxDate,
  min as minDate,
  startOfDay,
  subDays,
} from "date-fns";

import type { JobRecord } from "./types";

export type InsightRangeKey = "30d" | "90d" | "all";

const RANGE_LABELS: Record<InsightRangeKey, string> = {
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  all: "All Time",
};

export interface TrendPoint {
  label: string;
  start: Date;
  end: Date;
  applications: number;
  responses: number;
  interviews: number;
}

export interface RateTrendPoint {
  label: string;
  rate: number;
}

export interface BreakdownItem {
  key: string;
  label: string;
  count: number;
  percent: number;
  responses?: number;
}

export interface ActivitySnapshot {
  totals: {
    applications: number;
    responses: number;
    interviews: number;
  };
  weeks: TrendPoint[];
}

export interface JobInsightsSummary {
  rangeKey: InsightRangeKey;
  rangeLabel: string;
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  durationDays: number;
  totals: {
    applications: number;
    applicationsPrev: number;
    avgApplicationsPerWeek: number;
    avgApplicationsPerWeekPrev: number;
    responses: number;
    responsesPrev: number;
    interviews: number;
    interviewsPrev: number;
  };
  rates: {
    responseRate: number;
    responseRatePrev: number;
    interviewRate: number;
    interviewRatePrev: number;
    responseTrend: RateTrendPoint[];
    interviewTrend: RateTrendPoint[];
  };
  breakdowns: {
    roles: BreakdownItem[];
    companySizes: BreakdownItem[];
    locations: BreakdownItem[];
  };
  activity: ActivitySnapshot;
  tip: string;
}

interface JobWithDates {
  job: JobRecord;
  appliedAt: Date | null;
  interviewAt: Date | null;
  offerAt: Date | null;
  rejectedAt: Date | null;
  responseAt: Date | null;
}

function parseISODate(value?: string | null): Date | null {
  if (!value) return null;
  const dt = new Date(value);
  return isValid(dt) ? dt : null;
}

function coalesceDate(...values: (Date | null)[]): Date | null {
  const usable = values.filter((date): date is Date => !!date && isValid(date));
  if (!usable.length) return null;
  return usable.reduce((earliest, current) =>
    current.getTime() < earliest.getTime() ? current : earliest,
  );
}

function normaliseJobs(jobs: JobRecord[]): JobWithDates[] {
  return jobs.map((job) => {
    const appliedAt = parseISODate(job.appliedAt ?? job.savedAt ?? job.createdAt);
    const interviewAt = parseISODate(job.interviewAt);
    const offerAt = parseISODate(job.offerAt);
    const rejectedAt = parseISODate(job.rejectedAt);
    const responseAt = coalesceDate(interviewAt, offerAt, rejectedAt);
    return {
      job,
      appliedAt,
      interviewAt,
      offerAt,
      rejectedAt,
      responseAt,
    };
  });
}

interface RangeWindow {
  start: Date;
  end: Date;
}

function resolveRange(
  rangeKey: InsightRangeKey,
  jobs: JobWithDates[],
  now: Date,
): { current: RangeWindow; previous: RangeWindow; durationDays: number } {
  const end = endOfDay(now);

  if (rangeKey === "all") {
    const earliestApplied = jobs
      .map((item) => item.appliedAt)
      .filter((date): date is Date => !!date)
      .reduce<Date | null>((acc, date) => {
        if (!acc) return date;
        return date.getTime() < acc.getTime() ? date : acc;
      }, null);
    const start = earliestApplied
      ? startOfDay(earliestApplied)
      : startOfDay(subDays(end, 29));
    const duration = Math.max(1, differenceInCalendarDays(end, start) + 1);
    const previousStart = startOfDay(subDays(start, duration));
    const previousEnd = endOfDay(subDays(start, 1));
    return {
      current: { start, end },
      previous: { start: previousStart, end: previousEnd },
      durationDays: duration,
    };
  }

  const lookback = rangeKey === "90d" ? 89 : 29;
  const start = startOfDay(subDays(end, lookback));
  const duration = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const previousStart = startOfDay(subDays(start, duration));
  const previousEnd = endOfDay(subDays(start, 1));
  return {
    current: { start, end },
    previous: { start: previousStart, end: previousEnd },
    durationDays: duration,
  };
}

function inWindow(date: Date | null, window: RangeWindow): boolean {
  if (!date) return false;
  const time = date.getTime();
  return time >= window.start.getTime() && time <= window.end.getTime();
}

function safeDelta(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return (current - previous) / previous;
}

function percentage(value: number, total: number): number {
  if (!total) return 0;
  return value / total;
}

function resolveCompanySize(job: JobRecord): string {
  const meta = job.metadata ?? {};
  const raw =
    typeof meta?.companySize === "string"
      ? meta.companySize.toUpperCase()
      : undefined;
  switch (raw) {
    case "STARTUP":
    case "SMALL":
      return "Startup (1-50)";
    case "MID":
    case "MID_SIZE":
    case "MID-SIZE":
    case "GROWTH":
      return "Mid-Size (51-500)";
    case "ENTERPRISE":
    case "LARGE":
      return "Enterprise (501+)";
    default:
      return "Unknown";
  }
}

function resolveRole(job: JobRecord): string {
  const meta = job.metadata ?? {};
  if (typeof meta?.roleCategory === "string" && meta.roleCategory.trim()) {
    return meta.roleCategory;
  }
  const title = job.title.toLowerCase();
  if (title.includes("product manager") || title.includes("product lead")) {
    return "Product Manager";
  }
  if (title.includes("frontend")) {
    return "Frontend Developer";
  }
  if (title.includes("data scientist") || title.includes("machine learning")) {
    return "Data Scientist";
  }
  if (title.includes("devops") || title.includes("platform") || title.includes("infrastructure")) {
    return "DevOps Engineer";
  }
  if (title.includes("robotics")) {
    return "Robotics Engineer";
  }
  if (title.includes("engineer") || title.includes("developer")) {
    return "Software Engineer";
  }
  return "Other";
}

function resolveLocation(job: JobRecord): string {
  const meta = job.metadata ?? {};
  if (typeof meta?.locationBucket === "string" && meta.locationBucket.trim()) {
    return meta.locationBucket;
  }

  const location = job.location?.trim() ?? "";
  if (!location) {
    return job.remote ? "Remote" : "Unknown";
  }
  const lowered = location.toLowerCase();
  if (lowered.includes("remote")) {
    if (lowered.includes("us") || lowered.includes("united states")) {
      return "Remote (US)";
    }
    return "Remote";
  }
  if (location.includes(",")) {
    return location;
  }
  return location.replace(/\s+-\s+/g, " - ");
}

function buildBreakdown(
  jobs: JobWithDates[],
  window: RangeWindow,
  accessor: (job: JobRecord) => string,
): BreakdownItem[] {
  const counts = new Map<string, { count: number; responses: number }>();
  for (const item of jobs) {
    if (!inWindow(item.appliedAt, window)) continue;
    const key = accessor(item.job);
    if (!counts.has(key)) {
      counts.set(key, { count: 0, responses: 0 });
    }
    const entry = counts.get(key)!;
    entry.count += 1;
    if (inWindow(item.responseAt, window)) {
      entry.responses += 1;
    }
  }
  const total = Array.from(counts.values()).reduce(
    (sum, value) => sum + value.count,
    0,
  );
  return Array.from(counts.entries())
    .map(([key, value]) => ({
      key,
      label: key,
      count: value.count,
      percent: total ? value.count / total : 0,
      responses: value.responses,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildWeeklyBuckets(window: RangeWindow): RangeWindow[] {
  const buckets: RangeWindow[] = [];
  const clampedEnd = endOfDay(window.end);
  for (let offset = 3; offset >= 0; offset -= 1) {
    const bucketEnd = endOfDay(subDays(clampedEnd, offset * 7));
    const bucketStart = startOfDay(subDays(bucketEnd, 6));
    const start = maxDate([bucketStart, window.start]);
    const end = minDate([bucketEnd, window.end]);
    buckets.push({ start, end });
  }
  return buckets;
}

function summariseActivity(
  jobs: JobWithDates[],
  window: RangeWindow,
): ActivitySnapshot {
  const weeks: TrendPoint[] = [];
  const weekRanges = buildWeeklyBuckets(window);
  for (let index = 0; index < weekRanges.length; index += 1) {
    const range = weekRanges[index];
    let applications = 0;
    let responses = 0;
    let interviews = 0;
    for (const item of jobs) {
      if (inWindow(item.appliedAt, range)) applications += 1;
      if (inWindow(item.responseAt, range)) responses += 1;
      if (inWindow(item.interviewAt, range)) interviews += 1;
    }
    weeks.push({
      label: `Week ${index + 1}`,
      start: range.start,
      end: range.end,
      applications,
      responses,
      interviews,
    });
  }

  const totals = weeks.reduce(
    (acc, week) => {
      acc.applications += week.applications;
      acc.responses += week.responses;
      acc.interviews += week.interviews;
      return acc;
    },
    { applications: 0, responses: 0, interviews: 0 },
  );

  return { totals, weeks };
}

function buildRateTrend(points: TrendPoint[], pick: keyof TrendPoint): RateTrendPoint[] {
  return points.map((point) => {
    const denominator = point.applications || 0;
    const numerator = point[pick] as number;
    return {
      label: point.label,
      rate: denominator ? numerator / denominator : 0,
    };
  });
}

function composeTip(
  roleBreakdown: BreakdownItem[],
  locationBreakdown: BreakdownItem[],
): string {
  const topRole = roleBreakdown.find((item) => item.responses && item.count >= 2);
  const lowRole = [...roleBreakdown]
    .filter((item) => item.count >= 2)
    .sort((a, b) => {
      const rateA = percentage(a.responses ?? 0, a.count);
      const rateB = percentage(b.responses ?? 0, b.count);
      return rateA - rateB;
    })[0];

  if (topRole && lowRole && topRole.key !== lowRole.key) {
    const topRate = Math.round(percentage(topRole.responses ?? 0, topRole.count) * 100);
    const lowRate = Math.round(percentage(lowRole.responses ?? 0, lowRole.count) * 100);
    if (topRate - lowRate >= 5) {
      return `Your response rate for ${topRole.label} roles is ${topRate}%, compared to ${lowRate}% for ${lowRole.label}. Double down on what’s working or refine your pitch for slower roles.`;
    }
  }

  const remoteBucket = locationBreakdown.find((item) =>
    item.label.toLowerCase().includes("remote"),
  );
  const inPersonBucket = locationBreakdown.find(
    (item) =>
      !item.label.toLowerCase().includes("remote") && item.label !== "Unknown",
  );
  if (remoteBucket && inPersonBucket) {
    if ((remoteBucket.count ?? 0) > (inPersonBucket.count ?? 0) * 1.5) {
      return "Most of your recent applications are remote. Consider balancing with a few in-person roles if you’re open to them.";
    }
    if ((inPersonBucket.count ?? 0) > (remoteBucket.count ?? 0) * 1.5) {
      return "Your search leans heavily toward on-site roles. If flexibility matters, add a few remote-first companies to the pipeline.";
    }
  }

  return "Block 30 minutes for targeted follow-ups this week—response rates climb quickly when companies hear from you again.";
}

export function computeJobInsights(
  jobs: JobRecord[],
  rangeKey: InsightRangeKey,
  now: Date = new Date(),
): JobInsightsSummary {
  const mapped = normaliseJobs(jobs);
  const { current, previous, durationDays } = resolveRange(rangeKey, mapped, now);

  const applications = mapped.filter((item) => inWindow(item.appliedAt, current));
  const applicationsPrev = mapped.filter((item) =>
    inWindow(item.appliedAt, previous),
  );

  const responses = mapped.filter((item) => inWindow(item.responseAt, current));
  const responsesPrev = mapped.filter((item) =>
    inWindow(item.responseAt, previous),
  );

  const interviews = mapped.filter((item) => inWindow(item.interviewAt, current));
  const interviewsPrev = mapped.filter((item) =>
    inWindow(item.interviewAt, previous),
  );

  const avgApplicationsPerWeek =
    durationDays > 0 ? applications.length / (durationDays / 7) : 0;
  const prevDuration =
    differenceInCalendarDays(previous.end, previous.start) + 1 || durationDays;
  const avgApplicationsPerWeekPrev =
    prevDuration > 0 ? applicationsPrev.length / (prevDuration / 7) : 0;

  const responseRate = percentage(responses.length, applications.length);
  const responseRatePrev = percentage(
    responsesPrev.length,
    applicationsPrev.length,
  );
  const interviewRate = percentage(interviews.length, applications.length);
  const interviewRatePrev = percentage(
    interviewsPrev.length,
    applicationsPrev.length,
  );

  const roleBreakdown = buildBreakdown(mapped, current, resolveRole);
  const companyBreakdown = buildBreakdown(mapped, current, resolveCompanySize);
  const locationBreakdown = buildBreakdown(mapped, current, resolveLocation);

  const activity = summariseActivity(mapped, current);
  const responseTrend = buildRateTrend(activity.weeks, "responses");
  const interviewTrend = buildRateTrend(activity.weeks, "interviews");

  const tip = composeTip(roleBreakdown, locationBreakdown);

  return {
    rangeKey,
    rangeLabel: RANGE_LABELS[rangeKey],
    start: current.start,
    end: current.end,
    previousStart: previous.start,
    previousEnd: previous.end,
    durationDays,
    totals: {
      applications: applications.length,
      applicationsPrev: applicationsPrev.length,
      avgApplicationsPerWeek,
      avgApplicationsPerWeekPrev,
      responses: responses.length,
      responsesPrev: responsesPrev.length,
      interviews: interviews.length,
      interviewsPrev: interviewsPrev.length,
    },
    rates: {
      responseRate,
      responseRatePrev,
      interviewRate,
      interviewRatePrev,
      responseTrend,
      interviewTrend,
    },
    breakdowns: {
      roles: roleBreakdown,
      companySizes: companyBreakdown,
      locations: locationBreakdown,
    },
    activity,
    tip,
  };
}

export function formatDelta(value: number | null, fractionDigits = 0): {
  pct: string;
  isPositive: boolean;
  isNeutral: boolean;
} {
  if (value === null) return { pct: "—", isPositive: true, isNeutral: true };
  const pct = value * 100;
  if (Math.abs(pct) < 0.01) {
    return { pct: "0%", isPositive: true, isNeutral: true };
  }
  const formatted = `${pct > 0 ? "+" : ""}${pct.toFixed(fractionDigits)}%`;
  return {
    pct: formatted,
    isPositive: pct >= 0,
    isNeutral: Math.abs(pct) < 0.5,
  };
}

export function deltaFromTotals(current: number, previous: number): number | null {
  return safeDelta(current, previous);
}

export function describeRange(window: RangeWindow): string {
  return `${format(window.start, "MMM d")} – ${format(window.end, "MMM d")}`;
}
