import type { AnalyticsEarlySignalRow, AnalyticsSignalSummary } from "@/lib/analytics/early-signals";

function formatTimestamp(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

const summaryCards: Array<{
  key: keyof AnalyticsSignalSummary;
  label: string;
  hint: string;
}> = [
  {
    key: "accountsCreated",
    label: "Accounts created",
    hint: "People with a Motiion profile",
  },
  {
    key: "profileSetupCompleted",
    label: "Profile setup completed",
    hint: "Finished deferred profile setup",
  },
  {
    key: "firstActivityAfterSetup",
    label: "First activity after setup",
    hint: "Viewed an activity after finishing setup",
  },
];

export function AnalyticsEarlySignals({
  summary,
  rows,
  error,
}: {
  summary: AnalyticsSignalSummary;
  rows: AnalyticsEarlySignalRow[];
  error: string | null;
}) {
  return (
    <section className="mb-8 space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
          Early signals
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--ink)]">Activation</h2>
        <p className="mt-1 max-w-3xl text-sm text-[var(--ink-soft)]">
          Accounts created, profile setup completed, and first activity viewed after setup.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <article key={card.key} className="ui-card p-4">
            <p className="text-sm font-medium text-[var(--ink-soft)]">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">
              {formatCount(summary[card.key])}
            </p>
            <p className="mt-2 text-xs text-[var(--ink-soft)]">{card.hint}</p>
          </article>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-amber-700">
          Early signals could not be loaded ({error}).
        </p>
      ) : null}

      <article className="ui-card p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[var(--ink)]">People</h3>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            One row per account from the early-signal view.
          </p>
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--ink-soft)]">
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium">Profile setup</th>
                  <th className="px-3 py-2 font-medium">First activity after setup</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.userId} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-3 py-3 font-mono text-xs text-[var(--ink)]">{row.userId}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-[var(--ink-soft)]">
                      {formatTimestamp(row.accountCreatedAt)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[var(--ink-soft)]">
                      {formatTimestamp(row.profileSetupCompletedAt)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[var(--ink-soft)]">
                      {formatTimestamp(row.firstActivityViewedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">No early-signal rows yet.</p>
        )}
      </article>
    </section>
  );
}
