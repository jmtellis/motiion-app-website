"use client";

import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { useEffect, useRef } from "react";

import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";
import { groupMarkersByWork, isScheduleMarker } from "@/lib/talent-buyers/schedule-markers";

import { eventTypeColor, formatTimeShort } from "./calendar-utils";
import { formatMarkerDate, markerAccessibleLabel, markerChipCopy } from "./ScheduleMarkerLink";

/** Same-day markers grouped by project so a busy day asks "which project?" first. */
export function DayMarkersPopover({
  dateKey,
  events,
  anchorRect,
  onClose,
}: {
  dateKey: string;
  events: CalendarEvent[];
  anchorRect: DOMRect;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const groups = groupMarkersByWork(events.filter(isScheduleMarker));

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    ref.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  const width = 300;
  const left = Math.max(16, Math.min(anchorRect.left, window.innerWidth - width - 16));
  const top = Math.min(anchorRect.bottom + 8, window.innerHeight - 120);
  const dateLabel = formatMarkerDate(dateKey);

  return (
    <div
      ref={ref}
      className="bd-cal-popover bd-cal-day-list"
      style={{ top, left, width }}
      role="dialog"
      aria-label={groups.length > 1 ? `Choose a project for ${dateLabel}` : dateLabel}
    >
      <div className="bd-cal-popover__header">
        <span className="bd-cal-popover__type">{dateLabel}</span>
        <button type="button" className="bd-cal-popover__close" onClick={onClose} aria-label="Close">
          <X className="size-3.5" />
        </button>
      </div>
      {groups.length > 1 ? (
        <p className="bd-cal-day-list__lede">{groups.length} projects on this day</p>
      ) : null}
      <ul className="bd-cal-day-list__groups">
        {groups.map((group) => (
          <li key={group.workId} className="bd-cal-day-list__group">
            <p className="bd-cal-day-list__project">{group.workTitle}</p>
            <ul className="bd-cal-day-list__beats">
              {group.markers.map((marker) => {
                const colors = eventTypeColor(marker.eventType);
                const { secondary } = markerChipCopy(marker);
                return (
                  <li key={marker.id}>
                    <Link
                      href={marker.href}
                      className="bd-cal-day-list__beat"
                      style={{ borderLeftColor: colors.accent }}
                      aria-label={markerAccessibleLabel(marker)}
                      onClick={onClose}
                    >
                      <span className="bd-cal-day-list__beat-time">
                        {marker.allDay ? "All day" : formatTimeShort(marker.startTime)}
                      </span>
                      <span className="bd-cal-day-list__beat-title">{secondary}</span>
                      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
