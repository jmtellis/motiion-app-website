import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  ANALYTICS_EARLY_SIGNAL_ROW_COLUMNS,
  ANALYTICS_SIGNAL_SUMMARY_COLUMNS,
  attachEarlySignalIdentity,
  mapEarlySignalRow,
  mapSignalSummary,
  type AnalyticsEarlySignalsData,
} from "@/lib/analytics/early-signals";
import { fetchProfileIdentities } from "@/lib/analytics/profile-identity-query";
import type { ProfileIdentitySource } from "@/lib/analytics/person-identity";

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

  const mapped = (rowsResult.data ?? [])
    .map((row) => mapEarlySignalRow(row as Record<string, unknown>))
    .filter((row) => row.userId);

  const [profiles, firstEvents] = await Promise.all([
    fetchProfileIdentities(mapped.map((row) => row.userId)),
    fetchFirstActivityEventNames(mapped.map((row) => row.userId)),
  ]);

  return {
    summary: mapSignalSummary(summaryResult.data),
    rows: mapped.map((row) => {
      const profile = profiles.byUserId.get(row.userId);
      const source: ProfileIdentitySource | null = profile
        ? {
            user_id: profile.userId,
            display_name: profile.displayName,
            email: profile.email,
            username: profile.username,
            headshot_urls: profile.avatarUrl ? [profile.avatarUrl] : [],
          }
        : null;
      const storedEventName =
        firstEvents.byUserId.get(row.userId) ??
        (row.firstActivityViewedAt ? "activity_viewed" : null);
      return attachEarlySignalIdentity(row, source, storedEventName);
    }),
    error: profiles.error ?? firstEvents.error,
  };
}

async function fetchFirstActivityEventNames(userIds: string[]): Promise<{
  byUserId: Map<string, string>;
  error: string | null;
}> {
  const byUserId = new Map<string, string>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return { byUserId, error: null };

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return { byUserId, error: "Supabase admin client is not configured." };
  }

  for (let index = 0; index < unique.length; index += 150) {
    const chunk = unique.slice(index, index + 150);
    const pending = new Set(chunk);
    const pageSize = 1000;

    for (let from = 0; pending.size > 0; from += pageSize) {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("user_id, event_name, created_at")
        .eq("event_name", "activity_viewed")
        .in("user_id", chunk)
        .order("created_at", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        return { byUserId, error: error.message };
      }

      const page = data ?? [];
      for (const row of page) {
        const userId = typeof row.user_id === "string" ? row.user_id : "";
        const eventName = typeof row.event_name === "string" ? row.event_name : "";
        if (!userId || !eventName || byUserId.has(userId)) continue;
        byUserId.set(userId, eventName);
        pending.delete(userId);
      }

      if (page.length < pageSize) break;
    }
  }

  return { byUserId, error: null };
}
