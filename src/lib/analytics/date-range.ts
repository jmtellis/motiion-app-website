export type AnalyticsDateRangeKey = "24h" | "7d" | "30d" | "90d";

export type AnalyticsDateRange = {
  key: AnalyticsDateRangeKey;
  label: string;
  days: number;
  sinceIso: string;
};

const RANGE_DAYS: Record<AnalyticsDateRangeKey, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const RANGE_LABELS: Record<AnalyticsDateRangeKey, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

export function parseAnalyticsDateRange(value: string | null | undefined): AnalyticsDateRange {
  const key: AnalyticsDateRangeKey =
    value === "24h" || value === "7d" || value === "30d" || value === "90d" ? value : "30d";

  const days = RANGE_DAYS[key];
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  return {
    key,
    label: RANGE_LABELS[key],
    days,
    sinceIso: since.toISOString(),
  };
}

export const ANALYTICS_DATE_RANGE_OPTIONS: AnalyticsDateRangeKey[] = ["24h", "7d", "30d", "90d"];
