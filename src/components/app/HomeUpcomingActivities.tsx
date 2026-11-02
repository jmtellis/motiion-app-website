import Link from "next/link";
import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";

export function HomeUpcomingActivities({
  events,
  error = null,
  calendarHref = "/schedule",
}: {
  events: CalendarEvent[];
  error?: string | null;
  calendarHref?: string;
}) {
  const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
  const upcoming = events.filter((event) => event.date >= today).slice(0, 4);
  return (
    <section aria-labelledby="home-upcoming-title">
      <div className="talent-section-heading">
        <div>
          <h2 id="home-upcoming-title">Upcoming activities</h2>
          <p>Your next classes, sessions, and events.</p>
        </div>
        <Link href={calendarHref}>View calendar</Link>
      </div>
      {error ? <p role="status" className="home-panel-status">{error} <Link href={calendarHref}>Open calendar</Link></p> : null}
      {upcoming.length ? (
        <ul className="home-upcoming-activities">
          {upcoming.map((event) => (
            <li key={event.id}>
              <Link
                href={event.href ?? `/activity/${event.activityId ?? event.id}`}
              >
                <strong>{event.title}</strong>
                <span>
                  {new Date(`${event.date}T12:00:00`).toLocaleDateString(
                    undefined,
                    { weekday: "short", month: "short", day: "numeric" },
                  )}{" "}
                  · {event.allDay ? "All day" : event.startTime.slice(0, 5)}
                </span>
                <small>{event.location}{event.timeZone ? ` · ${event.timeZone}` : ""}</small>
              </Link>
            </li>
          ))}
        </ul>
      ) : error ? null : (
        <p className="home-panel-status">
          Your upcoming activities will appear here when you join or host an
          activity.
        </p>
      )}
    </section>
  );
}
