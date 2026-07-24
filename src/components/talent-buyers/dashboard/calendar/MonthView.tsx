"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";

import {
  addMonths,
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
/** Months before/after the range center kept mounted for snap scrolling. */
const MONTH_WINDOW = 12;

type MonthViewProps = {
  anchorDate: Date;
  events: CalendarEvent[];
  onSelectDay: (date: Date) => void;
  onVisibleMonthChange: (date: Date) => void;
};

type PopoverState = {
  event: CalendarEvent;
  rect: DOMRect;
};

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthsBetween(a: Date, b: Date): number {
  return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
}

function MonthGrid({
  monthDate,
  events,
  today,
  onSelectDay,
  onOpenEvent,
}: {
  monthDate: Date;
  events: CalendarEvent[];
  today: Date;
  onSelectDay: (date: Date) => void;
  onOpenEvent: (event: CalendarEvent, rect: DOMRect) => void;
}) {
  const gridDays = useMemo(() => monthGridDays(monthDate), [monthDate]);

  return (
    <div className="bd-cal-month__grid">
      {gridDays.map((day) => {
        const inMonth = isSameMonth(day, monthDate);
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
                      onOpenEvent(event, e.currentTarget.getBoundingClientRect())
                    }
                  >
                    <span className="bd-cal-month__chip-time">
                      {formatTimeShort(event.startTime)}
                    </span>
                    <span className="bd-cal-month__chip-title">{event.title}</span>
                  </button>
                );
              })}

              {overflow > 0 ? (
                <button
                  type="button"
                  className="bd-cal-month__more"
                  onClick={() => onSelectDay(day)}
                >
                  +{overflow} more
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MonthView({
  anchorDate,
  events,
  onSelectDay,
  onVisibleMonthChange,
}: MonthViewProps) {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [ready, setReady] = useState(false);
  const today = useMemo(() => new Date(), []);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const suppressSyncRef = useRef(true);
  const visibleMonthKeyRef = useRef(monthKey(anchorDate));
  const pendingAnchorRef = useRef(startOfMonth(anchorDate));
  const [rangeCenter, setRangeCenter] = useState(() => startOfMonth(anchorDate));
  const [pageHeight, setPageHeight] = useState(0);

  const months = useMemo(() => {
    const start = addMonths(rangeCenter, -MONTH_WINDOW);
    return Array.from({ length: MONTH_WINDOW * 2 + 1 }, (_, index) =>
      addMonths(start, index),
    );
  }, [rangeCenter]);

  const indexForDate = useCallback(
    (date: Date) => {
      const delta = monthsBetween(startOfMonth(date), months[0]);
      if (delta < 0 || delta >= months.length) return -1;
      return delta;
    },
    [months],
  );

  const placeAtDate = useCallback(
    (date: Date) => {
      const scroller = scrollerRef.current;
      if (!scroller || !pageHeight) return false;

      const index = indexForDate(date);
      if (index < 0) return false;

      const key = monthKey(date);
      suppressSyncRef.current = true;
      visibleMonthKeyRef.current = key;
      // Instant — never animate the initial placement.
      scroller.scrollTop = index * pageHeight;
      return true;
    },
    [indexForDate, pageHeight],
  );

  const animateToDate = useCallback(
    (date: Date) => {
      const scroller = scrollerRef.current;
      if (!scroller || !pageHeight) return false;

      const index = indexForDate(date);
      if (index < 0) return false;

      const key = monthKey(date);
      suppressSyncRef.current = true;
      visibleMonthKeyRef.current = key;
      scroller.scrollTo({ top: index * pageHeight, behavior: "smooth" });
      window.setTimeout(() => {
        suppressSyncRef.current = false;
      }, 450);
      return true;
    },
    [indexForDate, pageHeight],
  );

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const updateHeight = () => {
      const next = scroller.clientHeight;
      setPageHeight((current) => (current === next ? current : next));
    };
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  // Position on the target month in the same frame we know the page height,
  // then reveal so the user never sees the buffer above scroll into place.
  useLayoutEffect(() => {
    if (!pageHeight) return;

    const target = pendingAnchorRef.current;
    const index = indexForDate(target);

    if (index < 0) {
      setRangeCenter(startOfMonth(target));
      setReady(false);
      return;
    }

    placeAtDate(target);
    setReady(true);
    // Allow user-driven scroll sync on the next frame (after reveal).
    requestAnimationFrame(() => {
      suppressSyncRef.current = false;
    });
  }, [months, pageHeight, indexForDate, placeAtDate]);

  // Toolbar prev/next/Today — only after the view is already showing.
  useLayoutEffect(() => {
    pendingAnchorRef.current = startOfMonth(anchorDate);

    if (!ready || !pageHeight) return;
    const key = monthKey(anchorDate);
    if (key === visibleMonthKeyRef.current) return;

    if (indexForDate(anchorDate) < 0) {
      setRangeCenter(startOfMonth(anchorDate));
      setReady(false);
      return;
    }

    animateToDate(anchorDate);
  }, [anchorDate, ready, pageHeight, indexForDate, animateToDate]);

  useEffect(() => {
    const anchorMonth = startOfMonth(anchorDate);
    const delta = Math.abs(monthsBetween(anchorMonth, rangeCenter));
    if (delta > MONTH_WINDOW - 2) {
      pendingAnchorRef.current = anchorMonth;
      setRangeCenter(anchorMonth);
      setReady(false);
    }
  }, [anchorDate, rangeCenter]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !pageHeight || !ready) return;

    let scrollTimeout: number | undefined;

    const publishVisibleMonth = () => {
      if (suppressSyncRef.current) return;

      const index = Math.round(scroller.scrollTop / pageHeight);
      const monthDate = months[index];
      if (!monthDate) return;

      const key = monthKey(monthDate);
      if (key === visibleMonthKeyRef.current) return;

      visibleMonthKeyRef.current = key;
      pendingAnchorRef.current = startOfMonth(monthDate);
      onVisibleMonthChange(startOfMonth(monthDate));
    };

    const onScrollEnd = () => publishVisibleMonth();
    const onScroll = () => {
      if (suppressSyncRef.current) return;
      window.clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(publishVisibleMonth, 80);
    };

    scroller.addEventListener("scrollend", onScrollEnd);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scrollend", onScrollEnd);
      scroller.removeEventListener("scroll", onScroll);
      window.clearTimeout(scrollTimeout);
    };
  }, [months, onVisibleMonthChange, pageHeight, ready]);

  return (
    <div className="bd-cal-month">
      <div className="bd-cal-month__weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bd-cal-month__weekday">
            {label}
          </div>
        ))}
      </div>

      <div
        ref={scrollerRef}
        className={`bd-cal-month__scroller${ready ? " bd-cal-month__scroller--ready" : ""}`}
        aria-busy={!ready}
      >
        {months.map((monthDate) => {
          const key = monthKey(monthDate);
          return (
            <section
              key={key}
              data-month-key={key}
              className="bd-cal-month__page"
              style={pageHeight ? { height: pageHeight } : undefined}
              aria-label={monthDate.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            >
              <MonthGrid
                monthDate={monthDate}
                events={events}
                today={today}
                onSelectDay={onSelectDay}
                onOpenEvent={(event, rect) => setPopover({ event, rect })}
              />
            </section>
          );
        })}
      </div>

      {popover ? (
        <EventPopover
          event={popover.event}
          anchorRect={popover.rect}
          onClose={() => setPopover(null)}
        />
      ) : null}
    </div>
  );
}
