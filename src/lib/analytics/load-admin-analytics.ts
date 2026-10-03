import {
  overlayRecentEvent,
  overlayReferralPeople,
  overlayUserSummary,
  profileIdsFromPeople,
} from "@/lib/analytics/apply-profile-identity";
import type { AdminAnalyticsDetailData, AdminAnalyticsHomeData } from "@/lib/analytics/admin-home-data";
import { fetchEarlySignals } from "@/lib/analytics/early-signals-query";
import { fetchKpiDashboard } from "@/lib/analytics/kpi-queries";
import { fetchProfileIdentities } from "@/lib/analytics/profile-identity-query";
import { fetchAnalyticsDashboard, fetchAnalyticsPeopleLists } from "@/lib/analytics/queries";
import { fetchSignupSeries } from "@/lib/analytics/signup-series-query";
import { buildSignupSeries } from "@/lib/analytics/signup-series";
import { parseAnalyticsDateRange } from "@/lib/analytics/date-range";

export async function loadAdminAnalyticsHome(params: {
  range?: string | null;
  query?: string | null;
  user?: string | null;
}): Promise<AdminAnalyticsHomeData> {
  const range = parseAnalyticsDateRange(params.range);
  const [signup, earlySignals, lists] = await Promise.all([
    fetchSignupSeries(range.sinceIso),
    fetchEarlySignals(),
    fetchAnalyticsPeopleLists(params),
  ]);

  const profiles = await fetchProfileIdentities(
    profileIdsFromPeople({
      recentEvents: lists.recentEvents,
      referrals: lists.referrals,
      searchResults: lists.searchResults,
      selectedUser: lists.selectedUser,
      userTimeline: lists.userTimeline,
    }),
  );

  const recentEvents = lists.recentEvents.map((event) => overlayRecentEvent(event, profiles.byUserId));
  const userTimeline = lists.userTimeline.map((event) => overlayRecentEvent(event, profiles.byUserId));
  const searchResults = lists.searchResults.map((user) => overlayUserSummary(user, profiles.byUserId));
  const selectedUser = lists.selectedUser
    ? overlayUserSummary(lists.selectedUser, profiles.byUserId)
    : null;

  return {
    rangeKey: range.key,
    rangeLabel: range.label,
    sinceIso: range.sinceIso,
    query: params.query?.trim() ?? "",
    userId: params.user?.trim() ?? "",
    series: signup.series,
    seriesError: signup.error,
    earlySignals,
    recentEvents,
    referrals: overlayReferralPeople(lists.referrals, profiles.byUserId),
    searchResults,
    selectedUser,
    userTimeline,
    listsError: lists.error ?? profiles.error,
  };
}

export async function loadAdminAnalyticsDetail(params: {
  range?: string | null;
}): Promise<AdminAnalyticsDetailData> {
  const range = parseAnalyticsDateRange(params.range);
  const [signup, kpi, dashboard] = await Promise.all([
    fetchSignupSeries(range.sinceIso),
    fetchKpiDashboard(),
    fetchAnalyticsDashboard(params),
  ]);

  return {
    rangeKey: range.key,
    rangeLabel: range.label,
    otherDetails: signup.error ? buildSignupSeries([], range.sinceIso).otherDetails : signup.series.otherDetails,
    seriesError: signup.error,
    kpi,
    dashboard,
    detailError: dashboard ? null : "Activity detail could not be loaded.",
  };
}
