export type Row = Record<string, unknown>;
export type Source = { rows: Row[]; error: string | null };
export type Sources = Record<string, Source>;
export const sections = [
  "overview",
  "talent",
  "industry",
  "engagement",
  "revenue",
  "reviews",
  "goals",
] as const;
export type Section = (typeof sections)[number];
export const text = (v: unknown) => (typeof v === "string" ? v : "");
export const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const obj = (v: unknown): Row =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : {};
export const number = (v: unknown): number | null =>
  v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v))
    ? Number(v)
    : null;
export const name = (p: Row) =>
  text(p.display_name) ||
  [text(p.first_name), text(p.last_name)].filter(Boolean).join(" ") ||
  text(p.full_name) ||
  "Unnamed account";
export const owner = (r: Row) =>
  text(r.poster_id) ||
  text(r.creator_id) ||
  text(r.owner_id) ||
  text(r.user_id);
export function isTalent(p: Row) {
  return (
    list(p.enabled_shells).includes("talent") || p.account_type === "talent"
  );
}
export function isIndustry(p: Row) {
  return (
    list(p.enabled_shells).includes("industry") ||
    [
      "industry",
      "non_talent",
      "lookingfortalent",
      "looking_for_talent",
    ].includes(text(p.account_type).toLowerCase())
  );
}
export function readiness(p: Row) {
  const checks = [
    Boolean(p.profile_setup_completed_at || p.onboarding_completed_at),
    list(p.headshot_urls).length > 0,
    list(p.profile_visuals).length > 0,
    Boolean(p.resume_url) || list(p.experiences).length > 0,
    list(p.styles).length > 0,
  ];
  return {
    completed: checks.filter(Boolean).length,
    total: checks.length,
    ready: checks.every(Boolean),
    checks,
  };
}
export const readinessLabels = [
  "Setup completed",
  "Headshot added",
  "Video added",
  "Resume or credits added",
  "Styles added",
];
export function projectActive(r: Row, now: Date) {
  return (
    (r.is_active === true ||
      (r.is_active === undefined && r.status === "active")) &&
    obj(r.project_configuration).composer_draft !== true &&
    (!r.end_date ||
      text(r.end_date).slice(0, 10) >= now.toISOString().slice(0, 10))
  );
}
export function activityActive(r: Row, now: Date) {
  return (
    r.status === "active" &&
    Boolean(r.activity_date) &&
    text(r.activity_date).slice(0, 10) >= now.toISOString().slice(0, 10)
  );
}
export function castingOpen(r: Row, now: Date) {
  return (
    r.status === "open" &&
    (!r.submission_deadline || new Date(text(r.submission_deadline)) >= now)
  );
}
export function inPeriod(
  r: Row,
  start: string,
  end: string,
  field = "created_at",
) {
  const t = text(r[field]);
  return (
    Boolean(t) &&
    new Date(t).getTime() >= new Date(start).getTime() &&
    new Date(t).getTime() < new Date(end).getTime()
  );
}
export function uniqueUsers(rows: Row[]) {
  return new Set(rows.map((r) => text(r.user_id)).filter(Boolean)).size;
}
export const meaningfulEvents = [
  "class_registration_completed",
  "session_rsvp_completed",
  "casting_submission_completed",
  "talent_saved_to_list",
  "booking_request_sent",
  "message_sent",
];
export function excludeAccounts(sources: Sources): Sources {
  if (sources.admin_analytics_exclusions?.error) return sources;
  const ids = new Set(
    (sources.admin_analytics_exclusions?.rows ?? []).map((r) =>
      text(r.user_id),
    ),
  );
  const excludedProfileIds = new Set(
    (sources.professional_profiles?.rows ?? [])
      .filter((r) => ids.has(text(r.user_id)))
      .map((r) => text(r.id)),
  );
  const projectIds = new Set(
    (sources.projects?.rows ?? [])
      .filter((r) => ids.has(owner(r)))
      .map((r) => text(r.id)),
  );
  const activityIds = new Set(
    (sources.activities?.rows ?? [])
      .filter((r) => ids.has(owner(r)))
      .map((r) => text(r.id)),
  );
  const listIds = new Set(
    (sources.talent_lists?.rows ?? [])
      .filter((r) => ids.has(owner(r)))
      .map((r) => text(r.id)),
  );
  return Object.fromEntries(
    Object.entries(sources).map(([key, source]) => [
      key,
      key.startsWith("admin_")
        ? source
        : {
            ...source,
            rows: source.rows.filter(
              (r) =>
                !ids.has(owner(r)) &&
                !(key === "non_talent_profiles" && ids.has(text(r.id))) &&
                !ids.has(text(r.profile_id)) &&
                !excludedProfileIds.has(text(r.profile_id)) &&
                !ids.has(text(r.student_id)) &&
                !ids.has(text(r.talent_user_id)) &&
                !ids.has(text(r.industry_user_id)) &&
                !projectIds.has(text(r.project_id)) &&
                !activityIds.has(text(r.activity_id)) &&
                !listIds.has(text(r.list_id)),
            ),
          },
    ]),
  );
}
export function metricValues(
  s: Sources,
  now: Date,
): Record<string, number | null> {
  const count = (key: string, predicate: (r: Row) => boolean) =>
    !s[key] || s[key].error ? null : s[key].rows.filter(predicate).length;
  const talent = count("profiles", (p) => isTalent(p) && readiness(p).ready);
  const industry = count(
    "industry_applications",
    (p) => p.status === "approved",
  );
  const activities = count(
    "activities",
    (p) =>
      ["class", "session"].includes(text(p.type)) &&
      p.is_private === false &&
      activityActive(p, now),
  );
  const castings = count(
    "castings",
    (p) => p.visibility === "public" && castingOpen(p, now),
  );
  const reviews = count(
    "profiles",
    (p) => p.profile_review_status === "pending",
  );
  const applications = count(
    "industry_applications",
    (p) => p.status === "pending",
  );
  const reviewed = [
    ...(s.profile_review_requests?.rows ?? []),
    ...(s.industry_application_reviews?.rows ?? []),
  ]
    .filter((r) => r.status !== "pending")
    .flatMap((r) => {
      const start =
        text(r.submitted_at) || text(obj(r.application_snapshot).submitted_at);
      const end = text(r.reviewed_at) || text(r.created_at);
      return start && end && new Date(end) >= new Date(start)
        ? [(new Date(end).getTime() - new Date(start).getTime()) / 86400000]
        : [];
    });
  return {
    ready_talent: talent,
    approved_industry: industry,
    opportunities:
      activities === null || castings === null ? null : activities + castings,
    review_backlog:
      reviews === null || applications === null ? null : reviews + applications,
    review_days:
      s.profile_review_requests?.error ||
      s.industry_application_reviews?.error ||
      !reviewed.length
        ? null
        : reviewed.reduce((a, b) => a + b, 0) / reviewed.length,
  };
}
export const goalLabels: Record<string, string> = {
  ready_talent: "Ready talent profiles",
  approved_industry: "Approved industry professionals",
  opportunities: "Available opportunities",
  review_backlog: "Pending reviews",
  review_days: "Average review turnaround (days)",
};
export function progress(
  current: number | null,
  target: number,
  lower = false,
) {
  if (current === null) return null;
  return Math.min(
    100,
    Math.max(
      0,
      lower
        ? current <= target
          ? 100
          : (target / current) * 100
        : target > 0
          ? (current / target) * 100
          : 0,
    ),
  );
}
export function currencyTotals(rows: Row[], field: string) {
  const totals: Record<string, number> = {};
  for (const row of rows) {
    const amount = number(row[field]);
    const currency = text(row.currency).toUpperCase();
    if (amount === null || !/^[A-Z]{3}$/.test(currency)) return null;
    totals[currency] = (totals[currency] ?? 0) + amount;
  }
  return totals;
}
export type DashboardData = {
  sources: Sources;
  fetchedAt: string;
  since: string;
  previousSince: string;
  days: number;
  preview: boolean;
};
