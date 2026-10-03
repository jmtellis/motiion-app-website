import type { AnalyticsEarlySignalsData } from "@/lib/analytics/early-signals";
import type { KpiDashboardData } from "@/lib/analytics/kpi-types";
import type { SignupOtherDetail, SignupSeries } from "@/lib/analytics/signup-series";
import type {
  AnalyticsDashboardData,
  AnalyticsDateRangeKey,
  AnalyticsRecentEvent,
  AnalyticsReferralsData,
  AnalyticsUserSummary,
  AnalyticsUserTimelineEvent,
} from "@/lib/analytics/types";

export type AdminAnalyticsHomeData = {
  rangeKey: AnalyticsDateRangeKey;
  rangeLabel: string;
  sinceIso: string;
  query: string;
  userId: string;
  series: SignupSeries;
  seriesError: string | null;
  earlySignals: AnalyticsEarlySignalsData;
  recentEvents: AnalyticsRecentEvent[];
  referrals: AnalyticsReferralsData;
  searchResults: AnalyticsUserSummary[];
  selectedUser: AnalyticsUserSummary | null;
  userTimeline: AnalyticsUserTimelineEvent[];
  listsError: string | null;
};

export type AdminAnalyticsDetailData = {
  rangeKey: AnalyticsDateRangeKey;
  rangeLabel: string;
  otherDetails: SignupOtherDetail[];
  seriesError: string | null;
  kpi: KpiDashboardData | null;
  dashboard: AnalyticsDashboardData | null;
  detailError: string | null;
};
