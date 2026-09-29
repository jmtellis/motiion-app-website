"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  toDateKey,
  type PlacedEvent,
} from "./calendar-utils";
import { DayMarkersPopover } from "./DayMarkersPopover";
import { EventPopover } from "./EventPopover";
import { markerChipCopy, ScheduleMarkerLink } from "./ScheduleMarkerLink";

const MAX_ALL_DAY_VISIBLE = 2;

type TimeGridProps = {
  anchorDate: Date;
  events: CalendarEvent[];
  mode: "day" | "week";
  eventHref?: (event: CalendarEvent) => string;
  actionLabel?: string;
  /** Markers link straight to their project; all-day overflow opens the day's project list. */
  markerMode?: boolean;
};

type PopoverState = {
  event: CalendarEvent;
  rect: DOMRect;
};

type DayListState = {
  dateKey: string;
  events: CalendarEvent[];
  rect: DOMRect;
};

export function TimeGrid({
  anchorDate,
  events,
  mode,
  eventHref,
  actionLabel,
  markerMode = false,
}: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [dayList, setDayList] = useState<DayListState | null>(null);
  const closeDayList = useCallback(() => setDayList(null), []);

  const days = useMemo(() => {
    if (mode === "day") return [anchorDate];
    const weekStart = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [anchorDate, mode]);

  const allDayByDay = useMemo(
    () => days.map((day) => eventsForDate(events, day).filter((event) => event.allDay)),
    [days, events],
  );
  const hasAllDay = allDayByDay.some((list) => list.length > 0);

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

      {hasAllDay ? (
        <div className="bd-cal-timegrid__allday" style={gridStyle}>
          <div className="bd-cal-timegrid__allday-label">All day</div>
          {days.map((day, index) => {
            const dayEvents = allDayByDay[index];
            const visible = dayEvents.slice(0, MAX_ALL_DAY_VISIBLE);
            const overflow = dayEvents.length - visible.length;
            return (
              <div key={day.toISOString()} className="bd-cal-timegrid__allday-cell">
                {visible.map((event) => (
                  <AllDayChip
                    key={event.id}
                    event={event}
                    markerMode={markerMode}
                    onOpen={(rect) => setPopover({ event, rect })}
                  />
                ))}
                {overflow > 0 ? (
                  <button
                    type="button"
                    className="bd-cal-month__more"
                    onClick={(e) =>
                      setDayList({
                        dateKey: toDateKey(day),
                        events: eventsForDate(events, day),
                        rect: e.currentTarget.getBoundingClientRect(),
                      })
                    }
                  >
                    +{overflow} more
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

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
            const dayEvents = layoutDayEvents(
              eventsForDate(events, day).filter((event) => !event.allDay),
            );
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
                    markerMode={markerMode}
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
          href={eventHref?.(popover.event)}
          actionLabel={actionLabel}
        />
      )}

      {dayList ? (
        <DayMarkersPopover
          dateKey={dayList.dateKey}
          events={dayList.events}
          anchorRect={dayList.rect}
          onClose={closeDayList}
        />
      ) : null}
    </div>
  );
}

function AllDayChip({
  event,
  markerMode,
  onOpen,
}: {
  event: CalendarEvent;
  markerMode: boolean;
  onOpen: (rect: DOMRect) => void;
}) {
  const colors = eventTypeColor(event.eventType);
  const style = { background: colors.bg, borderLeftColor: colors.accent };

  if (markerMode && event.href) {
    const copy = markerChipCopy(event);
    return (
      <ScheduleMarkerLink event={{ ...event, href: event.href }} className="bd-cal-month__chip" style={style}>
        <span className="bd-cal-month__chip-title">
          {copy.primary}
          {copy.secondary ? <span className="bd-cal-month__chip-context"> · {copy.secondary}</span> : null}
        </span>
      </ScheduleMarkerLink>
    );
  }

  return (
    <button
      type="button"
      className="bd-cal-month__chip"
      style={style}
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
    >
      <span className="bd-cal-month__chip-title">{event.title}</span>
    </button>
  );
}

function EventBlock({
  placed,
  markerMode,
  onClick,
}: {
  placed: PlacedEvent;
  markerMode: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const colors = eventTypeColor(placed.eventType);
  const widthPct = 100 / placed.columnCount;
  const leftPct = placed.column * widthPct;
  const style = {
    top: placed.top,
    height: Math.max(placed.height, 22),
    left: `calc(${leftPct}% + 2px)`,
    width: `calc(${widthPct}% - 4px)`,
    background: colors.bg,
    borderLeftColor: colors.accent,
  };
  const time =
    placed.height >= 36 ? (
      <span className="bd-cal-event-block__time">
        {formatTimeRange(placed.startTime, placed.endTime)}
      </span>
    ) : null;

  if (markerMode && placed.href) {
    const copy = markerChipCopy(placed);
    return (
      <ScheduleMarkerLink event={{ ...placed, href: placed.href }} className="bd-cal-event-block" style={style}>
        <span className="bd-cal-event-block__title">{copy.primary}</span>
        {copy.secondary && placed.height >= 36 ? (
          <span className="bd-cal-event-block__time">{copy.secondary}</span>
        ) : null}
        {placed.height >= 52 ? time : null}
      </ScheduleMarkerLink>
    );
  }

  return (
    <button type="button" className="bd-cal-event-block" style={style} onClick={onClick}>
      <span className="bd-cal-event-block__title">{placed.title}</span>
      {time}
    </button>
  );
}
