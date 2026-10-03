import { AnalyticsPersonCell } from "@/components/analytics/dashboard/AnalyticsPersonCell";
import { getEventLabel } from "@/lib/analytics/events";
import { identityFromFields } from "@/lib/analytics/person-identity";
import type { AnalyticsRecentEvent, AnalyticsUserTimelineEvent } from "@/lib/analytics/types";

import { AnalyticsUserCard } from "./AnalyticsUserTable";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function UserCell({
  event,
  hrefBase,
}: {
  event: AnalyticsRecentEvent | AnalyticsUserTimelineEvent;
  hrefBase: string;
}) {
  const person = identityFromFields({
    userId: event.userId,
    displayName: event.displayName,
    email: event.email,
    username: event.username,
    avatarUrl: event.avatarUrl,
  });

  if (!event.userId) {
    return <AnalyticsPersonCell person={person} />;
  }

  return (
    <AnalyticsPersonCell
      person={person}
      href={`${hrefBase}?user=${encodeURIComponent(event.userId)}`}
    />
  );
}

function EventRow({
  event,
  hrefBase,
}: {
  event: AnalyticsRecentEvent | AnalyticsUserTimelineEvent;
  hrefBase: string;
}) {
  return (
    <tr className="border-b border-[var(--line)] last:border-0">
      <td className="px-3 py-3 whitespace-nowrap text-[var(--ink-soft)]">
        {formatTimestamp(event.createdAt)}
      </td>
      <td className="px-3 py-3">
        <UserCell event={event} hrefBase={hrefBase} />
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

export function AnalyticsRecentEventsTable({
  events,
  hrefBase = "/admin/analytics",
}: {
  events: AnalyticsRecentEvent[];
  hrefBase?: string;
}) {
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
            <EventRow key={event.id} event={event} hrefBase={hrefBase} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsUserTimeline({
  user,
  events,
  hrefBase = "/admin/analytics",
}: {
  user: NonNullable<Parameters<typeof AnalyticsUserCard>[0]["user"]>;
  events: AnalyticsUserTimelineEvent[];
  hrefBase?: string;
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
                <EventRow key={event.id} event={event} hrefBase={hrefBase} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
