import { formatKpiValue } from "@/lib/analytics/kpi-goals";
import type { KpiWeeklyScorecard } from "@/lib/analytics/kpi-types";

export function AnalyticsWeeklyScorecard({ scorecard }: { scorecard: KpiWeeklyScorecard }) {
  return (
    <article className="ui-card p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            July 29 scorecard
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">This week</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Accounts, completed profiles, verifications, discovery, submissions, shortlists, and
            bookings.
          </p>
        </div>
        <p className="text-sm text-[var(--ink-soft)]">{scorecard.periodLabel}</p>
      </div>

      {scorecard.metrics.length === 0 ? (
        <p className="text-sm text-[var(--ink-soft)]">No weekly scorecard data yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {scorecard.metrics.map((item) => (
            <article
              key={item.key}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)]/40 p-4"
            >
              <p className="text-sm font-medium text-[var(--ink-soft)]">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">
                {formatKpiValue(item.current, item.format)}
              </p>
              {item.hint ? <p className="mt-2 text-xs text-[var(--ink-soft)]">{item.hint}</p> : null}
            </article>
          ))}
        </div>
      )}
    </article>
  );
}
