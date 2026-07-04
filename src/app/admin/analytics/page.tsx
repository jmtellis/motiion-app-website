import Link from "next/link";

import { AnalyticsBarChart } from "@/components/analytics/dashboard/AnalyticsBarChart";
import { AnalyticsRangeControls, AnalyticsSearchForm } from "@/components/analytics/dashboard/AnalyticsControls";
import { AnalyticsDonutChart } from "@/components/analytics/dashboard/AnalyticsDonutChart";
import { AnalyticsFunnel } from "@/components/analytics/dashboard/AnalyticsFunnel";
import { AnalyticsKpiGoalGrid } from "@/components/analytics/dashboard/AnalyticsKpiGoalGrid";
import { AnalyticsKpiSection } from "@/components/analytics/dashboard/AnalyticsKpiSection";
import {
  AnalyticsEventVolumeChart,
  AnalyticsPlatformVolumeChart,
} from "@/components/analytics/dashboard/AnalyticsLineChart";
import { AnalyticsMetricGrid } from "@/components/analytics/dashboard/AnalyticsMetricGrid";
import { AnalyticsNorthStarCard } from "@/components/analytics/dashboard/AnalyticsNorthStarCard";
import { AnalyticsProductHealthGrid } from "@/components/analytics/dashboard/AnalyticsProductHealthGrid";
import {
  AnalyticsRecentEventsTable,
  AnalyticsUserTimeline,
} from "@/components/analytics/dashboard/AnalyticsRecentEvents";
import { AnalyticsUserTable } from "@/components/analytics/dashboard/AnalyticsUserTable";
import { fetchAnalyticsDashboard } from "@/lib/analytics/queries";
import { fetchKpiDashboard } from "@/lib/analytics/kpi-queries";
import { hasAdminSupabaseEnv } from "@/lib/supabase/admin";

type PageProps = {
  searchParams: Promise<{
    range?: string;
    query?: string;
    user?: string;
  }>;
};

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="ui-card p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--ink-soft)]">{description}</p> : null}
      </div>
      {children}
    </article>
  );
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [dashboard, kpi] = await Promise.all([
    fetchAnalyticsDashboard({
      range: params.range,
      query: params.query,
      user: params.user,
    }),
    fetchKpiDashboard(),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            Internal
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Product analytics
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--ink-soft)]">
            Visual insights across web and iOS behavior, enriched with user profiles and product health
            signals.
          </p>
        </div>
        <Link href="/home" className="btn-secondary text-sm">
          Back to app
        </Link>
      </div>

      {!hasAdminSupabaseEnv() ? (
        <section className="ui-card p-5 text-sm text-[var(--ink-soft)]">
          Add `SUPABASE_SERVICE_ROLE_KEY` to the website environment to load analytics aggregates.
        </section>
      ) : null}

      {dashboard ? (
        <>
          <section className="mb-8 space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                Executive summary
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--ink)]">KPI progress</h2>
            </div>

            <AnalyticsNorthStarCard northStar={kpi.northStar} />

            <AnalyticsKpiGoalGrid metrics={kpi.executiveMetrics} />

            {kpi.error ? (
              <p className="text-sm text-amber-700">
                Some KPI data could not be loaded ({kpi.error}). Apply the KPI migration if needed.
              </p>
            ) : null}

            <div className="grid gap-6">
              <AnalyticsKpiSection
                title="Growth + revenue"
                description="Users, subscriptions, and revenue toward end-of-year targets."
                metrics={kpi.growthMetrics}
              />
              <AnalyticsKpiSection
                title="Marketplace supply"
                description="Classes, sessions, and castings created by organizers."
                metrics={kpi.supplyMetrics}
              />
              <AnalyticsKpiSection
                title="Marketplace demand"
                description="Registrations, RSVPs, submissions, and fill rates."
                metrics={kpi.demandMetrics}
              />
              <AnalyticsKpiSection
                title="Talent success"
                description="Profile discovery, saves, shares, and booking interest."
                metrics={kpi.talentMetrics}
              />
              <AnalyticsKpiSection
                title="Retention"
                description="Active users and cohort retention."
                metrics={kpi.retentionMetrics}
              />
            </div>
          </section>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <AnalyticsRangeControls
              currentRange={dashboard.range.key}
              query={params.query}
              user={params.user}
            />
            <p className="text-sm text-[var(--ink-soft)]">{dashboard.range.label}</p>
          </div>

          <section className="mb-8">
            <AnalyticsSearchForm range={dashboard.range.key} query={params.query} user={params.user} />
          </section>

          <AnalyticsMetricGrid metrics={dashboard.metrics} />

          {params.query && dashboard.searchResults.length > 0 ? (
            <section className="mt-8">
              <Panel title="Search results" description="Users matching your query.">
                <AnalyticsUserTable
                  users={dashboard.searchResults}
                  range={dashboard.range.key}
                  query={params.query}
                />
              </Panel>
            </section>
          ) : null}

          {dashboard.selectedUser ? (
            <section className="mt-8">
              <Panel
                title="User drill-down"
                description="Tracked behavior for the selected user in this date range."
              >
                <AnalyticsUserTimeline
                  user={dashboard.selectedUser}
                  events={dashboard.userTimeline}
                />
              </Panel>
            </section>
          ) : null}

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <Panel title="Event volume" description="Daily events and active users.">
              <AnalyticsEventVolumeChart data={dashboard.eventVolumeSeries} />
            </Panel>
            <Panel title="Platform trend" description="Web vs iOS activity over time.">
              <AnalyticsPlatformVolumeChart data={dashboard.eventVolumeSeries} />
            </Panel>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <Panel title="Top events" description="Most common tracked actions.">
              <AnalyticsBarChart data={dashboard.topEvents} />
            </Panel>
            <Panel title="Top paths" description="Most visited routes and pages.">
              <AnalyticsBarChart data={dashboard.topPaths} />
            </Panel>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <Panel title="Platform split">
              <AnalyticsDonutChart
                data={dashboard.platformSplit}
                nameKey="platform"
                valueKey="count"
              />
            </Panel>
            <Panel title="Account type split">
              <AnalyticsDonutChart
                data={dashboard.accountTypeSplit}
                nameKey="accountType"
                valueKey="count"
              />
            </Panel>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <Panel title="Activation funnel" description="How users move through key product steps.">
              <AnalyticsFunnel steps={dashboard.funnel} />
            </Panel>
            <Panel title="Most active users" description="Users with the highest event volume.">
              <AnalyticsUserTable users={dashboard.topUsers} range={dashboard.range.key} />
            </Panel>
          </section>

          <section className="mt-8">
            <Panel
              title="Product health"
              description="Operational signals from analytics events and core product tables."
            >
              <AnalyticsProductHealthGrid health={dashboard.productHealth} />
            </Panel>
          </section>

          <section className="mt-8">
            <Panel title="Recent activity" description="Latest tracked events with user context.">
              <AnalyticsRecentEventsTable events={dashboard.recentEvents} />
            </Panel>
          </section>
        </>
      ) : (
        <section className="ui-card p-5 text-sm text-[var(--ink-soft)]">
          No analytics data available yet, the service role query failed, or the admin analytics RPC
          migration has not been applied.
        </section>
      )}
    </main>
  );
}
