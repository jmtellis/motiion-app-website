import { parseAnalyticsDateRange } from "@/lib/analytics/date-range";
import { getEventLabel } from "@/lib/analytics/events";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  AnalyticsDashboardData,
  AnalyticsDateRangeKey,
  AnalyticsFeatureInsight,
  AnalyticsFunnelStep,
  AnalyticsMetricCard,
  AnalyticsPlatform,
  AnalyticsProductHealth,
  AnalyticsRecentEvent,
  AnalyticsRetentionPoint,
  AnalyticsTimeSeriesPoint,
  AnalyticsUserSummary,
  AnalyticsUserTimelineEvent,
} from "@/lib/analytics/types";

type RpcResult<T> = { data: T | null; error: string | null };

async function callRpc<T>(
  fn: string,
  params: Record<string, unknown>,
): Promise<RpcResult<T>> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return { data: null, error: "Supabase admin client is not configured." };
  }

  const { data, error } = await supabase.rpc(fn, params);
  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as T, error: null };
}

function mapUserSummary(raw: Record<string, unknown>): AnalyticsUserSummary {
  const topEvents = Array.isArray(raw.topEvents)
    ? raw.topEvents.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          eventName: String(row.eventName ?? ""),
          count: Number(row.count ?? 0),
        };
      })
    : [];

  return {
    userId: String(raw.userId ?? ""),
    displayName: String(raw.displayName ?? "Motiion User"),
    email: raw.email ? String(raw.email) : null,
    username: raw.username ? String(raw.username) : null,
    avatarUrl: raw.avatarUrl ? String(raw.avatarUrl) : null,
    accountType: raw.accountType ? String(raw.accountType) : null,
    role: raw.role ? String(raw.role) : null,
    eventCount: Number(raw.event_count ?? raw.eventCount ?? 0),
    sessionCount: Number(raw.session_count ?? raw.sessionCount ?? 0),
    lastSeenAt: String(raw.lastSeenAt ?? raw.last_seen_at ?? ""),
    activeDays: Number(raw.active_days ?? raw.activeDays ?? 0),
    platforms: Array.isArray(raw.platforms)
      ? (raw.platforms as AnalyticsPlatform[])
      : [],
    topEvents,
  };
}

function mapRecentEvent(raw: Record<string, unknown>): AnalyticsRecentEvent {
  return {
    id: String(raw.id ?? ""),
    eventName: String(raw.eventName ?? ""),
    platform: (raw.platform as AnalyticsPlatform) ?? "web",
    path: raw.path ? String(raw.path) : null,
    sessionId: raw.sessionId ? String(raw.sessionId) : null,
    createdAt: String(raw.createdAt ?? ""),
    properties: (raw.properties as Record<string, unknown>) ?? {},
    userId: raw.userId ? String(raw.userId) : null,
    displayName: String(raw.displayName ?? "Anonymous"),
    email: raw.email ? String(raw.email) : null,
    username: raw.username ? String(raw.username) : null,
    avatarUrl: raw.avatarUrl ? String(raw.avatarUrl) : null,
    accountType: raw.accountType ? String(raw.accountType) : null,
    role: raw.role ? String(raw.role) : null,
  };
}

function buildMetrics(raw: Record<string, number>): AnalyticsMetricCard[] {
  const totalEvents = Number(raw.total_events ?? 0);
  const activeUsers = Number(raw.active_users ?? 0);
  const sessions = Number(raw.sessions ?? 0);

  return [
    {
      key: "total_events",
      label: "Total events",
      value: totalEvents,
      hint: "All tracked actions in range",
    },
    {
      key: "active_users",
      label: "Active users",
      value: activeUsers,
      hint: "Unique signed-in users",
    },
    {
      key: "sessions",
      label: "Sessions",
      value: sessions,
      hint: "Distinct web session IDs",
    },
    {
      key: "authenticated_events",
      label: "Signed-in events",
      value: Number(raw.authenticated_events ?? 0),
      hint: "Events tied to a user",
    },
    {
      key: "anonymous_events",
      label: "Anonymous events",
      value: Number(raw.anonymous_events ?? 0),
      hint: "Public page activity",
    },
    {
      key: "events_per_user",
      label: "Events / active user",
      value: activeUsers > 0 ? (totalEvents / activeUsers).toFixed(1) : "0",
      hint: "Engagement intensity",
    },
    {
      key: "web_events",
      label: "Web events",
      value: Number(raw.web_events ?? 0),
    },
    {
      key: "ios_events",
      label: "iOS events",
      value: Number(raw.ios_events ?? 0),
    },
  ];
}

function buildFunnel(raw: Array<Record<string, unknown>>): AnalyticsFunnelStep[] {
  let previousUnique = 0;

  return raw.map((step, index) => {
    const uniqueUsers = Number(step.uniqueUsers ?? 0);
    const conversionRate =
      index === 0 || previousUnique === 0 ? null : (uniqueUsers / previousUnique) * 100;

    if (uniqueUsers > 0) {
      previousUnique = uniqueUsers;
    }

    const eventName = String(step.eventName ?? "");
    return {
      eventName,
      label: getEventLabel(eventName),
      count: Number(step.count ?? 0),
      uniqueUsers,
      conversionRate,
    };
  });
}

export type AnalyticsDashboardParams = {
  range?: string | null;
  query?: string | null;
  user?: string | null;
};

export async function fetchAnalyticsDashboard(
  params: AnalyticsDashboardParams = {},
): Promise<AnalyticsDashboardData | null> {
  const range = parseAnalyticsDateRange(params.range);
  const since = range.sinceIso;

  const [
    metricsResult,
    seriesResult,
    topEventsResult,
    topPathsResult,
    topUsersResult,
    funnelResult,
    retentionResult,
    platformSplitResult,
    accountTypeSplitResult,
    recentResult,
    productHealthResult,
    searchResult,
    selectedUserResult,
    userTimelineResult,
  ] = await Promise.all([
    callRpc<Record<string, number>>("admin_analytics_metrics", { p_since: since }),
    callRpc<AnalyticsTimeSeriesPoint[]>("admin_analytics_daily_series", { p_since: since }),
    callRpc<AnalyticsFeatureInsight[]>("admin_analytics_top_events", { p_since: since, p_limit: 10 }),
    callRpc<AnalyticsFeatureInsight[]>("admin_analytics_top_paths", { p_since: since, p_limit: 10 }),
    callRpc<Array<Record<string, unknown>>>("admin_analytics_top_users", { p_since: since, p_limit: 12 }),
    callRpc<Array<Record<string, unknown>>>("admin_analytics_funnel", { p_since: since }),
    callRpc<AnalyticsRetentionPoint[]>("admin_analytics_retention", { p_since: since }),
    callRpc<Array<{ platform: AnalyticsPlatform; count: number }>>("admin_analytics_platform_split", {
      p_since: since,
    }),
    callRpc<Array<{ accountType: string; count: number }>>("admin_analytics_account_type_split", {
      p_since: since,
    }),
    callRpc<Array<Record<string, unknown>>>("admin_analytics_recent_events", { p_since: since, p_limit: 50 }),
    callRpc<AnalyticsProductHealth>("admin_analytics_product_health", { p_since: since }),
    params.query
      ? callRpc<Array<Record<string, unknown>>>("admin_analytics_search_users", {
          p_query: params.query,
          p_limit: 10,
        })
      : Promise.resolve({ data: [], error: null }),
    params.user
      ? callRpc<Record<string, unknown>>("admin_analytics_user_summary", {
          p_user_id: params.user,
          p_since: since,
        })
      : Promise.resolve({ data: null, error: null }),
    params.user
      ? callRpc<Array<Record<string, unknown>>>("admin_analytics_user_timeline", {
          p_user_id: params.user,
          p_since: since,
          p_limit: 100,
        })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (metricsResult.error) {
    console.error("fetchAnalyticsDashboard error:", metricsResult.error);
    return null;
  }

  const topEvents = (topEventsResult.data ?? []).map((item) => ({
    ...item,
    label: getEventLabel(String(item.key ?? item.label ?? "")),
  }));

  return {
    range: {
      key: range.key as AnalyticsDateRangeKey,
      label: range.label,
      sinceIso: range.sinceIso,
    },
    metrics: buildMetrics(metricsResult.data ?? {}),
    eventVolumeSeries: seriesResult.data ?? [],
    platformSplit: platformSplitResult.data ?? [],
    accountTypeSplit: accountTypeSplitResult.data ?? [],
    topEvents,
    topPaths: topPathsResult.data ?? [],
    topUsers: (topUsersResult.data ?? []).map(mapUserSummary),
    funnel: buildFunnel(funnelResult.data ?? []),
    retention: retentionResult.data ?? [],
    recentEvents: (recentResult.data ?? []).map(mapRecentEvent),
    productHealth: productHealthResult.data ?? {
      messagesSent: 0,
      activeConversations: 0,
      activeSubscriptions: 0,
      trialingSubscriptions: 0,
      canceledSubscriptions: 0,
      appleIapSubscriptions: 0,
      polarSubscriptions: 0,
      profileViews: 0,
      activityViews: 0,
      recentlyViewedRows: 0,
      talentFavorites: 0,
    },
    searchResults: (searchResult.data ?? []).map(mapUserSummary),
    selectedUser: selectedUserResult.data ? mapUserSummary(selectedUserResult.data) : null,
    userTimeline: (userTimelineResult.data ?? []).map(
      (row) => mapRecentEvent(row) as AnalyticsUserTimelineEvent,
    ),
  };
}

// Backward-compatible export for any existing imports
export async function fetchAnalyticsSummary(params?: AnalyticsDashboardParams) {
  return fetchAnalyticsDashboard(params);
}
