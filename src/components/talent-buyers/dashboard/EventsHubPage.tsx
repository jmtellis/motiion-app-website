"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

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
export function EventsHubPage({ markers, error = null }: { markers: ScheduleMarker[]; error?: string | null }) {
  const router = useRouter();
  const [lastGood, setLastGood] = useState(markers);
  if (!error && lastGood !== markers) setLastGood(markers);
  const visibleMarkers = error && !markers.length ? lastGood : markers;
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const events = useMemo(
    () => (hydrated ? localizeScheduleMarkers(visibleMarkers) : visibleMarkers),
    [hydrated, visibleMarkers],
  );
  const today = toDateKey(new Date());
  const hasUpcoming = events.some((event) => event.date >= today);

  return (
    <div className="talent-schedule buyer-dashboard buyer-calendar-page events-hub events-hub--schedule">
      <header className="talent-schedule__header">
        <h1>Calendar</h1>
      </header>
      {error ? <div role="status" className="events-hub__empty-note"><p>{error}</p><button type="button" className="bd-btn-secondary" onClick={() => router.refresh()}>Retry calendar</button></div> : null}
      {hasUpcoming || error ? null : (
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
