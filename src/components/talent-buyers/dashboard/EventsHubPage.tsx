"use client";

import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";
import { EventsCalendar } from "@/components/talent-buyers/dashboard/calendar/EventsCalendar";

import { IndustryPageHeader } from "./IndustryUI";
import { CreateActivityButton } from "./CreateActivityButton";
import "./events-hub.css";

export function EventsHubPage({
  calendarEvents,
}: {
  calendarEvents: CalendarEvent[];
}) {
  return (
    <div className="events-hub events-hub--schedule">
      <IndustryPageHeader
        eyebrow="Plan the day"
        title="Calendar"
        description="A shared rhythm for your castings, events, classes, and sessions."
        actions={
          <CreateActivityButton
            triggerClassName="buyer-chrome-bar__cta"
            triggerLabel="Create activity"
            showPlusIcon
          />
        }
      />
      <div className="events-hub__schedule">
        <EventsCalendar events={calendarEvents} embedded />
      </div>
    </div>
  );
}
