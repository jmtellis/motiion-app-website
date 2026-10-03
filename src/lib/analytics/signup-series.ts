import { acquisitionSourceOptions } from "@/lib/talent/copy";

export type SignupProfileRow = {
  createdAt: string;
  accountType: string | null;
  acquisitionSource: string | null;
  acquisitionSourceDetail: string | null;
};

export type SignupChartGroup = "Signups" | "How they heard" | "User type";

export type SignupChartMetric = {
  id: string;
  label: string;
  group: SignupChartGroup;
  color: string;
  total: number;
};

export type SignupChartPoint = {
  day: string;
  label: string;
} & Record<string, number | string>;

export type SignupOtherDetail = {
  detail: string;
  count: number;
};

export type SignupSeries = {
  points: SignupChartPoint[];
  metrics: SignupChartMetric[];
  otherDetails: SignupOtherDetail[];
};

const SOURCE_METRICS: Array<Omit<SignupChartMetric, "total">> = [
  { id: "source:instagram", label: "Instagram", group: "How they heard", color: "#f472b6" },
  {
    id: "source:friend_or_referral",
    label: "Friend or referral",
    group: "How they heard",
    color: "#fbbf24",
  },
  {
    id: "source:motiion_founder",
    label: "Motiion founder",
    group: "How they heard",
    color: "#a78bfa",
  },
  { id: "source:event", label: "Event", group: "How they heard", color: "#60a5fa" },
  { id: "source:other", label: "Other", group: "How they heard", color: "#fb7185" },
  {
    id: "source:unrecorded",
    label: "Not recorded",
    group: "How they heard",
    color: "#a3a3a3",
  },
];

const TYPE_METRICS: Array<Omit<SignupChartMetric, "total">> = [
  { id: "type:talent", label: "Talent", group: "User type", color: "#34d399" },
  { id: "type:industry", label: "Industry", group: "User type", color: "#fb923c" },
  { id: "type:community", label: "Community", group: "User type", color: "#818cf8" },
];

const UNSPECIFIED_TYPE: Omit<SignupChartMetric, "total"> = {
  id: "type:unspecified",
  label: "Unspecified type",
  group: "User type",
  color: "#d4d4d4",
};

export const SIGNUP_METRIC_ID = "signups";

export const DEFAULT_SIGNUP_CHART_METRICS = [
  SIGNUP_METRIC_ID,
  "source:instagram",
  "type:talent",
] as const;

const KNOWN_SOURCES = new Set(acquisitionSourceOptions.map((option) => option.value));

export function utcDayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function eachUtcDay(sinceIso: string, until: Date = new Date()) {
  const start = new Date(sinceIso);
  if (Number.isNaN(start.getTime())) return [];
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(until);
  end.setUTCHours(0, 0, 0, 0);
  if (end.getTime() < start.getTime()) return [];

  const days: string[] = [];
  for (let cursor = start.getTime(); cursor <= end.getTime(); cursor += 86_400_000) {
    days.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return days;
}

export function sourceMetricId(source: string | null | undefined) {
  const value = source?.trim().toLowerCase() ?? "";
  if (!value) return "source:unrecorded";
  if (KNOWN_SOURCES.has(value as (typeof acquisitionSourceOptions)[number]["value"])) {
    return `source:${value}`;
  }
  return "source:unrecorded";
}

export function accountTypeMetricId(accountType: string | null | undefined) {
  const value = accountType?.trim().toLowerCase() ?? "";
  if (value === "talent") return "type:talent";
  if (value === "lookingfortalent" || value === "looking_for_talent") return "type:industry";
  if (value === "community") return "type:community";
  return "type:unspecified";
}

function dayLabel(day: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

function emptyCounts(metricIds: string[]) {
  return Object.fromEntries(metricIds.map((id) => [id, 0]));
}

/**
 * Daily account-created counts.
 * Signups, how-they-heard, and user type are the same events split different ways,
 * so every series is a count of accounts and can share one axis.
 * Free-text "Other" details are returned beside the series. They are not plotted:
 * each answer is its own category and would not be a stable line.
 * App referrals are intentionally absent. They are a different attribution path.
 */
export function buildSignupSeries(
  rows: SignupProfileRow[],
  sinceIso: string,
  until: Date = new Date(),
): SignupSeries {
  const metricDefs = [signupMetric(), ...SOURCE_METRICS, ...TYPE_METRICS, UNSPECIFIED_TYPE];
  const metricIds = metricDefs.map((metric) => metric.id);
  const days = eachUtcDay(sinceIso, until);
  const byDay = new Map<string, Record<string, number>>();
  for (const day of days) {
    byDay.set(day, emptyCounts(metricIds));
  }

  const otherCounts = new Map<string, number>();

  for (const row of rows) {
    const day = utcDayKey(row.createdAt);
    if (!day || !byDay.has(day)) continue;
    const bucket = byDay.get(day)!;
    bucket[SIGNUP_METRIC_ID] += 1;
    bucket[sourceMetricId(row.acquisitionSource)] += 1;
    bucket[accountTypeMetricId(row.accountType)] += 1;

    if (sourceMetricId(row.acquisitionSource) === "source:other") {
      const detail = row.acquisitionSourceDetail?.trim().replace(/\s+/g, " ") ?? "";
      if (detail) {
        otherCounts.set(detail, (otherCounts.get(detail) ?? 0) + 1);
      }
    }
  }

  const totals = emptyCounts(metricIds);
  const points: SignupChartPoint[] = days.map((day) => {
    const counts = byDay.get(day) ?? emptyCounts(metricIds);
    for (const id of metricIds) totals[id] += counts[id] ?? 0;
    return { day, label: dayLabel(day), ...counts };
  });

  const metrics = metricDefs
    .filter((metric) => metric.id !== UNSPECIFIED_TYPE.id || totals[metric.id] > 0)
    .map((metric) => ({ ...metric, total: totals[metric.id] ?? 0 }));

  const otherDetails = [...otherCounts.entries()]
    .map(([detail, count]) => ({ detail, count }))
    .sort((a, b) => b.count - a.count || a.detail.localeCompare(b.detail));

  return { points, metrics, otherDetails };
}

function signupMetric(): Omit<SignupChartMetric, "total"> {
  return {
    id: SIGNUP_METRIC_ID,
    label: "Signups",
    group: "Signups",
    color: "#2dd4bf",
  };
}

export function signupMetricGroups(metrics: SignupChartMetric[]) {
  const groups: SignupChartGroup[] = ["Signups", "How they heard", "User type"];
  return groups
    .map((group) => ({
      group,
      metrics: metrics.filter((metric) => metric.group === group),
    }))
    .filter((group) => group.metrics.length > 0);
}
