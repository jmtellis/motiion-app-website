"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";

import {
  addDays,
  eventTypeColor,
  eventsForDate,
  formatHourLabel,
  formatTimeRange,
  HOUR_HEIGHT,
  HOURS,
  isSameDay,
  layoutDayEvents,
  minutesToTimeLabel,
  startOfWeek,
  type PlacedEvent,
} from "./calendar-utils";
import { EventPopover } from "./EventPopover";

type TimeGridProps = {
  anchorDate: Date;
  events: CalendarEvent[];
  mode: "day" | "week";
};

type PopoverState = {
  event: CalendarEvent;
  rect: DOMRect;
};

export function TimeGrid({ anchorDate, events, mode }: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const days = useMemo(() => {
    if (mode === "day") return [anchorDate];
    const weekStart = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [anchorDate, mode]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 7 * HOUR_HEIGHT;
  }, [mode, anchorDate]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = (nowMinutes / 60) * HOUR_HEIGHT;

  function handleEventClick(event: CalendarEvent, e: React.MouseEvent<HTMLButtonElement>) {
    setPopover({ event, rect: e.currentTarget.getBoundingClientRect() });
  }

  const colCount = mode === "day" ? 1 : 7;
  const gridStyle = { "--cal-cols": colCount } as React.CSSProperties;

  return (
    <div className="bd-cal-timegrid">
      <div className="bd-cal-timegrid__header" style={gridStyle}>
        <div className="bd-cal-timegrid__gutter-spacer" aria-hidden />
        {days.map((day) => {
          const isToday = isSameDay(day, now);
          return (
            <div key={day.toISOString()} className="bd-cal-timegrid__day-header">
              <span className="bd-cal-timegrid__weekday">
                {day.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span
                className={`bd-cal-timegrid__day-num${isToday ? " bd-cal-timegrid__day-num--today" : ""}`}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      <div className="bd-cal-timegrid__body" ref={scrollRef} data-lenis-prevent>
        <div className="bd-cal-timegrid__grid" style={{ ...gridStyle, height: 24 * HOUR_HEIGHT }}>
          <div className="bd-cal-timegrid__gutter">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="bd-cal-timegrid__hour-label"
                style={{ height: HOUR_HEIGHT }}
              >
                {hour > 0 ? formatHourLabel(hour) : ""}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayEvents = layoutDayEvents(eventsForDate(events, day));
            const isToday = isSameDay(day, now);

            return (
              <div key={day.toISOString()} className="bd-cal-timegrid__column">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="bd-cal-timegrid__hour-cell"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {isToday && (
                  <div className="bd-cal-timegrid__now-line" style={{ top: nowTop }}>
                    <span className="bd-cal-timegrid__now-badge">
                      {minutesToTimeLabel(nowMinutes)}
                    </span>
                  </div>
                )}

                {dayEvents.map((placed) => (
                  <EventBlock
                    key={placed.id}
                    placed={placed}
                    onClick={(e) => handleEventClick(placed, e)}
                  />
                ))}
              </div>
            );
          })}
        </div>
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

function EventBlock({
  placed,
  onClick,
}: {
  placed: PlacedEvent;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const colors = eventTypeColor(placed.eventType);
  const widthPct = 100 / placed.columnCount;
  const leftPct = placed.column * widthPct;

  return (
    <button
      type="button"
      className="bd-cal-event-block"
      style={{
        top: placed.top,
        height: Math.max(placed.height, 22),
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        background: colors.bg,
        borderLeftColor: colors.accent,
      }}
      onClick={onClick}
    >
      <span className="bd-cal-event-block__title">{placed.title}</span>
      {placed.height >= 36 && (
        <span className="bd-cal-event-block__time">
          {formatTimeRange(placed.startTime, placed.endTime)}
        </span>
      )}
    </button>
  );
}
