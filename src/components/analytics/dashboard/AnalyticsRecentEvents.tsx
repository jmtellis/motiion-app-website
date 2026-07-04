import Link from "next/link";

import { getEventLabel } from "@/lib/analytics/events";
import { getProfileInitials } from "@/lib/auth/avatar";
import type { AnalyticsRecentEvent, AnalyticsUserTimelineEvent } from "@/lib/analytics/types";

import { AnalyticsUserCard } from "./AnalyticsUserTable";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function UserCell({ event }: { event: AnalyticsRecentEvent | AnalyticsUserTimelineEvent }) {
  if (!event.userId) {
    return <span className="text-[var(--ink-soft)]">Anonymous</span>;
  }

  return (
    <Link
      href={`/admin/analytics?user=${event.userId}`}
      className="flex items-center gap-2 hover:opacity-80"
    >
      {event.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--line)] text-[10px] font-semibold">
          {getProfileInitials(event.displayName)}
        </div>
      )}
      <div>
        <p className="font-medium text-[var(--ink)]">{event.displayName}</p>
        <p className="text-xs text-[var(--ink-soft)]">{event.email ?? event.username ?? event.userId}</p>
      </div>
    </Link>
  );
}

function EventRow({ event }: { event: AnalyticsRecentEvent | AnalyticsUserTimelineEvent }) {
  return (
    <tr className="border-b border-[var(--line)] last:border-0">
      <td className="px-3 py-3 whitespace-nowrap text-[var(--ink-soft)]">
        {formatTimestamp(event.createdAt)}
      </td>
      <td className="px-3 py-3">
        <UserCell event={event} />
      </td>
      <td className="px-3 py-3 font-medium text-[var(--ink)]">{getEventLabel(event.eventName)}</td>
      <td className="px-3 py-3 uppercase text-[var(--ink-soft)]">{event.platform}</td>
      <td className="px-3 py-3 text-[var(--ink-soft)]">{event.path ?? "—"}</td>
      <td className="px-3 py-3 text-[var(--ink-soft)]">
        {Object.keys(event.properties).length > 0
          ? JSON.stringify(event.properties)
          : "—"}
      </td>
    </tr>
  );
}

export function AnalyticsRecentEventsTable({ events }: { events: AnalyticsRecentEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-[var(--ink-soft)]">No recent events in this range.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] text-[var(--ink-soft)]">
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">User</th>
            <th className="px-3 py-2 font-medium">Event</th>
            <th className="px-3 py-2 font-medium">Platform</th>
            <th className="px-3 py-2 font-medium">Path</th>
            <th className="px-3 py-2 font-medium">Properties</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsUserTimeline({
  user,
  events,
}: {
  user: NonNullable<Parameters<typeof AnalyticsUserCard>[0]["user"]>;
  events: AnalyticsUserTimelineEvent[];
}) {
  return (
    <section className="space-y-4">
      <AnalyticsUserCard user={user} />
      {events.length === 0 ? (
        <p className="text-sm text-[var(--ink-soft)]">No tracked events for this user in the selected range.</p>
      ) : (
        <div className="ui-card overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--ink-soft)]">
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Event</th>
                <th className="px-3 py-2 font-medium">Platform</th>
                <th className="px-3 py-2 font-medium">Path</th>
                <th className="px-3 py-2 font-medium">Properties</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
