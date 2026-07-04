import { KPI_GOALS, progressPct } from "@/lib/analytics/kpi-goals";
import type {
  KpiBusinessPayload,
  KpiDashboardData,
  KpiDemandPayload,
  KpiMetric,
  KpiNorthStarPayload,
  KpiRetentionPayload,
  KpiSupplyPayload,
  KpiTalentPayload,
} from "@/lib/analytics/kpi-types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function num(raw: unknown, fallback = 0): number {
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

async function callKpiRpc<T>(fn: string): Promise<{ data: T | null; error: string | null }> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return { data: null, error: "Supabase admin client is not configured." };
  }

  const { data, error } = await supabase.rpc(fn);
  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as T, error: null };
}

function mapNorthStar(raw: Record<string, unknown>): KpiNorthStarPayload {
  const breakdown = (raw.breakdown ?? {}) as Record<string, unknown>;
  return {
    count: num(raw.count),
    periodStart: String(raw.periodStart ?? ""),
    periodEnd: String(raw.periodEnd ?? ""),
    periodLabel: String(raw.periodLabel ?? "This month"),
    breakdown: {
      submissions: num(breakdown.submissions),
      registrations: num(breakdown.registrations),
      rsvps: num(breakdown.rsvps),
      saves: num(breakdown.saves),
      bookingRequests: num(breakdown.bookingRequests),
      profileShares: num(breakdown.profileShares),
      messages: num(breakdown.messages),
      analyticsEvents: num(breakdown.analyticsEvents),
    },
  };
}

function mapBusiness(raw: Record<string, unknown>): KpiBusinessPayload {
  return {
    totalUsers: num(raw.totalUsers),
    dancers: num(raw.dancers),
    proSubscribers: num(raw.proSubscribers),
    payingDancers: num(raw.payingDancers),
    mrrCents: num(raw.mrrCents),
    arrCents: num(raw.arrCents),
    newSubsThisMonth: num(raw.newSubsThisMonth),
    canceledSubsThisMonth: num(raw.canceledSubsThisMonth),
    trialConversionsThisMonth: num(raw.trialConversionsThisMonth),
    churnRatePct: num(raw.churnRatePct),
    yearStart: String(raw.yearStart ?? ""),
  };
}

function mapSupply(raw: Record<string, unknown>): KpiSupplyPayload {
  return {
    classesYtd: num(raw.classesYtd),
    sessionsYtd: num(raw.sessionsYtd),
    castingsYtd: num(raw.castingsYtd),
    totalOpportunitiesYtd: num(raw.totalOpportunitiesYtd),
    classesThisMonth: num(raw.classesThisMonth),
    sessionsThisMonth: num(raw.sessionsThisMonth),
    castingsThisMonth: num(raw.castingsThisMonth),
    classesThisWeek: num(raw.classesThisWeek),
    sessionsThisWeek: num(raw.sessionsThisWeek),
    castingsThisWeek: num(raw.castingsThisWeek),
    activeCreatorsThisMonth: num(raw.activeCreatorsThisMonth),
    repeatCreatorsThisMonth: num(raw.repeatCreatorsThisMonth),
    repeatCreatorRatePct: num(raw.repeatCreatorRatePct),
  };
}

function mapDemand(raw: Record<string, unknown>): KpiDemandPayload {
  return {
    registrationsThisMonth: num(raw.registrationsThisMonth),
    rsvpsThisMonth: num(raw.rsvpsThisMonth),
    submissionsThisMonth: num(raw.submissionsThisMonth),
    engagementRatePct: num(raw.engagementRatePct),
    classFillRatePct: num(raw.classFillRatePct),
    avgRsvpsPerSession: num(raw.avgRsvpsPerSession),
    avgSubmissionsPerCasting: num(raw.avgSubmissionsPerCasting),
  };
}

function mapTalent(raw: Record<string, unknown>): KpiTalentPayload {
  return {
    profileViewsThisMonth: num(raw.profileViewsThisMonth),
    savesThisMonth: num(raw.savesThisMonth),
    profileSharesThisMonth: num(raw.profileSharesThisMonth),
    bookingRequestsThisMonth: num(raw.bookingRequestsThisMonth),
    messagesThisMonth: num(raw.messagesThisMonth),
    mauDancers: num(raw.mauDancers),
    avgProfileViewsPerDancer: num(raw.avgProfileViewsPerDancer),
    avgSavesPerDancer: num(raw.avgSavesPerDancer),
  };
}

function mapRetention(raw: Record<string, unknown>): KpiRetentionPayload {
  return {
    dau: num(raw.dau),
    wau: num(raw.wau),
    mau: num(raw.mau),
    mapu: num(raw.mapu),
    d7RetentionPct: num(raw.d7RetentionPct),
    d30RetentionPct: num(raw.d30RetentionPct),
    d90RetentionPct: num(raw.d90RetentionPct),
  };
}

function metric(
  key: string,
  label: string,
  current: number,
  target: number | null,
  format: KpiMetric["format"],
  periodLabel: string,
  hint?: string,
): KpiMetric {
  return {
    key,
    label,
    current,
    target,
    progressPct: progressPct(current, target),
    periodLabel,
    format,
    hint,
  };
}

function buildExecutiveMetrics(
  northStar: KpiNorthStarPayload | null,
  business: KpiBusinessPayload | null,
  supply: KpiSupplyPayload | null,
  demand: KpiDemandPayload | null,
  retention: KpiRetentionPayload | null,
): KpiMetric[] {
  const period = northStar?.periodLabel ?? "This month";
  return [
    metric(
      "pro_subscribers",
      "Pro subscribers",
      business?.proSubscribers ?? 0,
      KPI_GOALS.proSubscribers,
      "number",
      "Active",
      "Paying Pro dancers",
    ),
    metric(
      "mrr",
      "MRR",
      business?.mrrCents ?? 0,
      KPI_GOALS.mrrCents,
      "currency",
      period,
    ),
    metric(
      "ytd_opportunities",
      "YTD opportunities",
      supply?.totalOpportunitiesYtd ?? 0,
      KPI_GOALS.annualOpportunities,
      "number",
      "Year to date",
      "Classes + sessions + castings",
    ),
    metric(
      "engagement_rate",
      "Engagement rate",
      demand?.engagementRatePct ?? 0,
      KPI_GOALS.engagementRatePct,
      "percent",
      period,
    ),
    metric(
      "mapu",
      "MAPU",
      retention?.mapu ?? 0,
      null,
      "number",
      period,
      "Monthly active paying users",
    ),
  ];
}

export async function fetchKpiDashboard(): Promise<KpiDashboardData> {
  const [
    northStarResult,
    businessResult,
    supplyResult,
    demandResult,
    talentResult,
    retentionResult,
  ] = await Promise.all([
    callKpiRpc<Record<string, unknown>>("kpi_north_star_monthly"),
    callKpiRpc<Record<string, unknown>>("kpi_business_summary"),
    callKpiRpc<Record<string, unknown>>("kpi_marketplace_supply"),
    callKpiRpc<Record<string, unknown>>("kpi_marketplace_demand"),
    callKpiRpc<Record<string, unknown>>("kpi_talent_success"),
    callKpiRpc<Record<string, unknown>>("kpi_retention_summary"),
  ]);

  const errors = [
    northStarResult.error,
    businessResult.error,
    supplyResult.error,
    demandResult.error,
    talentResult.error,
    retentionResult.error,
  ].filter(Boolean);

  const northStar = northStarResult.data ? mapNorthStar(northStarResult.data) : null;
  const business = businessResult.data ? mapBusiness(businessResult.data) : null;
  const supply = supplyResult.data ? mapSupply(supplyResult.data) : null;
  const demand = demandResult.data ? mapDemand(demandResult.data) : null;
  const talent = talentResult.data ? mapTalent(talentResult.data) : null;
  const retention = retentionResult.data ? mapRetention(retentionResult.data) : null;

  const period = northStar?.periodLabel ?? "This month";

  return {
    northStar,
    business,
    supply,
    demand,
    talent,
    retention,
    executiveMetrics: buildExecutiveMetrics(northStar, business, supply, demand, retention),
    growthMetrics: [
      metric("total_users", "Total users", business?.totalUsers ?? 0, null, "number", "All time"),
      metric("dancers", "Dancers", business?.dancers ?? 0, null, "number", "All time"),
      metric(
        "paying_dancers",
        "Paying dancers",
        business?.payingDancers ?? 0,
        null,
        "number",
        "Starter + Pro",
      ),
      metric(
        "arr",
        "ARR",
        business?.arrCents ?? 0,
        KPI_GOALS.arrCents,
        "currency",
        "Projected",
      ),
      metric(
        "new_subs",
        "New subs (month)",
        business?.newSubsThisMonth ?? 0,
        null,
        "number",
        period,
      ),
      metric(
        "trial_conversions",
        "Trial → paid",
        business?.trialConversionsThisMonth ?? 0,
        null,
        "number",
        period,
      ),
      metric(
        "churn",
        "Churn rate",
        business?.churnRatePct ?? 0,
        null,
        "percent",
        period,
      ),
    ],
    supplyMetrics: [
      metric(
        "classes_ytd",
        "Classes (YTD)",
        supply?.classesYtd ?? 0,
        KPI_GOALS.annualClasses,
        "number",
        "Year to date",
      ),
      metric(
        "sessions_ytd",
        "Sessions (YTD)",
        supply?.sessionsYtd ?? 0,
        KPI_GOALS.annualSessions,
        "number",
        "Year to date",
      ),
      metric(
        "castings_ytd",
        "Castings (YTD)",
        supply?.castingsYtd ?? 0,
        KPI_GOALS.annualCastings,
        "number",
        "Year to date",
      ),
      metric(
        "active_creators",
        "Active creators",
        supply?.activeCreatorsThisMonth ?? 0,
        null,
        "number",
        period,
      ),
      metric(
        "repeat_creator_rate",
        "Repeat creator rate",
        supply?.repeatCreatorRatePct ?? 0,
        null,
        "percent",
        period,
      ),
    ],
    demandMetrics: [
      metric(
        "registrations",
        "Class registrations",
        demand?.registrationsThisMonth ?? 0,
        null,
        "number",
        period,
      ),
      metric("rsvps", "Session RSVPs", demand?.rsvpsThisMonth ?? 0, null, "number", period),
      metric(
        "submissions",
        "Casting submissions",
        demand?.submissionsThisMonth ?? 0,
        null,
        "number",
        period,
      ),
      metric(
        "class_fill",
        "Class fill rate",
        demand?.classFillRatePct ?? 0,
        KPI_GOALS.classFillRatePct,
        "percent",
        period,
      ),
      metric(
        "avg_rsvps",
        "Avg RSVPs / session",
        demand?.avgRsvpsPerSession ?? 0,
        KPI_GOALS.avgRsvpsPerSession,
        "number",
        period,
      ),
      metric(
        "avg_submissions",
        "Avg submissions / casting",
        demand?.avgSubmissionsPerCasting ?? 0,
        KPI_GOALS.avgSubmissionsPerCasting,
        "number",
        period,
      ),
    ],
    talentMetrics: [
      metric(
        "profile_views",
        "Profile views",
        talent?.profileViewsThisMonth ?? 0,
        null,
        "number",
        period,
      ),
      metric("saves", "Talent saves", talent?.savesThisMonth ?? 0, null, "number", period),
      metric("shares", "Profile shares", talent?.profileSharesThisMonth ?? 0, null, "number", period),
      metric(
        "booking_requests",
        "Booking requests",
        talent?.bookingRequestsThisMonth ?? 0,
        null,
        "number",
        period,
      ),
      metric("messages", "Messages", talent?.messagesThisMonth ?? 0, null, "number", period),
      metric(
        "avg_views_per_dancer",
        "Avg views / dancer",
        talent?.avgProfileViewsPerDancer ?? 0,
        null,
        "number",
        period,
      ),
    ],
    retentionMetrics: [
      metric("dau", "DAU", retention?.dau ?? 0, null, "number", "Today"),
      metric("wau", "WAU", retention?.wau ?? 0, null, "number", "This week"),
      metric("mau", "MAU", retention?.mau ?? 0, null, "number", period),
      metric("d7", "D7 retention", retention?.d7RetentionPct ?? 0, null, "percent", "Cohort"),
      metric("d30", "D30 retention", retention?.d30RetentionPct ?? 0, null, "percent", "Cohort"),
      metric("d90", "D90 retention", retention?.d90RetentionPct ?? 0, null, "percent", "Cohort"),
    ],
    error: errors.length > 0 ? errors[0] ?? null : null,
  };
}
