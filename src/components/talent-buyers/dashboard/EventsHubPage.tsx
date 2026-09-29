"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { EventsCalendar } from "@/components/talent-buyers/dashboard/calendar/EventsCalendar";
import { toDateKey } from "@/components/talent-buyers/dashboard/calendar/calendar-utils";
import { BUYER_HOME_PATH } from "@/lib/talent-buyers/dashboard-data";
import {
  localizeScheduleMarkers,
  type ScheduleMarker,
} from "@/lib/talent-buyers/schedule-markers";

import "./events-hub.css";

const subscribeNever = () => () => {};

/**
 * Industry Calendar uses the same page chrome as talent Schedule.
 * Markers come from project dates and open their project. No classes,
 * sessions, or a create flow live here.
 */
export function EventsHubPage({ markers }: { markers: ScheduleMarker[] }) {
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const events = useMemo(
    () => (hydrated ? localizeScheduleMarkers(markers) : markers),
    [hydrated, markers],
  );
  const today = toDateKey(new Date());
  const hasUpcoming = events.some((event) => event.date >= today);

  return (
    <div className="talent-schedule buyer-dashboard buyer-calendar-page events-hub events-hub--schedule">
      <header className="talent-schedule__header">
        <h1>Calendar</h1>
      </header>
      {hasUpcoming ? null : (
        <div className="events-hub__empty-note" role="status">
          <p>No upcoming dates across your projects</p>
          <Link href={BUYER_HOME_PATH} className="bd-btn-secondary">
            Go to Home
          </Link>
        </div>
      )}
      <EventsCalendar events={events} embedded layout="page" markerMode defaultView="week" />
    </div>
  );
}
