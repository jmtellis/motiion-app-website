"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";
import {
  isScheduleMarker,
  scheduleMarkerAccessibleLabel,
  scheduleMarkerDisplay,
} from "@/lib/talent-buyers/schedule-markers";

import { formatTimeShort, parseDateKey } from "./calendar-utils";

export function formatMarkerDate(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function markerAccessibleLabel(event: CalendarEvent) {
  if (!isScheduleMarker(event)) return event.title;
  return scheduleMarkerAccessibleLabel(event, formatMarkerDate, formatTimeShort);
}

/** Primary (work item) + secondary (beat) copy for a marker chip. */
export function markerChipCopy(event: CalendarEvent) {
  if (!isScheduleMarker(event)) return { primary: event.title, secondary: null as string | null };
  return scheduleMarkerDisplay(event);
}

/** Marker tap opens the owning project / ability directly — no Schedule-native detail. */
export function ScheduleMarkerLink({
  event,
  className,
  style,
  children,
}: {
  event: CalendarEvent & { href: string };
  className: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <Link href={event.href} className={className} style={style} aria-label={markerAccessibleLabel(event)}>
      {children}
    </Link>
  );
}
