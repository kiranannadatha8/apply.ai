import { useId, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  DownloadIcon,
  Loader2,
  Minus,
} from "lucide-react";
import Papa from "papaparse";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";

import DashboardNavBar from "./nav-bar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useJobInsights } from "@/features/jobs/hooks";
import {
  formatDelta,
  deltaFromTotals,
  type InsightRangeKey,
  type JobInsightsSummary,
} from "@/features/jobs/analytics";

const RANGE_OPTIONS: { label: string; value: InsightRangeKey }[] = [
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "All Time", value: "all" },
];

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

type KpiDelta = {
  label: string;
  delta: number | null;
  fractionDigits?: number;
};

const EMPTY_BREAKDOWN = { count: 0, percent: 0, label: "—" };

export function Dashboard() {
  const [range, setRange] = useState<InsightRangeKey>("30d");
  const [isExporting, setIsExporting] = useState(false);
  const { data, isLoading, isFetching } = useJobInsights({ rangeKey: range });

  const metrics = useMemo(() => buildMetricSnapshot(data), [data]);

  const handleExportCsv = () => {
    if (!data) return;
    try {
      setIsExporting(true);
      const rows = data.activity.weeks.map((week) => ({
        Label: week.label,
        Start: format(week.start, "yyyy-MM-dd"),
        End: format(week.end, "yyyy-MM-dd"),
        Applications: week.applications,
        Responses: week.responses,
        Interviews: week.interviews,
        "Response Rate (%)": week.applications
          ? ((week.responses / week.applications) * 100).toFixed(1)
          : "0.0",
        "Interview Rate (%)": week.applications
          ? ((week.interviews / week.applications) * 100).toFixed(1)
          : "0.0",
      }));
      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `job-insights-${range}-${format(new Date(), "yyyyMMdd")}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <DashboardNavBar />
      <div className="flex-1 bg-muted/20">
        <div className=" flex w-full flex-1 flex-col gap-6 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Job Insights Dashboard
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Track progress, spot trends, and decide where to focus next.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={range}
                onValueChange={(value) => setRange(value as InsightRangeKey)}
              >
                <SelectTrigger size="sm" className="min-w-40 justify-between">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  {RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={!data || isExporting}
                className="inline-flex items-center gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <DownloadIcon className="h-4 w-4" />
                )}
                Export CSV
              </Button>
            </div>
          </div>

          {isLoading && !data ? (
            <LoadingState />
          ) : data ? (
            <>
              <KpiGrid
                metrics={metrics}
                isRefreshing={isFetching && !isLoading}
              />
              <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
                <ApplicationBreakdowns summary={data} />
                <ActivityCard summary={data} />
              </div>
              <TipCard tip={data.tip} />
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-card/80 border-border/60 animate-pulse rounded-xl border p-6"
        >
          <div className="mb-6 h-3 w-24 rounded-full bg-muted" />
          <div className="mb-4 h-8 w-32 rounded-md bg-muted" />
          <div className="h-3 w-28 rounded-full bg-muted/80" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed py-12 text-center">
      <CardHeader>
        <CardTitle>No job activity yet</CardTitle>
        <CardDescription>
          Once you start adding applications, you’ll see trendlines and insights
          here.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

interface Snapshot {
  totalApplications: number;
  applicationsDelta: KpiDelta;
  avgPerWeek: number;
  avgPerWeekDelta: KpiDelta;
  responseRate: number;
  responseRateDelta: KpiDelta;
  responseTrend: { label: string; value: number }[];
  responseSubtitle: string;
  interviewRate: number;
  interviewRateDelta: KpiDelta;
  interviewTrend: { label: string; value: number }[];
  interviewSubtitle: string;
}

function buildMetricSnapshot(
  summary: JobInsightsSummary | null,
): Snapshot | null {
  if (!summary) return null;

  const totalApplications = summary.totals.applications;
  const applicationsDelta: KpiDelta = {
    label: "from prior period",
    delta: deltaFromTotals(
      summary.totals.applications,
      summary.totals.applicationsPrev,
    ),
  };

  const avgPerWeek = summary.totals.avgApplicationsPerWeek;
  const avgPerWeekDelta: KpiDelta = {
    label: "vs prior pace",
    delta: deltaFromTotals(
      summary.totals.avgApplicationsPerWeek,
      summary.totals.avgApplicationsPerWeekPrev,
    ),
    fractionDigits: 1,
  };

  const responseRate = summary.rates.responseRate * 100;
  const responseRateDelta: KpiDelta = {
    label: "since last period",
    delta: deltaFromTotals(
      summary.rates.responseRate,
      summary.rates.responseRatePrev,
    ),
    fractionDigits: 1,
  };

  const responseTrend = summary.rates.responseTrend.map((point) => ({
    label: point.label,
    value: Math.round(point.rate * 1000) / 10,
  }));

  const interviewRate = summary.rates.interviewRate * 100;
  const interviewRateDelta: KpiDelta = {
    label: "since last period",
    delta: deltaFromTotals(
      summary.rates.interviewRate,
      summary.rates.interviewRatePrev,
    ),
    fractionDigits: 1,
  };

  const interviewTrend = summary.rates.interviewTrend.map((point) => ({
    label: point.label,
    value: Math.round(point.rate * 1000) / 10,
  }));

  return {
    totalApplications,
    applicationsDelta,
    avgPerWeek,
    avgPerWeekDelta,
    responseRate,
    responseRateDelta,
    responseTrend,
    responseSubtitle: `${summary.totals.responses} responses / ${
      summary.totals.applications || 0
    } applications`,
    interviewRate,
    interviewRateDelta,
    interviewTrend,
    interviewSubtitle: `${summary.totals.interviews} interviews / ${
      summary.totals.applications || 0
    } applications`,
  };
}

function KpiGrid({
  metrics,
  isRefreshing,
}: {
  metrics: Snapshot | null;
  isRefreshing: boolean;
}) {
  if (!metrics) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        title="Total Applications"
        value={metrics.totalApplications.toString()}
        delta={metrics.applicationsDelta}
        indicator="period"
        refreshing={isRefreshing}
      />

      <MetricCard
        title="Avg. Applications / Week"
        value={metrics.avgPerWeek.toFixed(1)}
        delta={metrics.avgPerWeekDelta}
        indicator="Target: 10/week"
        refreshing={isRefreshing}
      />

      <MetricCard
        title="Response Rate"
        value={`${metrics.responseRate.toFixed(0)}%`}
        delta={metrics.responseRateDelta}
        indicator={metrics.responseSubtitle}
        refreshing={isRefreshing}
      >
        <Sparkline data={metrics.responseTrend} color="var(--color-chart-2)" />
      </MetricCard>

      <MetricCard
        title="Interview Rate"
        value={`${metrics.interviewRate.toFixed(0)}%`}
        delta={metrics.interviewRateDelta}
        indicator={metrics.interviewSubtitle}
        refreshing={isRefreshing}
      >
        <Sparkline data={metrics.interviewTrend} color="var(--color-chart-4)" />
      </MetricCard>
    </div>
  );
}

function MetricCard({
  title,
  value,
  delta,
  indicator,
  children,
  refreshing,
}: {
  title: string;
  value: string;
  delta: KpiDelta;
  indicator: string;
  children?: React.ReactNode;
  refreshing?: boolean;
}) {
  const deltaMeta = formatDelta(delta.delta, delta.fractionDigits ?? 0);
  const deltaValue = delta.delta ?? 0;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-medium">{title}</CardTitle>
        <div className="flex flex-col items-baseline gap-2">
          <p className="text-5xl my-2 font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/80" />
          ) : (
            <DeltaBadge
              delta={deltaValue}
              meta={deltaMeta}
              label={delta.label}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-4">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {indicator}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

function DeltaBadge({
  delta,
  meta,
  label,
}: {
  delta: number;
  meta: ReturnType<typeof formatDelta>;
  label: string;
}) {
  const isNeutral =
    !Number.isFinite(delta) || meta.isNeutral || Number.isNaN(delta);
  const isPositive = delta >= 0;
  const Icon = isNeutral ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;
  const tone = isNeutral
    ? "text-muted-foreground"
    : isPositive
      ? "text-emerald-500 dark:text-emerald-400"
      : "text-red-500 dark:text-red-400";

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{meta.pct}</span>
      <span className="text-muted-foreground/70 font-normal">({label})</span>
    </span>
  );
}

function Sparkline({
  data,
  color,
}: {
  data: { label: string; value: number }[];
  color: string;
}) {
  const gradientId = useId();

  return (
    <div className="h-16 w-32">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, "Rate"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            name="Rate"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ApplicationBreakdowns({ summary }: { summary: JobInsightsSummary }) {
  const roleItems = summary.breakdowns.roles.slice(0, 4);
  const roleTotal = roleItems.reduce((sum, item) => sum + item.count, 0) || 1;

  const sizeItems = summary.breakdowns.companySizes.filter(
    (item) => item.count > 0,
  );
  const locationItems = summary.breakdowns.locations.slice(0, 4);
  const locationTotal =
    locationItems.reduce((sum, item) => sum + item.count, 0) || 1;

  const chartData = sizeItems.map((item, index) => ({
    name: item.label,
    value: item.count,
    percent: Math.round(item.percent * 100),
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Application Breakdowns</CardTitle>
        <CardDescription>
          Spotlight where your pipeline is concentrated this period.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section>
          <h4 className="text-sm font-semibold text-muted-foreground">
            By Role Focus
          </h4>
          <div className="mt-4 space-y-4">
            {(roleItems.length ? roleItems : [EMPTY_BREAKDOWN]).map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-sm font-medium">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground">
                    {Math.round((item.count / roleTotal) * 100)}% ({item.count})
                  </span>
                </div>
                <div className="bg-muted relative h-2 rounded-full">
                  <div
                    className="bg-foreground/80 absolute inset-y-0 rounded-full"
                    style={{
                      width: `${Math.max(8, Math.round((item.count / roleTotal) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">
              By Company Size
            </h4>
            <div className="flex items-center justify-center">
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={
                        chartData.length
                          ? chartData
                          : [{ name: "No data", value: 1, percent: 100 }]
                      }
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={2}
                    >
                      {(chartData.length
                        ? chartData
                        : [
                            {
                              name: "No data",
                              color: "var(--muted-foreground)",
                            },
                          ]
                      ).map((entry, index) => (
                        <Cell
                          key={`${entry.name}-${index}`}
                          fill={entry.color ?? `var(--muted-foreground)`}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, _name, props) => {
                        const datum =
                          props.payload as (typeof chartData)[number];
                        return [`${datum.percent}%`, datum.name];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-2">
              {(chartData.length
                ? chartData
                : [
                    {
                      name: "No data",
                      percent: 100,
                      color: "var(--muted-foreground)",
                    },
                  ]
              ).map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-muted-foreground">{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">
              By Location
            </h4>
            <div className="space-y-4">
              {(locationItems.length ? locationItems : [EMPTY_BREAKDOWN]).map(
                (item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{item.label}</span>
                      <span className="text-muted-foreground">
                        {Math.round((item.count / locationTotal) * 100)}% (
                        {item.count})
                      </span>
                    </div>
                    <div className="bg-muted relative h-2 rounded-full">
                      <div
                        className="bg-secondary absolute inset-y-0 rounded-full"
                        style={{
                          width: `${Math.max(8, Math.round((item.count / locationTotal) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

function ActivityCard({ summary }: { summary: JobInsightsSummary }) {
  const chartData = summary.activity.weeks.map((week) => ({
    label: week.label,
    applications: week.applications,
    responses: week.responses,
    interviews: week.interviews,
    range: `${format(week.start, "MMM d")} – ${format(week.end, "MMM d")}`,
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Application Activity (Last 4 Weeks)</CardTitle>
        <CardDescription>
          Compare outbound volume with responses and interviews each week.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={12}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
                labelFormatter={(label: string, payload) =>
                  `${label} • ${payload?.[0]?.payload.range ?? ""}`
                }
              />
              <Bar
                dataKey="applications"
                name="Applications"
                fill="var(--color-chart-1)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="responses"
                name="Responses"
                fill="var(--color-chart-2)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="interviews"
                name="Interviews"
                fill="var(--color-chart-4)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <dl className="grid gap-3 rounded-lg border border-dashed px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Applications</dt>
            <dd className="font-medium">
              {summary.activity.totals.applications}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Responses</dt>
            <dd className="font-medium">{summary.activity.totals.responses}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Interviews</dt>
            <dd className="font-medium">
              {summary.activity.totals.interviews}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function TipCard({ tip }: { tip: string }) {
  return (
    <Card className="border-none bg-emerald-50/70 text-emerald-950 dark:bg-emerald-400/5 dark:text-emerald-100">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="text-lg">💡</span>
          Job Search Tip
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed sm:text-base">{tip}</p>
      </CardContent>
    </Card>
  );
}
