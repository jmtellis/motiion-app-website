"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function parseIsoDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildCalendarDays(month: Date) {
  const first = startOfMonth(month);
  const startOffset = first.getDay();
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

export function ProjectMultiDateCalendar({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const selectedSet = new Set(values);
  const [viewMonth, setViewMonth] = useState(() => parseIsoDate(values[0] ?? "") ?? new Date());

  useEffect(() => {
    const parsed = parseIsoDate(values[0] ?? "");
    if (parsed) setViewMonth(parsed);
  }, [values]);

  const days = buildCalendarDays(viewMonth);
  const today = new Date();

  function toggleDay(iso: string) {
    if (selectedSet.has(iso)) {
      onChange(values.filter((value) => value !== iso));
      return;
    }
    onChange([...values, iso].sort());
  }

  return (
    <div className="project-create__field">
      <span className="project-create__label">{label}</span>
      <div className="project-create__multi-calendar">
        <div className="project-create__date-popover-header">
          <button
            type="button"
            className="project-create__date-nav"
            onClick={() => setViewMonth((current) => addMonths(current, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <p className="project-create__date-month">
            {viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
          <button
            type="button"
            className="project-create__date-nav"
            onClick={() => setViewMonth((current) => addMonths(current, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>

        <div className="project-create__date-weekdays">
          {WEEKDAY_LABELS.map((day) => (
            <span key={day} className="project-create__date-weekday">
              {day}
            </span>
          ))}
        </div>

        <div className="project-create__date-grid">
          {days.map((day) => {
            const iso = formatIsoDate(day);
            const inMonth = day.getMonth() === viewMonth.getMonth();
            const isSelected = selectedSet.has(iso);
            const isToday = isSameDay(day, today);

            return (
              <button
                key={iso}
                type="button"
                aria-pressed={isSelected}
                className={[
                  "project-create__date-day",
                  !inMonth ? "project-create__date-day--muted" : "",
                  isSelected ? "project-create__date-day--selected" : "",
                  isToday ? "project-create__date-day--today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => toggleDay(iso)}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
