"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { MapPin, Users, X } from "lucide-react";

import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";
import { labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import { recordBuyerContentView } from "@/lib/talent-buyers/dashboard-live";

import {
  eventTypeColor,
  formatTimeRange,
  parseDateKey,
} from "./calendar-utils";

type EventPopoverProps = {
  event: CalendarEvent;
  anchorRect: DOMRect;
  onClose: () => void;
};

export function EventPopover({ event, anchorRect, onClose }: EventPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const colors = eventTypeColor(event.eventType);

  useEffect(() => {
    void recordBuyerContentView("event", event.id);
  }, [event.id]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  const date = parseDateKey(event.date);
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const popoverWidth = 280;
  const left = Math.min(
    anchorRect.left,
    window.innerWidth - popoverWidth - 16,
  );
  const top = anchorRect.bottom + 8;

  return (
    <div
      ref={ref}
      className="bd-cal-popover"
      style={{ top, left, width: popoverWidth }}
      role="dialog"
      aria-label={event.title}
    >
      <div className="bd-cal-popover__header">
        <span
          className="bd-cal-popover__type"
          style={{ color: colors.accent }}
        >
          {labelFromSnake(event.eventType)}
        </span>
        <button
          type="button"
          className="bd-cal-popover__close"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <h4 className="bd-cal-popover__title">{event.title}</h4>
      <p className="bd-cal-popover__time">
        {dateLabel} · {formatTimeRange(event.startTime, event.endTime)}
      </p>
      <p className="bd-cal-popover__meta">
        <MapPin className="size-3.5 shrink-0" aria-hidden />
        {event.location}
      </p>
      <p className="bd-cal-popover__meta">
        <Users className="size-3.5 shrink-0" aria-hidden />
        {event.attendeeCount}{" "}
        {event.attendeeCount === 1 ? "attendee" : "attendees"}
      </p>
      <Link href={`/calendar/${event.id}`} className="bd-btn-accent mt-3 w-full justify-center">
        Manage
      </Link>
    </div>
  );
}
