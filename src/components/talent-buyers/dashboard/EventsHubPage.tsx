"use client";

import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";
import { EventsCalendar } from "@/components/talent-buyers/dashboard/calendar/EventsCalendar";

import "./events-hub.css";

export function EventsHubPage({ calendarEvents }: { calendarEvents: CalendarEvent[] }) {
  return (
    <div className="events-hub events-hub--schedule">
      <h1 className="sr-only">Calendar</h1>
      <div className="events-hub__schedule">
        <EventsCalendar events={calendarEvents} embedded />
      </div>
    </div>
  );
}
