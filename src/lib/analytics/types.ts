export type AnalyticsPlatform = "web" | "ios";

export type AnalyticsDateRangeKey = "24h" | "7d" | "30d" | "90d";

export type AnalyticsEventInsert = {
  user_id?: string | null;
  session_id?: string | null;
  platform: AnalyticsPlatform;
  event_name: string;
  properties?: Record<string, unknown>;
  path?: string | null;
};

export type AnalyticsMetricCard = {
  key: string;
  label: string;
  value: number | string;
  hint?: string;
};

export type AnalyticsTimeSeriesPoint = {
  day: string;
  events: number;
  activeUsers: number;
  webEvents: number;
  iosEvents: number;
};

export type AnalyticsFeatureInsight = {
  key: string;
  label: string;
  count: number;
  uniqueUsers?: number;
};

export type AnalyticsFunnelStep = {
  eventName: string;
  label: string;
  count: number;
  uniqueUsers: number;
  conversionRate: number | null;
};

export type AnalyticsRetentionPoint = {
  day: string;
  returningUsers: number;
};

export type AnalyticsEnrichedUser = {
  userId: string;
  displayName: string;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
  accountType: string | null;
  role: string | null;
};

export type AnalyticsUserSummary = AnalyticsEnrichedUser & {
  eventCount: number;
  sessionCount: number;
  lastSeenAt: string;
  topEvents: Array<{ eventName: string; count: number }>;
  activeDays: number;
  platforms: AnalyticsPlatform[];
};

export type AnalyticsRecentEvent = {
  id: string;
  eventName: string;
  platform: AnalyticsPlatform;
  path: string | null;
  sessionId: string | null;
  createdAt: string;
  properties: Record<string, unknown>;
  userId: string | null;
  displayName: string;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
  accountType: string | null;
  role: string | null;
};

export type AnalyticsUserTimelineEvent = AnalyticsRecentEvent;

export type AnalyticsProductHealth = {
  messagesSent: number;
  activeConversations: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  canceledSubscriptions: number;
  appleIapSubscriptions: number;
  polarSubscriptions: number;
  profileViews: number;
  activityViews: number;
  recentlyViewedRows: number;
  talentFavorites: number;
};

export type AnalyticsReferralSource = "deep_link" | "manual_code";

export type AnalyticsTopReferrer = {
  userId: string;
  displayName: string;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  referralCount: number;
};

export type AnalyticsRecentReferral = {
  id: string;
  createdAt: string;
  source: AnalyticsReferralSource | string;
  referralCode: string;
  referrerUserId: string;
  referrerDisplayName: string;
  referrerUsername: string | null;
  refereeUserId: string;
  refereeDisplayName: string;
  refereeUsername: string | null;
  refereeEmail: string | null;
};

export type AnalyticsReferralsData = {
  referredSignups: number;
  topReferrers: AnalyticsTopReferrer[];
  recentReferrals: AnalyticsRecentReferral[];
};

export type AnalyticsDashboardData = {
  range: {
    key: AnalyticsDateRangeKey;
    label: string;
    sinceIso: string;
  };
  metrics: AnalyticsMetricCard[];
  eventVolumeSeries: AnalyticsTimeSeriesPoint[];
  platformSplit: Array<{ platform: AnalyticsPlatform; count: number }>;
  accountTypeSplit: Array<{ accountType: string; count: number }>;
  topEvents: AnalyticsFeatureInsight[];
  topPaths: AnalyticsFeatureInsight[];
  topUsers: AnalyticsUserSummary[];
  funnel: AnalyticsFunnelStep[];
  retention: AnalyticsRetentionPoint[];
  recentEvents: AnalyticsRecentEvent[];
  productHealth: AnalyticsProductHealth;
  referrals: AnalyticsReferralsData;
  searchResults: AnalyticsUserSummary[];
  selectedUser: AnalyticsUserSummary | null;
  userTimeline: AnalyticsUserTimelineEvent[];
};
