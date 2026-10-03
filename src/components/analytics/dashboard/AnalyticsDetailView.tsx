import Link from "next/link";

import { AnalyticsBarChart } from "@/components/analytics/dashboard/AnalyticsBarChart";
import { AnalyticsRangeControls } from "@/components/analytics/dashboard/AnalyticsControls";
import { AnalyticsDonutChart } from "@/components/analytics/dashboard/AnalyticsDonutChart";
import { AnalyticsFunnel } from "@/components/analytics/dashboard/AnalyticsFunnel";
import { AnalyticsKpiSection } from "@/components/analytics/dashboard/AnalyticsKpiSection";
import {
  AnalyticsEventVolumeChart,
  AnalyticsPlatformVolumeChart,
} from "@/components/analytics/dashboard/AnalyticsLineChart";
import { AnalyticsMetricGrid } from "@/components/analytics/dashboard/AnalyticsMetricGrid";
import { AnalyticsNorthStarCard } from "@/components/analytics/dashboard/AnalyticsNorthStarCard";
import { AnalyticsProductHealthGrid } from "@/components/analytics/dashboard/AnalyticsProductHealthGrid";
import { AnalyticsUserTable } from "@/components/analytics/dashboard/AnalyticsUserTable";
import type { AdminAnalyticsDetailData } from "@/lib/analytics/admin-home-data";

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

export function AnalyticsDetailView({
  data,
  hrefBase,
  preview = false,
}: {
  data: AdminAnalyticsDetailData;
  hrefBase: string;
  preview?: boolean;
}) {
  const kpi = data.kpi;

  return (
    <>
      <div className="mb-8">
        <Link href={`${hrefBase}?range=${data.rangeKey}`} className="text-sm text-[#2dd4bf] hover:underline">
          Back to the chart
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)]">
          Analytics detail
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--ink-soft)]">
          {preview ? "Sample numbers. " : null}
          These views stay off the first page. Written Other answers are not a stable line, and
          event totals, subscription figures, and marketplace counts are not accounts created per
          day, so they do not share that chart.
        </p>
      </div>

      <div className="mb-8">
        <AnalyticsRangeControls currentRange={data.rangeKey} hrefBase={`${hrefBase}/detail`} />
      </div>

      <section id="other-answers" className="scroll-mt-8">
        <Panel
          title="Other answers"
          description="Optional detail written when someone chose Other. Each phrase is its own answer, so this stays a list."
        >
          {data.seriesError ? (
            <p className="text-sm text-amber-700">
              Other answers could not be loaded ({data.seriesError}).
            </p>
          ) : data.otherDetails.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">No written Other answers in this range.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--ink-soft)]">
                  <th className="px-3 py-2 font-medium">Answer</th>
                  <th className="px-3 py-2 font-medium">Accounts</th>
                </tr>
              </thead>
              <tbody>
                {data.otherDetails.map((item) => (
                  <tr key={item.detail} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-3 py-3 text-[var(--ink)]">{item.detail}</td>
                    <td className="px-3 py-3 text-[var(--ink-soft)]">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </section>

      <section id="activity-volume" className="mt-8 scroll-mt-8 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-[var(--ink)]">Event volume and paths</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Tracked events, not new accounts. Kept here so the first page stays the signup chart.
          </p>
        </div>
        {data.detailError ? (
          <p className="text-sm text-amber-700">{data.detailError}</p>
        ) : null}
        {data.dashboard ? (
          <>
            <AnalyticsMetricGrid metrics={data.dashboard.metrics} />
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Event volume" description="Daily events and active users.">
                <AnalyticsEventVolumeChart data={data.dashboard.eventVolumeSeries} />
              </Panel>
              <Panel title="Platform trend" description="Web vs iOS activity over time.">
                <AnalyticsPlatformVolumeChart data={data.dashboard.eventVolumeSeries} />
              </Panel>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Top events">
                <AnalyticsBarChart data={data.dashboard.topEvents} />
              </Panel>
              <Panel title="Top paths">
                <AnalyticsBarChart data={data.dashboard.topPaths} />
              </Panel>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Platform split">
                <AnalyticsDonutChart
                  data={data.dashboard.platformSplit}
                  nameKey="platform"
                  valueKey="count"
                />
              </Panel>
              <Panel title="Account type split">
                <AnalyticsDonutChart
                  data={data.dashboard.accountTypeSplit}
                  nameKey="accountType"
                  valueKey="count"
                />
              </Panel>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Activation funnel">
                <AnalyticsFunnel steps={data.dashboard.funnel} />
              </Panel>
              <Panel title="Most active users">
                <AnalyticsUserTable users={data.dashboard.topUsers} range={data.rangeKey} hrefBase={hrefBase} />
              </Panel>
            </div>
            <Panel title="Product health">
              <AnalyticsProductHealthGrid health={data.dashboard.productHealth} />
            </Panel>
          </>
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">No event detail available.</p>
        )}
      </section>

      <section id="subscriptions" className="mt-10 scroll-mt-8 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-[var(--ink)]">Subscription and marketplace</h2>
          <p className="mt-1 max-w-3xl text-sm text-[var(--ink-soft)]">
            Monthly active professional opportunities, MRR, ARR, Pro subscribers, trial to paid,
            churn, and marketplace supply, demand, and talent success. These are not useful as the
            first page yet, and money and rates do not share the signup count axis.
          </p>
        </div>
        {kpi?.error ? (
          <p className="text-sm text-amber-700">
            Some KPI data could not be loaded ({kpi.error}).
          </p>
        ) : null}
        {kpi ? (
          <>
            <AnalyticsNorthStarCard northStar={kpi.northStar} />
            <div className="grid gap-6">
              <AnalyticsKpiSection title="Growth and revenue" metrics={kpi.growthMetrics} />
              <AnalyticsKpiSection
                title="Executive"
                description="Subscription and year-to-date opportunity headlines."
                metrics={kpi.executiveMetrics}
              />
              <AnalyticsKpiSection title="Marketplace supply" metrics={kpi.supplyMetrics} />
              <AnalyticsKpiSection title="Marketplace demand" metrics={kpi.demandMetrics} />
              <AnalyticsKpiSection title="Talent success" metrics={kpi.talentMetrics} />
              <AnalyticsKpiSection title="Retention" metrics={kpi.retentionMetrics} />
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">No subscription or marketplace detail available.</p>
        )}
      </section>
    </>
  );
}
