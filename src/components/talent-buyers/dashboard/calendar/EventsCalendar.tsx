"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";
import { SegmentedControl } from "@/components/talent-buyers/dashboard/SegmentedControl";
import "@/components/talent-buyers/dashboard/buyer-dashboard.css";
import "@/components/talent-buyers/dashboard/events-hub.css";

import {
  formatMonthYear,
  navigateAnchor,
  type CalendarView,
} from "./calendar-utils";
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
  /** Overrides the popover link. Defaults to the industry calendar detail route. */
  eventHref?: (event: CalendarEvent) => string;
  actionLabel?: string;
  /** "page": date navigation leads, range + `filter` trail; no centered switcher. */
  layout?: "centered" | "page";
  filter?: ReactNode;
  /** Events carry their own `href` and open it directly (Industry Schedule). */
  markerMode?: boolean;
  defaultView?: CalendarView;
};

export function EventsCalendar({
  events,
  embedded = false,
  eventHref,
  actionLabel,
  layout = "centered",
  filter,
  markerMode = false,
  defaultView = "week",
}: EventsCalendarProps) {
  const [view, setView] = useState<CalendarView>(defaultView);
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [transition, setTransition] = useState<{ step: number; motion: "swap" | "swap-forward" | "swap-back" }>({
    step: 0,
    motion: "swap",
  });
  const animate = (motion: "swap" | "swap-forward" | "swap-back") =>
    setTransition((current) => ({ step: current.step + 1, motion }));

  function goPrev() {
    setAnchorDate((d) => navigateAnchor(d, view, -1));
    animate("swap-back");
  }

  function goNext() {
    setAnchorDate((d) => navigateAnchor(d, view, 1));
    animate("swap-forward");
  }

  function changeView(next: CalendarView) {
    setView(next);
    animate("swap");
  }

  function goToday() {
    setAnchorDate(new Date());
    animate("swap");
  }

  function selectDay(date: Date) {
    setAnchorDate(date);
    changeView("day");
  }


  const rangeSwitch = (
    <SegmentedControl
      ariaLabel="Calendar range"
      value={view}
      onChange={changeView}
      options={VIEW_OPTIONS}
      equalWidth
      hug
      activeTone="white"
    />
  );
  const dateNav = (
    <div className="bd-cal__nav">
      <button type="button" className="bd-cal__nav-btn" onClick={goPrev} aria-label="Previous">
        <ChevronLeft className="size-4" />
      </button>
      <button type="button" className="bd-cal__nav-btn" onClick={goNext} aria-label="Next">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );

  const body = (
    <div className="bd-cal-workspace">
      <div
        key={transition.step}
        className={`bd-cal__body${transition.step ? ` ui-${transition.motion}` : ""}`}
      >
        {view === "month" ? (
          <MonthView
            anchorDate={anchorDate}
            events={events}
            onSelectDay={selectDay}
            onVisibleMonthChange={setAnchorDate}
            eventHref={eventHref}
            actionLabel={actionLabel}
            markerMode={markerMode}
          />
        ) : (
          <TimeGrid
            anchorDate={anchorDate}
            events={events}
            mode={view}
            eventHref={eventHref}
            actionLabel={actionLabel}
            markerMode={markerMode}
          />
        )}
      </div>
    </div>
  );

  if (layout === "page") {
    return (
      <div className={`bd-cal bd-cal--page${embedded ? " bd-cal--embedded" : ""}`}>
        <div className="bd-cal__toolbar bd-cal__toolbar--page">
          <div className="bd-cal__toolbar-start">
            <button type="button" className="bd-btn-secondary" onClick={goToday}>Today</button>
            {dateNav}
            <h3 className="bd-cal__title">{formatMonthYear(anchorDate)}</h3>
          </div>
          <div className="bd-cal__toolbar-end">
            {filter}
            {rangeSwitch}
          </div>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className={`bd-cal${embedded ? " bd-cal--embedded" : ""}`}>
      <div className="bd-cal__toolbar bd-cal__toolbar--schedule">
        <div className="bd-cal__toolbar-start">
          <h3 className="bd-cal__title">{formatMonthYear(anchorDate)}</h3>
        </div>

        <div className="bd-cal__toolbar-center">{rangeSwitch}</div>

        <div className="bd-cal__toolbar-end">
          <button className="bd-btn-secondary" onClick={goToday}>Today</button>
          {dateNav}
        </div>
      </div>

      {body}
    </div>
  );
}
