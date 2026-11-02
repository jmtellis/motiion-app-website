/* eslint-disable @next/next/no-img-element -- Admin preview displays stored external headshot URLs. */
import Link from "next/link";
import { AccountDetail } from "./AccountDetail";
import { PersonAvatar } from "./PersonAvatar";
import { industryReviewProfile } from "@/lib/admin-dashboard/industry-review";
import { personImageCandidates } from "@/lib/admin-dashboard/avatar";
import { sortDirectory, directoryState } from "@/lib/admin-dashboard/directory";
import { buildTrend, type TrendKind } from "@/lib/admin-dashboard/trends";
import { TrendChart } from "./TrendChart";
import { TrendSelector } from "./TrendSelector";
import { BusinessScorecard } from "./BusinessScorecard";
import { recordedMoney } from "@/lib/admin-dashboard/finance";
import { ArrowUpRight, ArrowRight, Clock3 } from "lucide-react";
import {
  activityActive,
  castingOpen,
  goalLabels,
  inPeriod,
  isIndustry,
  isTalent,
  list,
  meaningfulEvents,
  metricValues,
  name,
  number,
  obj,
  owner,
  progress,
  projectActive,
  readiness,
  readinessLabels,
  sections,
  text,
  uniqueUsers,
  type DashboardData,
  type Row,
  type Section,
} from "@/lib/admin-dashboard/model";
import { ExclusionEditor, GoalEditor, TalentReview } from "./Editors";
import { IndustryApplicationReview } from "@/components/admin/IndustryApplicationReview";
import type { IndustryApplication } from "@/lib/talent-buyers/industry-application";
const fmt = (n: number | null) =>
  n === null
    ? "—"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n);
const date = (s: unknown) =>
  text(s) && Number.isFinite(new Date(text(s)).getTime())
    ? new Date(text(s)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Not recorded";
const safeUrl = (v: unknown) => {
  try {
    const url = new URL(text(v));
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};
function Stat({
  label,
  value,
  hint,
  definition,
  href,
}: {
  label: string;
  value: number | null;
  hint: string;
  definition?: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="launch-stat-label">
        {label}
        {href && <ArrowUpRight size={14} />}
      </div>
      <div className="launch-stat-value">{fmt(value)}</div>
      <p className="launch-stat-foot">{hint}</p>
      {definition && <p className="launch-stat-def">{definition}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="launch-card">
      {content}
    </Link>
  ) : (
    <div className="launch-card">{content}</div>
  );
}
function Person({
  p,
  href,
  subtitle,
  industry,
}: {
  p: Row;
  href: string;
  subtitle?: string;
  industry?: boolean;
}) {
  return (
    <Link className="launch-person" href={href}>
      <PersonAvatar key={text(p.user_id)} urls={personImageCandidates(p, industry)} name={name(p)} />
      <span>
        {name(p)}
        <small>
          {subtitle ||
            text(p.email) ||
            (text(p.username) ? `@${text(p.username)}` : "Email not recorded")}
        </small>
      </span>
    </Link>
  );
}
function Pill({ value }: { value: unknown }) {
  const v = text(value);
  return (
    <span
      className={`launch-pill ${v === "approved" || v === "Ready" ? "green" : v === "pending" ? "orange" : ""}`}
    >
      {v.replaceAll("_", " ") || "Not recorded"}
    </span>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="launch-empty">{children}</p>;
}
export function Dashboard({
  data,
  params,
  detailUserId,
}: {
  detailUserId?: string;
  data: DashboardData;
  params: Record<string, string | undefined>;
}) {
  const s = data.sources;
  const now = new Date(data.fetchedAt);
  const view = sections.includes(params.view as Section)
    ? (params.view as Section)
    : "overview";
  const rows = (key: string) => s[key]?.rows ?? [];
  const ok = (...keys: string[]) => keys.every((k) => s[k] && !s[k].error);
  const count = (key: string, predicate: (r: Row) => boolean = () => true) =>
    ok(key) ? rows(key).filter(predicate).length : null;
  const base = data.preview ? "/preview/admin-analytics" : "/admin/analytics";
  const href = (v: string, extra: Record<string, string> = {}) => {
    const {user,...state} = extra;
    const query = new URLSearchParams({ view:v, range:String(data.days), ...state });
    return `${base}${user ? `/users/${encodeURIComponent(user)}` : ""}?${query}`;
  };
  const people = rows("profiles");
  const goals = rows("admin_launch_goals");
  const values = metricValues(s, now);
  const profile = (id: string) =>
    people.find((p) => p.user_id === id) ?? {
      display_name: "Unknown creator",
      user_id: id,
    };
  const personHref = (p: Row) =>
    href(isIndustry(p) ? "industry" : "talent", { ...directoryState(params), user: text(p.user_id) });
  const period = (r: Row, field = "created_at") =>
    inPeriod(r, data.since, data.fetchedAt, field);
  const app = (id: string) =>
    rows("industry_applications").find((a) => a.user_id === id);
  const company = (p: Row) =>
    text(app(text(p.user_id))?.organization) ||
    text(
      rows("non_talent_profiles").find((n) => n.id === p.user_id)?.company_name,
    ) ||
    text(
      rows("non_talent_profiles").find((n) => n.id === p.user_id)
        ?.organization_name,
    ) ||
    "Affiliation not recorded";
  const sourceNote = (key: string) =>
    ok(key) ? "" : "Source unavailable. No total is inferred.";
  const pendingTalent = count(
    "profiles",
    (p) => p.profile_review_status === "pending",
  );
  const pendingIndustry = count(
    "industry_applications",
    (p) => p.status === "pending",
  );
  const reviewAges = [
    ...rows("profile_review_requests").filter((r) => r.status === "pending"),
    ...rows("industry_applications").filter((r) => r.status === "pending"),
  ]
    .map((r) => text(r.submitted_at))
    .filter(Boolean)
    .sort();
  const oldest =
    ok("profile_review_requests", "industry_applications") && reviewAges.length
      ? Math.max(
          0,
          Math.floor(
            (now.getTime() - new Date(reviewAges[0]).getTime()) / 86400000,
          ),
        )
      : null;
  const titles: Record<Section, [string, string]> = {
    overview: [
      "Motiion at a glance.",
      "Growth, pending reviews, and the business today.",
    ],
    talent: [
      "The talent behind Motiion.",
      "Find people, understand readiness, and see what comes next.",
    ],
    industry: [
      "Build the industry side.",
      "Company affiliations, access, and professional activity in one place.",
    ],
    engagement: [
      "From sign-up to showing up.",
      "Observed activity and adoption, with coverage made clear.",
    ],
    revenue: [
      "Follow the money clearly.",
      "Subscriptions, one-time charges, and marketplace money kept separate.",
    ],
    reviews: [
      "Help good people get started.",
      "One inbox for industry applications and submitted talent profiles.",
    ],
    goals: [
      "Business KPI scorecard.",
      "Current priorities, documented targets, and measurement coverage.",
    ],
  };
  const linkTitle = (
    title: string,
    sub?: string,
    link?: string,
    label = "View all",
  ) => (
    <div className="launch-card-head">
      <div>
        <h2>{title}</h2>
        {sub && <p className="launch-subtitle">{sub}</p>}
      </div>
      {link && <Link href={link}>{label} →</Link>}
    </div>
  );
  const profilePreview = (p: Row) => (
    <>
      <div className="launch-inline">
        <Person industry={view === "industry" ? true : view === "talent" ? false : undefined} p={p} href={personHref(p)} />
        <Pill value={p.profile_review_status} />
        {text(p.username) && (
          <a
            className="launch-link"
            href={`/profile/${encodeURIComponent(text(p.username))}`}
            target="_blank"
            rel="noreferrer"
          >
            Public profile ↗
          </a>
        )}
      </div>
      <div className="launch-media">
        {list(p.headshot_urls)
          .slice(0, 4)
          .map((u, i) =>
            safeUrl(u) ? (
              <a key={i} href={safeUrl(u)!} target="_blank" rel="noreferrer">
                <img src={safeUrl(u)!} alt={`${name(p)} headshot ${i + 1}`} />
              </a>
            ) : null,
          )}
        {list(p.profile_visuals)
          .slice(0, 2)
          .map((v, i) =>
            safeUrl(obj(v).url) ? (
              <a
                className="launch-button secondary"
                key={i}
                href={safeUrl(obj(v).url)!}
                target="_blank"
                rel="noreferrer"
              >
                View {text(obj(v).kind) || "video"} ↗
              </a>
            ) : null,
          )}
      </div>
      <div className="launch-checks">
        {readiness(p).checks.map((yes, i) => (
          <span className={`launch-pill ${yes ? "green" : ""}`} key={i}>
            {yes ? "✓" : "○"} {readinessLabels[i]}
          </span>
        ))}
      </div>
      {safeUrl(p.resume_url) && (
        <a
          className="launch-link"
          href={safeUrl(p.resume_url)!}
          target="_blank"
          rel="noreferrer"
        >
          Open resume ↗
        </a>
      )}
    </>
  );
  function inventory() {
    const entries: [
      string,
      string,
      (r: Row) => boolean,
      (r: Row) => boolean,
      string,
    ][] = [
      [
        "Projects",
        "projects",
        () => true,
        (r) => projectActive(r, now),
        "Active flag, not a draft, and no past end date.",
      ],
      [
        "Classes",
        "activities",
        (r) => r.type === "class",
        (r) => activityActive(r, now),
        "Active status and activity date today or later (UTC).",
      ],
      [
        "Sessions",
        "activities",
        (r) => r.type === "session",
        (r) => activityActive(r, now),
        "Dance sessions; active status and date today or later.",
      ],
      [
        "Castings",
        "castings",
        () => true,
        (r) => castingOpen(r, now),
        "Open status and no expired submission deadline.",
      ],
      [
        "Rosters",
        "talent_lists",
        (r) => r.kind !== "favorites",
        () => true,
        "Current roster lists, excluding favorites.",
      ],
    ];
    return (
      <>
        <div className="launch-section-title">
          <h2>Platform at a glance</h2>
          <span>
            Current stock · created in the last {data.days} days below
          </span>
        </div>
        <div className="launch-grid four">
          {entries.map(([label, key, pred, active, def]) => (
            <Stat
              key={label}
              label={label}
              value={count(key, pred)}
              hint={`${fmt(count(key, (r) => pred(r) && active(r)))} ${label === "Castings" ? "open" : label === "Rosters" ? "current" : "active"} · ${fmt(count(key, (r) => pred(r) && period(r)))} created in period`}
              definition={def}
              href={href("overview", { records: label })}
            />
          ))}
          <Stat
            label="Talent accounts"
            value={count("profiles", isTalent)}
            hint="Current profiles with talent access"
            href={href("talent")}
          />
          <Stat
            label="Industry accounts"
            value={count("profiles", isIndustry)}
            hint="Approval shown separately"
            href={href("industry")}
          />
          <Stat
            label="Approved talent"
            value={count(
              "profiles",
              (p) => isTalent(p) && p.profile_review_status === "approved",
            )}
            hint="Motiion profile review approval"
            href={href("talent", { status: "approved" })}
          />
        </div>
        {params.records && (
          <section className="launch-card">
            {linkTitle(params.records, "Current records; up to 100 shown")}
            <div className="launch-table-wrap">
              <table className="launch-table">
                <thead>
                  <tr>
                    <th>Record</th>
                    <th>Creator / company</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {entries
                    .filter((e) => e[0] === params.records)
                    .flatMap(([, key, pred]) =>
                      rows(key)
                        .filter(pred)
                        .slice(0, 100)
                        .map((r) => {
                          const p = profile(
                            owner(r) ||
                              owner(
                                rows("projects").find(
                                  (p) => p.id === r.project_id,
                                ) ?? {},
                              ),
                          );
                          return (
                            <tr key={text(r.id)}>
                              <td>
                                {text(r.title) || text(r.name) || text(r.id)}
                              </td>
                              <td>
                                <Person
                                  industry={view === "industry" ? true : view === "talent" ? false : undefined}
                                  p={p}
                                  href={personHref(p)}
                                  subtitle={company(p)}
                                />
                              </td>
                              <td>
                                {text(r.status) ||
                                  (r.is_active === true
                                    ? "active"
                                    : r.is_active === false
                                      ? "inactive"
                                      : "Current")}
                              </td>
                              <td>{date(r.created_at)}</td>
                            </tr>
                          );
                        }),
                    )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </>
    );
  }
  function trends(kinds: TrendKind[] = ["profiles", "activity", "projects", "opportunities", "rosters"]) {
    return <div className="launch-grid two launch-trend-grid">{kinds.map(kind => <TrendChart key={kind} trend={buildTrend(s, kind, data.days, data.fetchedAt)} />)}</div>;
  }
  function creators() {
    return (
      <section className="launch-card">
        {linkTitle(
          "Momentum & community",
          `Top creators by category · created in last ${data.days} days`,
        )}
        {(["Projects", "Classes", "Sessions", "Castings"] as const).map(
          (category) => {
            const key =
              category === "Projects"
                ? "projects"
                : category === "Castings"
                  ? "castings"
                  : "activities";
            const totals = new Map<string, number>();
            rows(key)
              .filter(
                (r) =>
                  period(r) &&
                  (key !== "activities" ||
                    r.type === (category === "Classes" ? "class" : "session")),
              )
              .forEach((r) => {
                const id =
                  owner(r) ||
                  owner(
                    rows("projects").find((p) => p.id === r.project_id) ?? {},
                  );
                if (id) totals.set(id, (totals.get(id) ?? 0) + 1);
              });
            return (
              <div key={category}>
                <div className="launch-section-title">
                  <h2>{category}</h2>
                </div>
                {!ok(key, ...(key === "castings" ? ["projects"] : [])) ? (
                  <p className="launch-note">Source unavailable.</p>
                ) : totals.size === 0 ? (
                  <p className="launch-note">
                    No recorded creators in this period.
                  </p>
                ) : (
                  [...totals.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([id, n]) => (
                      <div className="launch-review-line" key={id}>
                        <Person
                          industry={view === "industry" ? true : view === "talent" ? false : undefined}
                          p={profile(id)}
                          href={personHref(profile(id))}
                          subtitle={company(profile(id))}
                        />
                        <strong>{n}</strong>
                      </div>
                    ))
                )}
              </div>
            );
          },
        )}
      </section>
    );
  }
  function directory(kind: "talent" | "industry") {
    const q = (params.query || "").toLowerCase().trim();
    let filtered = people
      .filter(kind === "talent" ? isTalent : isIndustry)
      .filter((p) =>
        `${name(p)} ${text(p.email)} ${text(p.username)} ${kind === "industry" ? company(p) : ""}`
          .toLowerCase()
          .includes(q),
      );
    if (params.status)
      filtered = filtered.filter((p) =>
        kind === "talent"
          ? params.status === "ready"
            ? readiness(p).ready
            : p.profile_review_status === params.status
          : app(text(p.user_id))?.status === params.status,
      );
    filtered = sortDirectory(filtered, params.sort);
    const pages = Math.max(1, Math.ceil(filtered.length / 50));
    const page = Math.min(pages, Math.max(1, Number.parseInt(params.page || "1",10) || 1));
    const paged = filtered.slice((page - 1) * 50, page * 50);
    return (
      <>
        <section className="launch-card">
          {linkTitle(
            kind === "talent" ? "Talent directory" : "Industry directory",
            `${ok("profiles") ? filtered.length : "—"} matching accounts · 50 per page`,
          )}
          <form className="launch-directory-form" action={base}>
            <input type="hidden" name="view" value={kind} />
            <input type="hidden" name="range" value={data.days} />
            <input
              name="query"
              aria-label="Search directory"
              placeholder={
                kind === "industry"
                  ? "Search name, email, or company…"
                  : "Search name or email…"
              }
              defaultValue={params.query}
            />
            <select
              name="status"
              aria-label="Filter status"
              defaultValue={params.status || ""}
            >
              <option value="">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending review</option>
              {kind === "talent" ? (
                <>
                  <option value="ready">Ready profile</option>
                  <option value="not_submitted">Not submitted</option>
                </>
              ) : (
                <>
                  <option value="needs_information">Needs information</option>
                  <option value="rejected">Rejected</option>
                </>
              )}
            </select>
            <select name="sort" aria-label="Sort directory" defaultValue={directoryState(params).sort}>
              <option value="newest">Newest signups first</option><option value="oldest">Oldest signups first</option><option value="name">Name A–Z</option>
            </select>
            <button className="launch-button secondary">Apply filters</button>
          </form>
          {!ok("profiles") ? (
            <Empty>Directory unavailable. Check source coverage below.</Empty>
          ) : paged.length === 0 ? (
            <Empty>No accounts match these filters.</Empty>
          ) : (
            <div className="launch-table-wrap launch-directory-scroll" role="region" aria-label={`${kind} directory results`} tabIndex={0}>
              <table className="launch-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>{kind === "talent" ? "Readiness" : "Company"}</th>
                    <th>{kind === "talent" ? "Portfolio" : "Application"}</th>
                    <th>
                      {kind === "talent" ? "Review" : "Projects / rosters"}
                    </th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((p) => (
                    <tr key={text(p.user_id)}>
                      <td>
                        <Person
                          industry={view === "industry" ? true : view === "talent" ? false : undefined}
                          p={p}
                          href={href(kind, {
                            ...directoryState(params),
                            page:String(page),
                            user: text(p.user_id),
                          })}
                        />
                      </td>
                      <td>
                        {kind === "talent"
                          ? `${readiness(p).completed} / 5 complete`
                          : company(p)}
                      </td>
                      <td>
                        {kind === "talent" ? (
                          `${list(p.headshot_urls).length} photos · ${list(p.profile_visuals).length} videos`
                        ) : (
                          <Pill
                            value={
                              ok("industry_applications")
                                ? app(text(p.user_id))?.status
                                : "Unavailable"
                            }
                          />
                        )}
                      </td>
                      <td>
                        {kind === "talent" ? (
                          <Pill value={p.profile_review_status} />
                        ) : (
                          `${fmt(count("projects", (r) => owner(r) === p.user_id))} / ${fmt(count("talent_lists", (r) => owner(r) === p.user_id && r.kind !== "favorites"))}`
                        )}
                      </td>
                      <td>{date(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <nav className="launch-inline launch-note launch-pagination" aria-label="Directory pages">
            <span>Page {page} of {pages} · {filtered.length ? (page-1)*50+1 : 0}–{Math.min(page*50,filtered.length)} of {filtered.length}</span>
            {page > 1 && (
              <Link
                href={href(kind, {
                  ...directoryState(params),
                  page: String(page - 1),
                })}
              >
                ← Previous
              </Link>
            )}
            {page * 50 < filtered.length && (
              <Link
                href={href(kind, {
                  ...directoryState(params),
                  page: String(page + 1),
                })}
              >
                Next page →
              </Link>
            )}
          </nav>
        </section>
      </>
    );
  }
  function engagement() {
    const events = rows("analytics_events");
    const current = events.filter((e) => period(e));
    const recent = (days: number) =>
      events.filter(
        (e) =>
          new Date(text(e.created_at)).getTime() >=
          now.getTime() - days * 86400000,
      );
    const featureEvents = [
      ...meaningfulEvents,
      "profile_viewed",
      "activity_viewed",
    ];
    function returnRate(days: number) {
      const start = new Date(now.getTime() - days * 2 * 86400000).toISOString();
      const middle = new Date(now.getTime() - days * 86400000).toISOString();
      const before = new Set(
        events
          .filter((e) => inPeriod(e, start, middle))
          .map((e) => text(e.user_id))
          .filter(Boolean),
      );
      const after = new Set(
        recent(days)
          .map((e) => text(e.user_id))
          .filter(Boolean),
      );
      return {
        base: before.size,
        returned: [...before].filter((id) => after.has(id)).length,
      };
    }
    return (
      <>
        <div className="launch-grid four">
          {[1, 7, 30].map((d, i) => (
            <Stat
              key={d}
              label={
                [
                  "Daily active users",
                  "Weekly active users",
                  "Monthly active users",
                ][i]
              }
              value={ok("analytics_events") ? uniqueUsers(recent(d)) : null}
              hint={`Trailing ${d === 1 ? "24 hours" : `${d} days`} · unique signed-in users`}
              definition="At least one recorded analytics event."
            />
          ))}
          <Stat
            label="Meaningfully active"
            value={
              ok("analytics_events")
                ? uniqueUsers(
                    current.filter((e) =>
                      meaningfulEvents.includes(text(e.event_name)),
                    ),
                  )
                : null
            }
            hint={`Unique users · selected ${data.days} days`}
            definition="Registration, RSVP, submission, save, booking request or message."
          />
        </div>
        <div className="launch-grid two">
          <section className="launch-card">
            {linkTitle(
              "Feature adoption",
              "Distinct users per feature · retries do not inflate user counts",
            )}
            <div className="launch-table-wrap">
              <table className="launch-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Talent</th>
                    <th>Industry</th>
                    <th>All users</th>
                  </tr>
                </thead>
                <tbody>
                  {featureEvents.map((event) => {
                    const e = current.filter((r) => r.event_name === event);
                    return (
                      <tr key={event}>
                        <td>{event.replaceAll("_", " ")}</td>
                        <td>
                          {fmt(
                            ok("analytics_events", "profiles")
                              ? uniqueUsers(
                                  e.filter((r) =>
                                    isTalent(profile(text(r.user_id))),
                                  ),
                                )
                              : null,
                          )}
                        </td>
                        <td>
                          {fmt(
                            ok("analytics_events", "profiles")
                              ? uniqueUsers(
                                  e.filter((r) =>
                                    isIndustry(profile(text(r.user_id))),
                                  ),
                                )
                              : null,
                          )}
                        </td>
                        <td>
                          {fmt(ok("analytics_events") ? uniqueUsers(e) : null)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="launch-note">
              A person with both shells appears in both columns. Zero means no
              observed users, not proof of no use. Events are best-effort client
              telemetry.
            </p>
          </section>
          <section className="launch-card">
            {linkTitle(
              "Coming back",
              "Adjacent-window return · not signup-cohort retention",
            )}
            {[7, 30].map((d) => {
              const r = returnRate(d);
              return (
                <div className="launch-goal-row" key={d}>
                  <p>{d === 7 ? "Weekly" : "Monthly"} return</p>
                  <strong>
                    {ok("analytics_events") && r.base
                      ? `${fmt((r.returned / r.base) * 100)}%`
                      : "—"}
                  </strong>
                  <small>
                    {ok("analytics_events")
                      ? `${r.returned} returned / ${r.base} active in the previous ${d} days`
                      : "Source unavailable"}
                  </small>
                </div>
              );
            })}
            <p className="launch-note">
              True signup-cohort retention is unavailable until account creation
              and complete observation windows are reconciled. No legacy D7/D30
              estimate is reused.
            </p>
          </section>
        </div>
        <div className="launch-grid three">
          <section className="launch-card">
            {linkTitle("Profile setup", "Current account-state funnel")}
            {[
              ["Profile records", count("profiles")],
              [
                "Setup complete",
                count("profiles", (p) =>
                  Boolean(
                    p.profile_setup_completed_at || p.onboarding_completed_at,
                  ),
                ),
              ],
              [
                "Not completed",
                count(
                  "profiles",
                  (p) =>
                    !(
                      p.profile_setup_completed_at || p.onboarding_completed_at
                    ),
                ),
              ],
            ].map(([l, v]) => (
              <div className="launch-review-line" key={String(l)}>
                <span>{l}</span>
                <strong>{fmt(v as number | null)}</strong>
              </div>
            ))}
            <p className="launch-note">
              Missing setup timestamp is an incomplete record, not a confirmed
              abandonment.
            </p>
          </section>
          <section className="launch-card">
            {linkTitle(
              "Identity verification",
              "Unique observed users · selected period",
            )}
            {[
              "verification_page_viewed",
              "verification_started",
              "verification_completed",
            ].map((k) => (
              <div className="launch-review-line" key={k}>
                <span>
                  {k.replace("verification_", "").replaceAll("_", " ")}
                </span>
                <strong>
                  {fmt(
                    ok("analytics_events")
                      ? uniqueUsers(current.filter((e) => e.event_name === k))
                      : null,
                  )}
                </strong>
              </div>
            ))}
            <p className="launch-note">
              Independent step populations; no sequential conversion rate
              inferred. iOS event names; web uses a separate industry-prefixed
              family.
            </p>
          </section>
          <section className="launch-card">
            {linkTitle(
              "Stripe Connect",
              "Payout account adoption · current state",
            )}
            <div className="launch-stat-value">
              {fmt(
                count("profiles", (p) => Boolean(p.stripe_connect_account_id)),
              )}
            </div>
            <p className="launch-note">
              Linked accounts. Completion and payout capability are not proven
              by a stored account ID. Connect step telemetry is unavailable;
              this is separate from identity verification.
            </p>
          </section>
        </div>
      </>
    );
  }
  function revenue() {
    const subs = rows("subscriptions");
    const active = subs.filter(
      (r) =>
        r.status === "active" &&
        (!r.current_period_end || new Date(text(r.current_period_end)) > now),
    );
    const groups = new Map<string, number>();
    active.forEach((r) => {
      const k = `${text(r.provider) || text(r.billing_source) || "Unknown provider"} / ${text(r.app_store_product_id) || text(r.tier) || "Unknown plan"}`;
      groups.set(k, (groups.get(k) ?? 0) + 1);
    });
    const money = (source: string, field: string, predicate: (r: Row) => boolean) => recordedMoney(s, source, field, predicate);
    return (
      <>
        <div className="launch-grid four">
          <Stat
            label="Active subscription records"
            value={ok("subscriptions") ? active.length : null}
            hint="Active status; unexpired when end date is present"
          />
          <Stat
            label="Cancellation records"
            value={count("subscriptions", (r) => period(r, "canceled_at"))}
            hint={`Canceled timestamp in last ${data.days} days`}
          />
          <Stat
            label="Past due / unpaid"
            value={count("subscriptions", (r) =>
              ["past_due", "unpaid"].includes(text(r.status)),
            )}
            hint="Current subscription states"
          />
          <Stat
            label="Monthly recurring revenue"
            value={null}
            hint="Unavailable · verified billed amounts required"
            definition="No hardcoded list-price multiplication."
          />
        </div>
        <div className="launch-grid two">
          <section className="launch-card">
            {linkTitle(
              "Subscriptions by provider & plan",
              "Current active records · not deduplicated paying people",
            )}
            {!ok("subscriptions") ? (
              <Empty>Subscription source unavailable.</Empty>
            ) : groups.size ? (
              [...groups].map(([key, n]) => (
                <div className="launch-review-line" key={key}>
                  <span>{key}</span>
                  <strong>{n}</strong>
                </div>
              ))
            ) : (
              <Empty>No active subscription records.</Empty>
            )}
            <p className="launch-note">
              Trials:{" "}
              {fmt(count("subscriptions", (r) => r.status === "trialing"))}.
              Scheduled cancellations:{" "}
              {fmt(
                count("subscriptions", (r) => r.cancel_at_period_end === true),
              )}
              . MRR and churn need authoritative billed intervals, amounts,
              currency, and opening subscriber cohorts. Provider mirrors may
              overlap.
            </p>
          </section>
          <section className="launch-card">
            {linkTitle(
              "Financial coverage",
              "Record-based values; no estimated platform income",
            )}
            <p className="launch-note">
              All amounts below use their recorded currency. Costs, refunds,
              payouts, and retained amounts are separate. A checkout success
              count is not a settled balance.
            </p>
            <div className="launch-review-line">
              <span>Class/event checkouts succeeded</span>
              <strong>
                {fmt(
                  count(
                    "stripe_checkout_sessions",
                    (r) => r.status === "succeeded" && period(r, "updated_at"),
                  ),
                )}
              </strong>
            </div>
            <div className="launch-review-line">
              <span>Refunded enrollments</span>
              <strong>
                {fmt(
                  count(
                    "enrollments",
                    (r) => r.status === "refunded" && period(r, "updated_at"),
                  ),
                )}
              </strong>
            </div>
            <div className="launch-review-line">
              <span>Legacy booking payments · failed</span>
              <strong>
                {fmt(
                  count(
                    "booking_deal_memos",
                    (r) => r.payment_state === "failed",
                  ),
                )}
              </strong>
            </div>
            <div className="launch-review-line">
              <span>Legacy booking payments · disputed</span>
              <strong>
                {fmt(
                  count(
                    "booking_deal_memos",
                    (r) => r.payment_state === "disputed",
                  ),
                )}
              </strong>
            </div>
            <p className="launch-note">
              Counts use the latest updated timestamp, which may differ from
              payment/refund occurrence. Do not use them as a cash ledger.
            </p>
          </section>
        </div>
        <section className="launch-card">
          {linkTitle(
            "One-time payments & historical records",
            `Selected ${data.days} days · authoritative stored payment fields where available`,
          )}
          <div className="launch-revenue-row">
            <div>
              <h3>Identity verification charges</h3>
              <p>Customer charges · platform revenue category</p>
            </div>
            <div>
              <strong>
                {money(
                  "identity_verification_fee_payments",
                  "amount_cents",
                  (r) => period(r) && r.status === "succeeded",
                )}
              </strong>
              <p>
                Recorded fee payments. Provider verification costs and refund
                ledger unavailable; net income unavailable.
              </p>
            </div>
          </div>
          <div className="launch-revenue-row">
            <div>
              <h3>Legacy booking agreements</h3>
              <p>Historical paid charge volume and recorded fees · retired product scope</p>
            </div>
            <div>
              <strong>
                {money(
                  "booking_deal_memos",
                  "charge_amount_cents",
                  (r) => Boolean(r.paid_at) && period(r, "paid_at"),
                )}{" "}
                charged
              </strong>
              <p>
                {money(
                  "booking_deal_memos",
                  "platform_fee_cents",
                  (r) => Boolean(r.paid_at) && period(r, "paid_at"),
                )}{" "}
                platform fees before refunds and processing. Booking code
                charges a 10% fee on top of talent pay.
              </p>
              <p>
                Refunds against these paid memos:{" "}
                {money(
                  "booking_deal_memos",
                  "amount_refunded_cents",
                  (r) => Boolean(r.paid_at) && period(r, "paid_at"),
                )}
                . Refund timing and fee allocation need reconciliation. Payouts
                and retained amounts unavailable.
              </p>
            </div>
          </div>
          <div className="launch-revenue-row">
            <div>
              <h3>User-run classes & events</h3>
              <p>Processed volume / passthrough</p>
            </div>
            <div>
              <strong>Amounts unavailable</strong>
              <p>
                Implemented pricing: flat configurable Motiion fee plus
                processing gross-up, charged above the instructor’s ticket
                price. Application fee includes processing; it is not all
                Motiion income. No percentage or price × enrollment estimate is
                used.
              </p>
            </div>
          </div>
          <div className="launch-revenue-row">
            <div>
              <h3>Motiion-run event ticket sales</h3>
              <p>Ticket sales · refunds · costs · amounts owed</p>
            </div>
            <div>
              <strong>Reconciliation required</strong>
              <p>
                Sponsorship is not proof that Motiion is the event operator. An
                explicit operator designation and sales/cost/payables ledger are
                needed before totals can be reported. Retained amounts remain
                unavailable.
              </p>
            </div>
          </div>
        </section>
      </>
    );
  }
  function reviews() {
    const talent = people.filter((p) => p.profile_review_status === "pending");
    const applications = rows("industry_applications")
      .filter((a) => a.status === "pending")
      .sort((a, b) => text(a.submitted_at).localeCompare(text(b.submitted_at)));
    return (
      <>
        <div className="launch-grid three">
          <Stat
            label="Talent profiles"
            value={pendingTalent}
            hint="Submitted and awaiting review"
          />
          <Stat
            label="Industry applications"
            value={pendingIndustry}
            hint="Pending professional access decisions"
          />
          <Stat
            label="Oldest submission"
            value={oldest}
            hint="Days waiting · current queue"
          />
        </div>
        <div className="launch-grid two">
          <section className="launch-card">
            {linkTitle(
              "Talent profile review",
              "Approval is separate from identity verification",
            )}
            {!ok("profiles", "profile_review_requests") ? (
              <Empty>Profile review source unavailable.</Empty>
            ) : talent.length === 0 ? (
              <Empty>No talent profiles awaiting review.</Empty>
            ) : (
              talent
                .sort((a, b) =>
                  text(a.profile_review_submitted_at).localeCompare(
                    text(b.profile_review_submitted_at),
                  ),
                )
                .map((p) => {
                  const request = rows("profile_review_requests")
                    .filter(
                      (r) => r.user_id === p.user_id && r.status === "pending",
                    )
                    .sort((a, b) =>
                      text(b.submitted_at).localeCompare(text(a.submitted_at)),
                    )[0];
                  return (
                    <details
                      key={text(p.user_id)}
                      style={{
                        padding: "16px 0",
                        borderTop: "1px solid var(--la-line)",
                      }}
                    >
                      <summary>
                        {name(p)}{" "}
                        <span className="launch-subtitle">
                          ·{" "}
                          {date(
                            request?.submitted_at ||
                              p.profile_review_submitted_at,
                          )}
                        </span>
                      </summary>
                      <div style={{ paddingTop: 16 }}>
                        {profilePreview(p)}
                        <TalentReview
                          userId={text(p.user_id)}
                          requestId={text(request?.id)}
                          disabled={data.preview}
                        />
                      </div>
                    </details>
                  );
                })
            )}
          </section>
          <section className="launch-card">
            {linkTitle(
              "Industry access",
              "Oldest first · review professional work and company",
            )}
            {!ok("industry_applications") ? (
              <Empty>Industry application source unavailable.</Empty>
            ) : applications.length === 0 ? (
              <Empty>No industry applications awaiting review.</Empty>
            ) : (
              applications.map((a) => (
                <details
                  key={`${text(a.user_id)}:${a.version}`}
                  style={{ padding: "16px 0", borderTop: "1px solid var(--la-line)" }}
                >
                  <summary>
                    {text(a.full_name)}{" "}
                    <span className="launch-subtitle">
                      · {text(a.organization)}
                    </span>
                  </summary>
                  <p className="launch-note">
                    Submitted {date(a.submitted_at)} · version{" "}
                    {String(a.version)}
                  </p>
                  <IndustryApplicationReview
                    application={a as unknown as IndustryApplication}
                    profile={industryReviewProfile(text(a.user_id), s.profiles)}
                    disabled={data.preview}
                  />
                </details>
              ))
            )}
          </section>
        </div>
        <p className="launch-note">
          Industry decisions use the existing version-checked workflow. Talent
          decisions compare the pending request ID under a database lock and
          call the existing profile-review workflow, including its applicant
          notifications and feedback.
        </p>
      </>
    );
  }
  function goalView() {
    return (
      <>
        <BusinessScorecard sources={s} />
        <details className="launch-saved-goals">
          <summary>Staff operational targets & history</summary>
          <p className="launch-note">Your saved readiness targets remain editable here. These are separate from the documented company KPI scorecard.</p>
        {!ok("admin_launch_goals") && (
          <div className="launch-notice">
            Goal persistence is unavailable. Apply the reviewed local dashboard
            migration before setting shared targets.
          </div>
        )}
        {Object.entries(goalLabels).map(([key, label]) => {
          const g = goals.find((g) => g.metric_key === key);
          const history = rows("admin_launch_goal_history")
            .filter((h) => h.goal_id === g?.id)
            .sort((a, b) =>
              text(b.created_at).localeCompare(text(a.created_at)),
            );
          const previous = number(history[0]?.current_value);
          const target = number(g?.target);
          const pct =
            target === null
              ? null
              : progress(
                  values[key],
                  target,
                  ["review_backlog", "review_days"].includes(key),
                );
          return (
            <section
              className="launch-card"
              key={key}
              style={{ marginBottom: 18 }}
            >
              {linkTitle(
                label,
                key === "review_days"
                  ? "All recorded completed reviews with submission and decision timestamps"
                  : "Current source records · targets set by your team",
              )}
              <div className="launch-inline">
                <div className="launch-stat-value">{fmt(values[key])}</div>
                <span className="launch-subtitle">
                  {target === null
                    ? "No target set"
                    : `of ${fmt(target)} target · ${fmt(pct)}% progress`}
                  {previous !== null && values[key] !== null
                    ? ` · ${fmt(values[key]! - previous)} since last observation`
                    : ""}
                </span>
              </div>
              <div className="launch-track" style={{ margin: "16px 0 24px" }}>
                <span style={{ width: `${pct ?? 0}%` }} />
              </div>
              <GoalEditor
                key={String(g?.version || 0)}
                metric={key}
                goal={g}
                disabled={data.preview || !ok("admin_launch_goals")}
              />
              <details className="launch-note">
                <summary>
                  Progress history ({history.length} observations)
                </summary>
                {history.length ? (
                  history.map((h) => (
                    <p key={text(h.id)}>
                      {date(h.created_at)} · observed{" "}
                      {fmt(number(h.current_value))} · target{" "}
                      {fmt(number(h.target))} · {text(h.owner_name)} · due{" "}
                      {date(h.deadline)}
                    </p>
                  ))
                ) : (
                  <p>
                    No observations yet. Saving a goal records the current
                    value.
                  </p>
                )}
              </details>
            </section>
          );
        })}
        <p className="launch-note">
          Ready talent: setup, headshot, video, resume or credits, and styles.
          Available opportunities: public active upcoming classes/sessions and
          public open castings. Lower is better for backlog and review days.
          Progress observations are explicitly recorded by staff, not an
          automatic daily time series. No legacy targets are prefilled.
        </p>
        </details>
        <section className="launch-card">
          {linkTitle(
            "Analytics exclusions",
            "Explicit test-account registry · no email or name heuristics",
          )}
          <ExclusionEditor
            disabled={data.preview || !ok("admin_analytics_exclusions")}
          />
          {rows("admin_analytics_exclusions").map((r) => (
            <p className="launch-note" key={text(r.user_id)}>
              {text(r.user_id)} · {text(r.reason)}
            </p>
          ))}
          <p className="launch-note">
            Excluded accounts and their owned projects, activities, lists and
            related records are removed from this dashboard. Review queues here
            follow the same scope. The dedicated industry review page retains
            the full operational queue.
          </p>
        </section>
      </>
    );
  }
  if (detailUserId) {
    const p = people.find(p => text(p.user_id) === detailUserId);
    const kind = view === "industry" ? "industry" : "talent";
    const back = href(kind,directoryState(params));
    if (!p) return <><Link className="launch-link" href={back}>← Back to {kind} directory</Link><h1>Account unavailable</h1><Empty>This account could not be loaded, does not exist, or is excluded from this dashboard.</Empty></>;
    return <AccountDetail data={data} person={p} industry={kind === "industry"} backHref={back} company={company(p)}/>;
  }

  return (
    <>
      <div className="launch-heading">
        <div>
          <div className="launch-eyebrow">
            MOTIION /{" "}
            {view.toUpperCase()}
          </div>
          <h1>{titles[view][0]}</h1>
          <p>{titles[view][1]}</p>
        </div>
        <form className="launch-period" action={base}>
          <input type="hidden" name="view" value={view} />
          <select
            name="range"
            aria-label="Analytics period"
            defaultValue={data.days}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button className="launch-button secondary">Apply</button>
        </form>
      </div>
      {!ok("admin_analytics_exclusions") && (
        <div className="launch-notice">
          Test-account exclusions are unavailable. Counts include all accounts;
          do not treat this as a clean launch cohort.
        </div>
      )}
      {view === "overview" && (
        <>
          <div className="launch-grid two launch-overview-top">
            <TrendSelector trends={(["profiles", "activity", "projects", "opportunities", "rosters"] as TrendKind[]).map(kind => buildTrend(s, kind, data.days, data.fetchedAt))} />
            <section className="launch-card">
              {linkTitle(
                "Pending reviews",
                "Profiles and applications awaiting a decision",
              )}
              <div className="launch-review-count">
                {fmt(values.review_backlog)}{" "}
                <span className="launch-subtitle">pending reviews</span>
              </div>
              <div className="launch-review-line">
                <span>Talent profiles</span>
                <strong>{fmt(pendingTalent)}</strong>
              </div>
              <div className="launch-review-line">
                <span>Industry applications</span>
                <strong>{fmt(pendingIndustry)}</strong>
              </div>
              <div className="launch-review-line">
                <span>
                  <Clock3
                    size={12}
                    style={{ display: "inline", marginRight: 5 }}
                  />
                  Oldest submission
                </span>
                <strong>{oldest === null ? "—" : `${oldest} days ago`}</strong>
              </div>
              <Link
                className="launch-button"
                style={{ width: "100%", marginTop: 12 }}
                href={href("reviews")}
              >
                Open review inbox <ArrowRight size={14} />
              </Link>
            </section>
          </div>
          {inventory()}
          <div className="launch-grid two launch-overview-bottom">
            <section className="launch-card">
              {linkTitle("Financial summary", `Last ${data.days} days · recorded currencies`, href("revenue"), "View finances")}
              <div className="launch-finance-line"><span>Recurring revenue / MRR</span><strong>Unavailable</strong><p>Verified billed amounts and intervals are missing. No list-price estimate is treated as income.</p></div>
              <div className="launch-finance-line"><span>Identity verification charges</span><strong>{recordedMoney(s,"identity_verification_fee_payments","amount_cents",r=>period(r)&&r.status==="succeeded")}</strong><p>Recorded customer charges; costs and refunds are separate.</p></div>
              <div className="launch-finance-line"><span>Booking charge volume</span><strong>{recordedMoney(s,"booking_deal_memos","charge_amount_cents",r=>period(r,"paid_at"))}</strong><p>Includes money owed to talent; not all platform income.</p></div>
              <div className="launch-finance-line"><span>Contractual booking fees</span><strong>{recordedMoney(s,"booking_deal_memos","platform_fee_cents",r=>period(r,"paid_at"))}</strong><p>Before processing and refunds; included in charge volume, not additive.</p></div>
              <div className="launch-finance-line"><span>Ticket / class passthrough</span><strong>Amounts unavailable</strong><p>Checkout counts do not establish settled proceeds. Retained income requires reconciliation.</p></div>
            </section>
            {creators()}
          </div>
        </>
      )}
      {view === "talent" && <div className="launch-talent-layout"><TrendChart trend={buildTrend(s,"talent",data.days,data.fetchedAt)}/>{directory("talent")}</div>}
      {view === "industry" && <>{directory("industry")}{trends(["industry", "projects", "opportunities", "rosters"])}</>}
      {view === "engagement" && <>{trends(["activity", "meaningful"])}{engagement()}</>}
      {view === "revenue" && revenue()}
      {view === "reviews" && reviews()}
      {view === "goals" && goalView()}
      <details className="launch-coverage">
        <summary>
          Data coverage & definitions · fetched{" "}
          {new Date(data.fetchedAt).toLocaleString("en-US", {
            timeZone: "UTC",
          })}{" "}
          UTC · {data.preview ? "preview fixtures" : "configured app database"}
        </summary>
        <p>
          Period: {data.since} to {data.fetchedAt}. Current-state cards are as
          fetched; period labels apply only to flow metrics. Queries are live
          reads, not a transactional snapshot. Unknown is shown as —. Deleted
          records are not reconstructed. Exclusions:{" "}
          {ok("admin_analytics_exclusions")
            ? `${rows("admin_analytics_exclusions").length} explicitly registered accounts`
            : "unavailable; all accounts included"}
          .
        </p>
        <ul>
          {Object.entries(s).map(([key, source]) => (
            <li key={key}>
              {key}: {source.error || `${source.rows.length} records loaded`}
            </li>
          ))}
        </ul>
        <p>
          {sourceNote("analytics_events")} Telemetry coverage is not proof of
          complete behavior. Counts of users deduplicate identities; financial
          totals never sum analytics events.
        </p>
      </details>
    </>
  );
}
