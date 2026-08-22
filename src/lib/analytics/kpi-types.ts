export type KpiDirection = "up" | "down";

export type KpiMetric = {
  key: string;
  label: string;
  current: number;
  target: number | null;
  progressPct: number | null;
  periodLabel: string;
  format: "number" | "currency" | "percent";
  hint?: string;
  source?: string;
  direction?: KpiDirection;
};

export type KpiBusinessGoalKey =
  | "creative_os"
  | "trusted_network"
  | "healthy_marketplace"
  | "sustainable_growth"
  | "longterm_expansion";

export type KpiNorthStarGoal = {
  key: KpiBusinessGoalKey;
  businessGoal: string;
  northStarLabel: string;
  status: "active" | "not_started";
  description: string;
  primary: KpiMetric | null;
  supporting: KpiMetric[];
};

export type KpiNorthStarPayload = {
  count: number;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  breakdown: {
    submissions: number;
    registrations: number;
    rsvps: number;
    saves: number;
    bookingRequests: number;
    profileShares: number;
    messages: number;
    analyticsEvents: number;
  };
};

export type KpiBusinessPayload = {
  totalUsers: number;
  dancers: number;
  proSubscribers: number;
  payingDancers: number;
  mrrCents: number;
  arrCents: number;
  newSubsThisMonth: number;
  canceledSubsThisMonth: number;
  trialConversionsThisMonth: number;
  churnRatePct: number;
  yearStart: string;
};

export type KpiSupplyPayload = {
  classesYtd: number;
  sessionsYtd: number;
  castingsYtd: number;
  totalOpportunitiesYtd: number;
  classesThisMonth: number;
  sessionsThisMonth: number;
  castingsThisMonth: number;
  classesThisWeek: number;
  sessionsThisWeek: number;
  castingsThisWeek: number;
  activeCreatorsThisMonth: number;
  repeatCreatorsThisMonth: number;
  repeatCreatorRatePct: number;
};

export type KpiDemandPayload = {
  registrationsThisMonth: number;
  rsvpsThisMonth: number;
  submissionsThisMonth: number;
  engagementRatePct: number;
  classFillRatePct: number;
  avgRsvpsPerSession: number;
  avgSubmissionsPerCasting: number;
};

export type KpiTalentPayload = {
  profileViewsThisMonth: number;
  savesThisMonth: number;
  profileSharesThisMonth: number;
  bookingRequestsThisMonth: number;
  messagesThisMonth: number;
  mauDancers: number;
  avgProfileViewsPerDancer: number;
  avgSavesPerDancer: number;
};

export type KpiRetentionPayload = {
  dau: number;
  wau: number;
  mau: number;
  mapu: number;
  d7RetentionPct: number;
  d30RetentionPct: number;
  d90RetentionPct: number;
};

export type KpiVerifiedProfessionals = {
  total: number;
  talentVerifiedProfiles: number;
  industryIdentityVerified: number;
  source: string;
};

export type KpiWeeklyScorecard = {
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  timezone: "UTC";
  metrics: KpiMetric[];
  sources: Record<string, string>;
};

export type KpiDashboardData = {
  version: "v1";
  northStars: KpiNorthStarGoal[];
  weeklyScorecard: KpiWeeklyScorecard;
  /** MAPO composite from kpi_north_star_monthly — marketplace momentum, not a Notion north star. */
  mapo: KpiNorthStarPayload | null;
  /** @deprecated Use mapo. Kept so older clients still read the MAPO payload. */
  northStar: KpiNorthStarPayload | null;
  verifiedProfessionals: KpiVerifiedProfessionals | null;
  business: KpiBusinessPayload | null;
  supply: KpiSupplyPayload | null;
  demand: KpiDemandPayload | null;
  talent: KpiTalentPayload | null;
  retention: KpiRetentionPayload | null;
  executiveMetrics: KpiMetric[];
  growthMetrics: KpiMetric[];
  supplyMetrics: KpiMetric[];
  demandMetrics: KpiMetric[];
  talentMetrics: KpiMetric[];
  retentionMetrics: KpiMetric[];
  error: string | null;
};
