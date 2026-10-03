import { AnalyticsPersonCell } from "@/components/analytics/dashboard/AnalyticsPersonCell";
import { identityFromFields } from "@/lib/analytics/person-identity";
import type { AnalyticsUserSummary } from "@/lib/analytics/types";

function formatTimestamp(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AnalyticsUserTable({
  users,
  range,
  query,
  hrefBase = "/admin/analytics",
}: {
  users: AnalyticsUserSummary[];
  range: string;
  query?: string;
  hrefBase?: string;
}) {
  if (users.length === 0) {
    return <p className="text-sm text-[var(--ink-soft)]">No active users in this range.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] text-[var(--ink-soft)]">
            <th className="px-3 py-2 font-medium">User</th>
            <th className="px-3 py-2 font-medium">Account</th>
            <th className="px-3 py-2 font-medium">Events</th>
            <th className="px-3 py-2 font-medium">Sessions</th>
            <th className="px-3 py-2 font-medium">Active days</th>
            <th className="px-3 py-2 font-medium">Last seen</th>
            <th className="px-3 py-2 font-medium">Top actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const person = identityFromFields({
              userId: user.userId,
              displayName: user.displayName,
              email: user.email,
              username: user.username,
              avatarUrl: user.avatarUrl,
            });
            return (
            <tr key={user.userId} className="border-b border-[var(--line)] last:border-0">
              <td className="px-3 py-3">
                <AnalyticsPersonCell
                  person={person}
                  href={`${hrefBase}?range=${range}&user=${encodeURIComponent(user.userId)}${query ? `&query=${encodeURIComponent(query)}` : ""}`}
                />
              </td>
              <td className="px-3 py-3 text-[var(--ink-soft)]">
                {user.accountType ?? "unknown"}
                {user.role ? ` · ${user.role}` : ""}
              </td>
              <td className="px-3 py-3 font-medium text-[var(--ink)]">{user.eventCount}</td>
              <td className="px-3 py-3 text-[var(--ink-soft)]">{user.sessionCount}</td>
              <td className="px-3 py-3 text-[var(--ink-soft)]">{user.activeDays}</td>
              <td className="px-3 py-3 whitespace-nowrap text-[var(--ink-soft)]">
                {formatTimestamp(user.lastSeenAt)}
              </td>
              <td className="px-3 py-3 text-[var(--ink-soft)]">
                {user.topEvents.map((event) => event.eventName).join(", ") || "—"}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsUserCard({ user }: { user: AnalyticsUserSummary }) {
  const person = identityFromFields({
    userId: user.userId,
    displayName: user.displayName,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
  });
  return (
    <article className="ui-card space-y-3 p-4">
      <AnalyticsPersonCell person={person} />
      <div className="flex flex-wrap gap-3 text-sm text-[var(--ink-soft)]">
          <span>{user.eventCount} events</span>
          <span>{user.sessionCount} sessions</span>
          <span>{user.activeDays} active days</span>
          <span>{user.accountType ?? "unknown account"}</span>
          {user.role ? <span>{user.role}</span> : null}
      </div>
    </article>
  );
}
