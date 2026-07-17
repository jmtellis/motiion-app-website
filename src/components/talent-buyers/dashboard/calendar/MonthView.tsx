"use client";

import { useMemo, useState } from "react";

import type { CalendarEvent } from "@/app/(buyer-app)/events/actions";

import {
  eventTypeColor,
  eventsForDate,
  formatTimeShort,
  isSameDay,
  isSameMonth,
  monthGridDays,
  toDateKey,
  WEEKDAY_LABELS,
} from "./calendar-utils";
import { EventPopover } from "./EventPopover";

const MAX_VISIBLE = 3;

type MonthViewProps = {
  anchorDate: Date;
  events: CalendarEvent[];
  onSelectDay: (date: Date) => void;
};

type PopoverState = {
  event: CalendarEvent;
  rect: DOMRect;
};

export function MonthView({ anchorDate, events, onSelectDay }: MonthViewProps) {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const today = useMemo(() => new Date(), []);
  const gridDays = useMemo(() => monthGridDays(anchorDate), [anchorDate]);

  return (
    <div className="bd-cal-month">
      <div className="bd-cal-month__weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bd-cal-month__weekday">
            {label}
          </div>
        ))}
      </div>

      <div className="bd-cal-month__grid">
        {gridDays.map((day) => {
          const inMonth = isSameMonth(day, anchorDate);
          const isToday = isSameDay(day, today);
          const dayEvents = eventsForDate(events, day);
          const visible = dayEvents.slice(0, MAX_VISIBLE);
          const overflow = dayEvents.length - MAX_VISIBLE;

          return (
            <div
              key={toDateKey(day)}
              className={`bd-cal-month__cell${inMonth ? "" : " bd-cal-month__cell--muted"}`}
            >
              <button
                type="button"
                className={`bd-cal-month__day-num${isToday ? " bd-cal-month__day-num--today" : ""}`}
                onClick={() => onSelectDay(day)}
              >
                {day.getDate()}
              </button>

              <div className="bd-cal-month__events">
                {visible.map((event) => {
                  const colors = eventTypeColor(event.eventType);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      className="bd-cal-month__chip"
                      style={{
                        background: colors.bg,
                        borderLeftColor: colors.accent,
                      }}
                      onClick={(e) =>
                        setPopover({
                          event,
                          rect: e.currentTarget.getBoundingClientRect(),
                        })
                      }
                    >
                      <span className="bd-cal-month__chip-time">
                        {formatTimeShort(event.startTime)}
                      </span>
                      <span className="bd-cal-month__chip-title">{event.title}</span>
                    </button>
                  );
                })}

                {overflow > 0 && (
                  <button
                    type="button"
                    className="bd-cal-month__more"
                    onClick={() => onSelectDay(day)}
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {popover && (
        <EventPopover
          event={popover.event}
          anchorRect={popover.rect}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}
