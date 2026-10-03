export const ANALYTICS_SIGNAL_SUMMARY_COLUMNS =
  "accounts_created, profile_setup_completed, first_activity_after_setup" as const;

export const ANALYTICS_EARLY_SIGNAL_ROW_COLUMNS =
  "user_id, account_created_at, profile_setup_completed_at, first_activity_viewed_at" as const;

export type AnalyticsSignalSummary = {
  accountsCreated: number;
  profileSetupCompleted: number;
  firstActivityAfterSetup: number;
};

export type AnalyticsEarlySignalRow = {
  userId: string;
  accountCreatedAt: string | null;
  profileSetupCompletedAt: string | null;
  firstActivityViewedAt: string | null;
};

export type AnalyticsEarlySignalsData = {
  summary: AnalyticsSignalSummary;
  rows: AnalyticsEarlySignalRow[];
  error: string | null;
};

function asCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
}

function asTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  return value;
}

export function mapSignalSummary(raw: Record<string, unknown> | null | undefined): AnalyticsSignalSummary {
  return {
    accountsCreated: asCount(raw?.accounts_created),
    profileSetupCompleted: asCount(raw?.profile_setup_completed),
    firstActivityAfterSetup: asCount(raw?.first_activity_after_setup),
  };
}

export function mapEarlySignalRow(raw: Record<string, unknown>): AnalyticsEarlySignalRow {
  return {
    userId: typeof raw.user_id === "string" ? raw.user_id : String(raw.user_id ?? ""),
    accountCreatedAt: asTimestamp(raw.account_created_at),
    profileSetupCompletedAt: asTimestamp(raw.profile_setup_completed_at),
    firstActivityViewedAt: asTimestamp(raw.first_activity_viewed_at),
  };
}
