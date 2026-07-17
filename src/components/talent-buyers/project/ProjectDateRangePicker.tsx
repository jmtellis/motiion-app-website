"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

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

function formatDisplayDate(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return "Select date";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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

function isBeforeDay(a: Date, b: Date) {
  const aTime = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bTime = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return aTime < bTime;
}

function isAfterDay(a: Date, b: Date) {
  const aTime = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bTime = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return aTime > bTime;
}

export function ProjectDatePickerField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => parseIsoDate(value) ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsed = parseIsoDate(value);
    if (parsed) setViewMonth(parsed);
  }, [value]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const days = buildCalendarDays(viewMonth);
  const selected = parseIsoDate(value);
  const min = minDate ? parseIsoDate(minDate) : null;
  const max = maxDate ? parseIsoDate(maxDate) : null;
  const today = new Date();

  return (
    <div ref={containerRef} className="project-create__field">
      <span className="project-create__label">{label}</span>
      <button
        type="button"
        className="project-create__date-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <Calendar className="project-create__date-trigger-icon" aria-hidden />
        <span className={value ? "project-create__date-trigger-value" : "project-create__date-trigger-placeholder"}>
          {formatDisplayDate(value)}
        </span>
      </button>

      {open ? (
        <div className="project-create__date-popover">
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
              const inMonth = day.getMonth() === viewMonth.getMonth();
              const isSelected = selected ? isSameDay(day, selected) : false;
              const isToday = isSameDay(day, today);
              const disabled =
                (min ? isBeforeDay(day, min) : false) || (max ? isAfterDay(day, max) : false);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  className={[
                    "project-create__date-day",
                    !inMonth ? "project-create__date-day--muted" : "",
                    isSelected ? "project-create__date-day--selected" : "",
                    isToday ? "project-create__date-day--today" : "",
                    disabled ? "project-create__date-day--disabled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    if (disabled) return;
                    onChange(formatIsoDate(day));
                    setOpen(false);
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {value ? (
            <button
              type="button"
              className="project-create__date-clear"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear date
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ProjectDateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}) {
  return (
    <div className="project-create__date-range">
      <ProjectDatePickerField
        label="Start"
        value={startDate}
        maxDate={endDate || undefined}
        onChange={(nextStart) => {
          onStartDateChange(nextStart);
          if (nextStart && endDate && endDate < nextStart) {
            onEndDateChange(nextStart);
          }
        }}
      />
      <ProjectDatePickerField
        label="End"
        value={endDate}
        minDate={startDate || undefined}
        onChange={onEndDateChange}
      />
    </div>
  );
}
