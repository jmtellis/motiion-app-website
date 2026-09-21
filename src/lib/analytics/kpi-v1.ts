import { KPI_GOALS, progressPct } from "@/lib/analytics/kpi-goals";
import type {
  KpiBusinessPayload,
  KpiDirection,
  KpiMetric,
  KpiNorthStarGoal,
  KpiNorthStarPayload,
  KpiRetentionPayload,
  KpiSupplyPayload,
  KpiTalentPayload,
  KpiVerifiedProfessionals,
  KpiWeeklyScorecard,
} from "@/lib/analytics/kpi-types";

export function metric(
  key: string,
  label: string,
  current: number,
  target: number | null,
  format: KpiMetric["format"],
  periodLabel: string,
  hint?: string,
  extras?: { source?: string; direction?: KpiDirection },
): KpiMetric {
  const direction = extras?.direction ?? "up";
  return {
    key,
    label,
    current,
    target,
    progressPct: progressPct(current, target, direction),
    periodLabel,
    format,
    hint,
    source: extras?.source,
    direction,
  };
}

/** ISO week (Monday 00:00 UTC → next Monday) used by the July 29 weekly scorecard. */
export function utcIsoWeekBounds(now = new Date()): {
  start: Date;
  end: Date;
  periodLabel: string;
} {
  const day = now.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + mondayOffset),
  );
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);

  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const endInclusive = new Date(end.getTime() - 1);
  const endLabel = endInclusive.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return {
    start,
    end,
    periodLabel: `${startLabel} – ${endLabel} (UTC week)`,
  };
}

export function emptyWeeklyScorecard(
  bounds: ReturnType<typeof utcIsoWeekBounds> = utcIsoWeekBounds(),
  sources: Record<string, string> = WEEKLY_SCORECARD_SOURCES,
): KpiWeeklyScorecard {
  return {
    periodStart: bounds.start.toISOString(),
    periodEnd: bounds.end.toISOString(),
    periodLabel: bounds.periodLabel,
    timezone: "UTC",
    metrics: [],
    sources,
  };
}

export const WEEKLY_SCORECARD_SOURCES = {
  accountsCreated: "profiles.created_at this UTC week",
  profilesCompleted: "profiles.onboarding_completed_at this UTC week",
  verifiedProfiles:
    "professional_profiles.verified_at + industry_identity_verifications.verified_at this UTC week",
  qualifiedDiscoveryActions:
    "analytics_events: talent_navigator_search_submitted + talent_navigator_search_returned_results + profile_viewed",
  submissions:
    "submissions.created_at this UTC week (fallback: analytics_events.casting_submission_completed)",
  shortlists:
    "analytics_events: shortlist_submitted + shortlist_share_created + casting_candidate_shortlisted; plus casting_shortlist_shares.created_at",
  bookings: "analytics_events.booking_request_sent this UTC week",
} as const;

export type WeeklyScorecardCounts = {
  accountsCreated: number;
  profilesCompleted: number;
  verifiedProfiles: number;
  qualifiedDiscoveryActions: number;
  submissions: number;
  shortlists: number;
  bookings: number;
};

export function buildWeeklyScorecard(
  counts: WeeklyScorecardCounts,
  bounds: ReturnType<typeof utcIsoWeekBounds> = utcIsoWeekBounds(),
): KpiWeeklyScorecard {
  const period = bounds.periodLabel;
  return {
    periodStart: bounds.start.toISOString(),
    periodEnd: bounds.end.toISOString(),
    periodLabel: period,
    timezone: "UTC",
    sources: { ...WEEKLY_SCORECARD_SOURCES },
    metrics: [
      metric(
        "accounts_created",
        "Accounts created",
        counts.accountsCreated,
        null,
        "number",
        period,
        "New profiles rows this UTC week",
        { source: WEEKLY_SCORECARD_SOURCES.accountsCreated },
      ),
      metric(
        "profiles_completed",
        "Profiles completed",
        counts.profilesCompleted,
        null,
        "number",
        period,
        "Onboarding completed this UTC week",
        { source: WEEKLY_SCORECARD_SOURCES.profilesCompleted },
      ),
      metric(
        "verified_profiles",
        "Verified profiles",
        counts.verifiedProfiles,
        null,
        "number",
        period,
        "New talent verifications + industry identity verifications",
        { source: WEEKLY_SCORECARD_SOURCES.verifiedProfiles },
      ),
      metric(
        "qualified_discovery",
        "Qualified discovery actions",
        counts.qualifiedDiscoveryActions,
        null,
        "number",
        period,
        "Navigator searches + searches with results + profile views",
        { source: WEEKLY_SCORECARD_SOURCES.qualifiedDiscoveryActions },
      ),
      metric(
        "submissions",
        "Submissions",
        counts.submissions,
        null,
        "number",
        period,
        "Casting submissions created this week",
        { source: WEEKLY_SCORECARD_SOURCES.submissions },
      ),
      metric(
        "shortlists",
        "Shortlists",
        counts.shortlists,
        null,
        "number",
        period,
        "Shortlist votes, shares, and candidate shortlists",
        { source: WEEKLY_SCORECARD_SOURCES.shortlists },
      ),
      metric(
        "bookings",
        "Bookings",
        counts.bookings,
        null,
        "number",
        period,
        "Booking / availability requests sent",
        { source: WEEKLY_SCORECARD_SOURCES.bookings },
      ),
    ],
  };
}

export function buildNorthStarGoals(input: {
  periodLabel: string;
  retention: KpiRetentionPayload | null;
  talent: KpiTalentPayload | null;
  verified: KpiVerifiedProfessionals | null;
  supply: KpiSupplyPayload | null;
  mapo: KpiNorthStarPayload | null;
  business: KpiBusinessPayload | null;
}): KpiNorthStarGoal[] {
  const period = input.periodLabel;
  const mau = input.retention?.mau ?? 0;
  const dancerMau = input.talent?.mauDancers ?? 0;
  const monthlyOpportunities =
    (input.supply?.classesThisMonth ?? 0) +
    (input.supply?.sessionsThisMonth ?? 0) +
    (input.supply?.castingsThisMonth ?? 0);

  return [
    {
      key: "creative_os",
      businessGoal: "Creative OS",
      northStarLabel: "Monthly Active Professionals",
      status: "active",
      description:
        "Approximate: platform MAU from kpi_retention_summary.mau (signed-in users active this month).",
      primary: metric(
        "monthly_active_professionals",
        "Monthly Active Professionals",
        mau,
        null,
        "number",
        period,
        "Approx. platform MAU — not a dancer-only count",
        { source: "kpi_retention_summary.mau" },
      ),
      supporting: [
        metric(
          "mau_dancers",
          "Dancer MAU",
          dancerMau,
          null,
          "number",
          period,
          "kpi_talent_success.mauDancers",
          { source: "kpi_talent_success.mauDancers" },
        ),
        metric(
          "wau",
          "WAU",
          input.retention?.wau ?? 0,
          null,
          "number",
          "This week",
          "kpi_retention_summary.wau",
          { source: "kpi_retention_summary.wau" },
        ),
      ],
    },
    {
      key: "trusted_network",
      businessGoal: "Trusted Network",
      northStarLabel: "Verified Professionals",
      status: "active",
      description:
        "Talent professional_profiles.is_verified plus industry Stripe Identity verifications. Users in both are counted twice.",
      primary: metric(
        "verified_professionals",
        "Verified Professionals",
        input.verified?.total ?? 0,
        KPI_GOALS.verifiedProfessionals,
        "number",
        "All time",
        input.verified?.source ?? "professional_profiles + industry_identity_verifications",
        { source: input.verified?.source },
      ),
      supporting: [
        metric(
          "talent_verified",
          "Talent verified profiles",
          input.verified?.talentVerifiedProfiles ?? 0,
          null,
          "number",
          "All time",
          "professional_profiles.is_verified",
          { source: "professional_profiles.is_verified" },
        ),
        metric(
          "industry_identity_verified",
          "Industry identity verified",
          input.verified?.industryIdentityVerified ?? 0,
          null,
          "number",
          "All time",
          "industry_identity_verifications.status = verified",
          { source: "industry_identity_verifications.status" },
        ),
      ],
    },
    {
      key: "healthy_marketplace",
      businessGoal: "Healthy Marketplace",
      northStarLabel: "Opportunities Created",
      status: "active",
      description:
        "Classes + sessions + castings year to date from kpi_marketplace_supply.totalOpportunitiesYtd.",
      primary: metric(
        "opportunities_created",
        "Opportunities Created",
        input.supply?.totalOpportunitiesYtd ?? 0,
        KPI_GOALS.annualOpportunities,
        "number",
        "Year to date",
        "Classes + sessions + castings (YTD)",
        { source: "kpi_marketplace_supply.totalOpportunitiesYtd" },
      ),
      supporting: [
        metric(
          "opportunities_this_month",
          "Created this month",
          monthlyOpportunities,
          null,
          "number",
          period,
          "Classes + sessions + castings this month",
          {
            source:
              "kpi_marketplace_supply.classesThisMonth + sessionsThisMonth + castingsThisMonth",
          },
        ),
        metric(
          "mapo_momentum",
          "MAPO (momentum)",
          input.mapo?.count ?? 0,
          null,
          "number",
          input.mapo?.periodLabel ?? period,
          "Monthly Active Professional Opportunities — composite engagement, not a Notion north star",
          { source: "kpi_north_star_monthly.count" },
        ),
      ],
    },
    {
      key: "sustainable_growth",
      businessGoal: "Sustainable Growth",
      northStarLabel: "MRR",
      status: "active",
      description: "Monthly recurring revenue from kpi_business_summary, target $30k/mo.",
      primary: metric(
        "mrr",
        "MRR",
        input.business?.mrrCents ?? 0,
        KPI_GOALS.mrrCents,
        "currency",
        period,
        "kpi_business_summary.mrrCents",
        { source: "kpi_business_summary.mrrCents" },
      ),
      supporting: [
        metric(
          "pro_subscribers",
          "Pro subscribers",
          input.business?.proSubscribers ?? 0,
          KPI_GOALS.proSubscribers,
          "number",
          "Active",
          "Paying Pro dancers",
          { source: "kpi_business_summary.proSubscribers" },
        ),
        metric(
          "arr",
          "ARR",
          input.business?.arrCents ?? 0,
          KPI_GOALS.arrCents,
          "currency",
          "Projected",
          "kpi_business_summary.arrCents",
          { source: "kpi_business_summary.arrCents" },
        ),
        metric(
          "trial_conversions",
          "Trial → paid",
          input.business?.trialConversionsThisMonth ?? 0,
          null,
          "number",
          period,
          "Monthly conversion count. Notion target is 20% rate; trial-start denominator is not in kpi_business_summary yet.",
          { source: "kpi_business_summary.trialConversionsThisMonth" },
        ),
        metric(
          "churn",
          "Churn",
          input.business?.churnRatePct ?? 0,
          KPI_GOALS.churnRatePct,
          "percent",
          period,
          "Lower is better. Notion target <5%/mo.",
          { source: "kpi_business_summary.churnRatePct", direction: "down" },
        ),
      ],
    },
    {
      key: "longterm_expansion",
      businessGoal: "Longterm Expansion",
      northStarLabel: "Deferred",
      status: "not_started",
      description: "Detail cards are deferred for v1. No live metric yet.",
      primary: null,
      supporting: [],
    },
  ];
}

export function flattenNorthStarMetrics(goals: KpiNorthStarGoal[]): KpiMetric[] {
  return goals.flatMap((goal) => [
    ...(goal.primary ? [goal.primary] : []),
    ...goal.supporting,
  ]);
}
