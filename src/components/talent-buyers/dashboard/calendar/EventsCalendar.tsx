"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";
import { SegmentedControl } from "@/components/talent-buyers/dashboard/SegmentedControl";

import {
  formatMonthYear,
  navigateAnchor,
  type CalendarView,
} from "./calendar-utils";
import { CalendarEmptyState } from "./CalendarEmptyState";
import { MonthView } from "./MonthView";
import { TimeGrid } from "./TimeGrid";

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

type EventsCalendarProps = {
  events: CalendarEvent[];
  /** When true, calendar sits under the Calendar page chrome. */
  embedded?: boolean;
};

export function EventsCalendar({ events, embedded = false }: EventsCalendarProps) {
  const [view, setView] = useState<CalendarView>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const isEmpty = events.length === 0;

  function goPrev() {
    setAnchorDate((d) => navigateAnchor(d, view, -1));
  }

  function goNext() {
    setAnchorDate((d) => navigateAnchor(d, view, 1));
  }

  function selectDay(date: Date) {
    setAnchorDate(date);
    setView("day");
  }

  if (isEmpty) {
    return <CalendarEmptyState embedded={embedded} />;
  }

  return (
    <div className={`bd-cal${embedded ? " bd-cal--embedded" : ""}`}>
      <div className="bd-cal__toolbar bd-cal__toolbar--schedule">
        <div className="bd-cal__toolbar-start">
          <h3 className="bd-cal__title">{formatMonthYear(anchorDate)}</h3>
        </div>

        <div className="bd-cal__toolbar-center">
          <SegmentedControl
            ariaLabel="Calendar range"
            value={view}
            onChange={setView}
            options={VIEW_OPTIONS}
            equalWidth
            hug
            activeTone="white"
          />
        </div>

        <div className="bd-cal__toolbar-end">
          <div className="bd-cal__nav">
            <button
              type="button"
              className="bd-cal__nav-btn"
              onClick={goPrev}
              aria-label="Previous"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              className="bd-cal__nav-btn"
              onClick={goNext}
              aria-label="Next"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="bd-cal-workspace">
        <div className="bd-cal__body">
          {view === "month" ? (
            <MonthView
              anchorDate={anchorDate}
              events={events}
              onSelectDay={selectDay}
              onVisibleMonthChange={setAnchorDate}
            />
          ) : (
            <TimeGrid anchorDate={anchorDate} events={events} mode={view} />
          )}
        </div>
      </div>
    </div>
  );
}
