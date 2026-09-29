"use client";

import Link from "next/link";
import { useMemo } from "react";

import { EventsCalendar } from "@/components/talent-buyers/dashboard/calendar/EventsCalendar";
import { toDateKey } from "@/components/talent-buyers/dashboard/calendar/calendar-utils";
import { BUYER_HOME_PATH } from "@/lib/talent-buyers/dashboard-data";
import {
  localizeScheduleMarkers,
  type ScheduleMarker,
} from "@/lib/talent-buyers/schedule-markers";

import { IndustryPageHeader } from "./IndustryUI";
import "./events-hub.css";

/**
 * Industry Schedule: calendar chrome only. Markers come from project /
 * ability dates and open their project; Schedule never hosts boards, feeds,
 * or create.
 */
export function EventsHubPage({ markers }: { markers: ScheduleMarker[] }) {
  const events = useMemo(() => localizeScheduleMarkers(markers), [markers]);
  const today = toDateKey(new Date());
  const hasUpcoming = events.some((event) => event.date >= today);

  return (
    <div className="events-hub events-hub--schedule">
      <IndustryPageHeader
        eyebrow="Across your projects"
        title="Schedule"
        description="Dates from your projects in one calendar. Open a date to work on it inside its project."
      />
      {hasUpcoming ? null : (
        <div className="events-hub__empty-note" role="status">
          <p>No upcoming dates across your projects</p>
          <Link href={BUYER_HOME_PATH} className="bd-btn-secondary">
            Go to Home
          </Link>
        </div>
      )}
      <div className="events-hub__schedule">
        <EventsCalendar events={events} embedded markerMode defaultView="month" />
      </div>
    </div>
  );
}
