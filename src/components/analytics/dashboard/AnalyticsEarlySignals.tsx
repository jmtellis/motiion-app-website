import { AnalyticsPersonCell } from "@/components/analytics/dashboard/AnalyticsPersonCell";
import type { AnalyticsEarlySignalPerson, AnalyticsSignalSummary } from "@/lib/analytics/early-signals";
import { identityFromFields } from "@/lib/analytics/person-identity";

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

export function AnalyticsEarlySignals({
  summary,
  rows,
  error,
  hrefBase = "/admin/analytics",
  range = "30d",
}: {
  summary: AnalyticsSignalSummary;
  rows: AnalyticsEarlySignalPerson[];
  error: string | null;
  hrefBase?: string;
  range?: string;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--ink)]">People</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          {formatCount(summary.accountsCreated)} accounts created ·{" "}
          {formatCount(summary.profileSetupCompleted)} finished profile setup ·{" "}
          {formatCount(summary.firstActivityAfterSetup)} viewed a first activity
        </p>
      </div>

      {error ? (
        <p className="text-sm text-amber-700">
          Some early-signal details could not be loaded ({error}).
        </p>
      ) : null}

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--ink-soft)]">
                <th className="px-3 py-2 font-medium">Person</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Profile setup</th>
                <th className="px-3 py-2 font-medium">First activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const person = identityFromFields({
                  userId: row.userId,
                  displayName: row.displayName,
                  email: row.email,
                  username: row.username,
                  avatarUrl: row.avatarUrl,
                  hasProfile: row.hasProfile,
                });
                return (
                  <tr key={row.userId} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-3 py-3">
                      <AnalyticsPersonCell
                        person={person}
                        href={`${hrefBase}?range=${range}&user=${encodeURIComponent(row.userId)}`}
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[var(--ink-soft)]">
                      {formatTimestamp(row.accountCreatedAt)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[var(--ink-soft)]">
                      {formatTimestamp(row.profileSetupCompletedAt)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[var(--ink-soft)]">
                      {row.firstActivityEventName ? (
                        <span className="block font-medium text-[var(--ink)]">
                          {row.firstActivityEventName}
                        </span>
                      ) : null}
                      {formatTimestamp(row.firstActivityViewedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--ink-soft)]">No early-signal rows yet.</p>
      )}
    </section>
  );
}
