import Link from "next/link";

import { AnalyticsEarlySignals } from "@/components/analytics/dashboard/AnalyticsEarlySignals";
import { AnalyticsRangeControls, AnalyticsSearchForm } from "@/components/analytics/dashboard/AnalyticsControls";
import { AnalyticsRecentEventsTable, AnalyticsUserTimeline } from "@/components/analytics/dashboard/AnalyticsRecentEvents";
import { AnalyticsReferralsPanel } from "@/components/analytics/dashboard/AnalyticsReferralsPanel";
import { AnalyticsSignupChart } from "@/components/analytics/dashboard/AnalyticsSignupChart";
import { AnalyticsUserTable } from "@/components/analytics/dashboard/AnalyticsUserTable";
import type { AdminAnalyticsHomeData } from "@/lib/analytics/admin-home-data";
import type { AnalyticsSignalSummary } from "@/lib/analytics/early-signals";

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
    <article className="ui-card min-w-0 overflow-hidden p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--ink-soft)]">{description}</p> : null}
      </div>
      {children}
    </article>
  );
}

function summaryForRows(
  rows: AdminAnalyticsHomeData["earlySignals"]["rows"],
): AnalyticsSignalSummary {
  return {
    accountsCreated: rows.length,
    profileSetupCompleted: rows.filter((row) => row.profileSetupCompletedAt).length,
    firstActivityAfterSetup: rows.filter((row) => row.firstActivityViewedAt).length,
  };
}

export function AnalyticsHomeView({
  data,
  hrefBase,
  preview = false,
}: {
  data: AdminAnalyticsHomeData;
  hrefBase: string;
  preview?: boolean;
}) {
  const detailBase = `${hrefBase}/detail?range=${data.rangeKey}`;
  const people = data.earlySignals.rows.filter((row) =>
    row.accountCreatedAt ? row.accountCreatedAt >= data.sinceIso : true,
  );

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            {preview ? "Sample preview" : "Internal"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Who is joining
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--ink-soft)]">
            Signups, how they heard about Motiion, and user type on one chart. {data.rangeLabel}.
          </p>
        </div>
        {preview ? null : (
          <div className="flex gap-3">
            <Link href="/admin/design-system" className="btn-secondary text-sm">
              Design system
            </Link>
            <Link href="/admin/entities" className="btn-secondary text-sm">
              Industry entities
            </Link>
            <Link href="/home" className="btn-secondary text-sm">
              Back to app
            </Link>
          </div>
        )}
      </div>

      {preview ? (
        <p className="mb-6 text-sm text-[var(--ink-soft)]">
          Sample data only. This page does not read production accounts. Turn metrics on and off,
          then open a drill-down or a person below.
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <AnalyticsRangeControls
          currentRange={data.rangeKey}
          query={data.query}
          user={data.userId}
          hrefBase={hrefBase}
        />
        <p className="text-sm text-[var(--ink-soft)]">{data.rangeLabel}</p>
      </div>

      <article className="ui-card min-w-0 p-5">
        {data.seriesError ? (
          <p className="mb-4 text-sm text-amber-700">
            Signup counts could not be loaded ({data.seriesError}).
          </p>
        ) : null}
        <AnalyticsSignupChart points={data.series.points} metrics={data.series.metrics} />
        <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link href={`${detailBase}#other-answers`} className="text-[#2dd4bf] hover:underline">
            Other answers
          </Link>
          <Link href={`${detailBase}#activity-volume`} className="text-[#2dd4bf] hover:underline">
            Event volume and paths
          </Link>
          <Link href={`${detailBase}#subscriptions`} className="text-[#2dd4bf] hover:underline">
            Subscription and marketplace
          </Link>
        </nav>
      </article>

      <section className="mt-10 min-w-0 space-y-8">
        <AnalyticsSearchForm
          range={data.rangeKey}
          query={data.query}
          user={data.userId}
          hrefBase={hrefBase}
        />

        {data.query && data.searchResults.length > 0 ? (
          <Panel title="Search results" description="People matching your query.">
            <AnalyticsUserTable
              users={data.searchResults}
              range={data.rangeKey}
              query={data.query}
              hrefBase={hrefBase}
            />
          </Panel>
        ) : null}

        {data.selectedUser ? (
          <Panel title="Person" description="Tracked behavior in this date range.">
            <AnalyticsUserTimeline
              user={data.selectedUser}
              events={data.userTimeline}
              hrefBase={hrefBase}
            />
          </Panel>
        ) : null}

        {data.listsError ? (
          <p className="text-sm text-amber-700">
            Some activity could not be loaded ({data.listsError}).
          </p>
        ) : null}

        <Panel title="Early signals" description="Accounts in this date range.">
          <AnalyticsEarlySignals
            summary={summaryForRows(people)}
            rows={people}
            error={data.earlySignals.error}
            hrefBase={hrefBase}
            range={data.rangeKey}
          />
        </Panel>

        <Panel title="Recent activity" description="Latest tracked events.">
          <AnalyticsRecentEventsTable events={data.recentEvents} hrefBase={hrefBase} />
        </Panel>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">App referrals</h2>
            <p className="mt-1 max-w-3xl text-sm text-[var(--ink-soft)]">
              First-party signup attribution from user_referrals. This is not how someone said they
              heard about Motiion.
            </p>
          </div>
          <AnalyticsReferralsPanel data={data.referrals} range={data.rangeKey} hrefBase={hrefBase} />
        </section>
      </section>
    </>
  );
}
