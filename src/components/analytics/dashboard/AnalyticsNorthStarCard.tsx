import { formatKpiValue } from "@/lib/analytics/kpi-goals";
import type { KpiNorthStarPayload } from "@/lib/analytics/kpi-types";

type Props = {
  northStar: KpiNorthStarPayload | null;
};

export function AnalyticsNorthStarCard({ northStar }: Props) {
  const count = northStar?.count ?? 0;
  const periodLabel = northStar?.periodLabel ?? "This month";
  const breakdown = northStar?.breakdown;

  return (
    <article className="ui-panel border-[var(--accent)]/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-dark)]">
            North Star
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--ink)]">
            Monthly Active Professional Opportunities
          </h2>
          <p
            className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)]"
            title="Submissions, registrations, RSVPs, saves, booking requests, profile shares, and talent contact events in the current month."
          >
            Professional interactions that indicate marketplace momentum — submissions, registrations,
            RSVPs, saves, bookings, shares, and outreach.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[var(--ink-soft)]">{periodLabel}</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight text-[var(--ink)]">
            {formatKpiValue(count, "number")}
          </p>
        </div>
      </div>

      {breakdown ? (
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Submissions", value: breakdown.submissions },
            { label: "Registrations", value: breakdown.registrations },
            { label: "RSVPs", value: breakdown.rsvps },
            { label: "Saves", value: breakdown.saves },
            { label: "Bookings", value: breakdown.bookingRequests },
            { label: "Shares", value: breakdown.profileShares },
            { label: "Messages", value: breakdown.messages },
            { label: "Tracked events", value: breakdown.analyticsEvents },
          ].map((item) => (
            <div key={item.label} className="rounded-[var(--radius-chip)] border border-[var(--line)] bg-white/70 px-3 py-2">
              <dt className="text-xs text-[var(--ink-soft)]">{item.label}</dt>
              <dd className="text-lg font-semibold text-[var(--ink)]">
                {formatKpiValue(item.value, "number")}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 text-sm text-[var(--ink-soft)]">No data yet for this month.</p>
      )}
    </article>
  );
}
