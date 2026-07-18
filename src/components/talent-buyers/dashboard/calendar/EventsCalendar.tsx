"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";

import {
  formatMonthYear,
  navigateAnchor,
  type CalendarView,
} from "./calendar-utils";
import { MonthView } from "./MonthView";
import { TimeGrid } from "./TimeGrid";

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

type EventsCalendarProps = {
  events: CalendarEvent[];
};

export function EventsCalendar({ events }: EventsCalendarProps) {
  const [view, setView] = useState<CalendarView>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  function goToday() {
    setAnchorDate(new Date());
  }

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

  return (
    <div className="bd-cal">
      <div className="bd-cal__toolbar">
        <h3 className="bd-cal__title">{formatMonthYear(anchorDate)}</h3>

        <div className="bd-cal__controls">
          <div className="bd-cal__view-toggle" role="group" aria-label="Calendar view">
            {VIEWS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`bd-cal__view-btn${view === id ? " bd-cal__view-btn--active" : ""}`}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <button type="button" className="bd-btn" onClick={goToday}>
            Today
          </button>

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

      <div className="bd-cal__body">
        {view === "month" ? (
          <MonthView
            anchorDate={anchorDate}
            events={events}
            onSelectDay={selectDay}
          />
        ) : (
          <TimeGrid anchorDate={anchorDate} events={events} mode={view} />
        )}
      </div>
    </div>
  );
}
