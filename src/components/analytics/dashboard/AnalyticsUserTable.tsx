import Link from "next/link";

import { getProfileInitials } from "@/lib/auth/avatar";
import type { AnalyticsUserSummary } from "@/lib/analytics/types";

function UserAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--line)] text-xs font-semibold text-[var(--ink)]">
      {getProfileInitials(name)}
    </div>
  );
}

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
}: {
  users: AnalyticsUserSummary[];
  range: string;
  query?: string;
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
          {users.map((user) => (
            <tr key={user.userId} className="border-b border-[var(--line)] last:border-0">
              <td className="px-3 py-3">
                <Link
                  href={`/admin/analytics?range=${range}&user=${user.userId}${query ? `&query=${encodeURIComponent(query)}` : ""}`}
                  className="flex items-center gap-3 hover:opacity-80"
                >
                  <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} />
                  <div>
                    <p className="font-medium text-[var(--ink)]">{user.displayName}</p>
                    <p className="text-xs text-[var(--ink-soft)]">{user.email ?? user.username ?? user.userId}</p>
                  </div>
                </Link>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsUserCard({ user }: { user: AnalyticsUserSummary }) {
  return (
    <article className="ui-card flex items-start gap-4 p-4">
      <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} />
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold text-[var(--ink)]">{user.displayName}</h3>
        <p className="text-sm text-[var(--ink-soft)]">{user.email ?? "No email"}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--ink-soft)]">
          <span>{user.eventCount} events</span>
          <span>{user.sessionCount} sessions</span>
          <span>{user.activeDays} active days</span>
          <span>{user.accountType ?? "unknown account"}</span>
          {user.role ? <span>{user.role}</span> : null}
        </div>
      </div>
    </article>
  );
}
