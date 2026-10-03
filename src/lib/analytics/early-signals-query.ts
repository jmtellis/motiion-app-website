import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  ANALYTICS_EARLY_SIGNAL_ROW_COLUMNS,
  ANALYTICS_SIGNAL_SUMMARY_COLUMNS,
  mapEarlySignalRow,
  mapSignalSummary,
  type AnalyticsEarlySignalsData,
} from "@/lib/analytics/early-signals";

export async function fetchEarlySignals(): Promise<AnalyticsEarlySignalsData> {
  const empty: AnalyticsEarlySignalsData = {
    summary: mapSignalSummary(null),
    rows: [],
    error: null,
  };

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return { ...empty, error: "Supabase admin client is not configured." };
  }

  const [summaryResult, rowsResult] = await Promise.all([
    supabase
      .from("analytics_signal_summary")
      .select(ANALYTICS_SIGNAL_SUMMARY_COLUMNS)
      .maybeSingle<Record<string, unknown>>(),
    supabase
      .from("analytics_early_signals")
      .select(ANALYTICS_EARLY_SIGNAL_ROW_COLUMNS)
      .order("account_created_at", { ascending: false }),
  ]);

  if (summaryResult.error) {
    return { ...empty, error: summaryResult.error.message };
  }

  if (rowsResult.error) {
    return {
      summary: mapSignalSummary(summaryResult.data),
      rows: [],
      error: rowsResult.error.message,
    };
  }

  return {
    summary: mapSignalSummary(summaryResult.data),
    rows: (rowsResult.data ?? [])
      .map((row) => mapEarlySignalRow(row as Record<string, unknown>))
      .filter((row) => row.userId),
    error: null,
  };
}
