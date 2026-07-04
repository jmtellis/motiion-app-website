import { MapPin } from "lucide-react";

import { formatBuyerDateTime, labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import type { BuyerEventSummary } from "@/types/talent-buyer-dashboard";

function eventDateParts(dateTime: string) {
  const date = new Date(dateTime);
  return {
    month: date.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: date.getDate(),
    weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
  };
}

export function EventCard({
  event,
  variant = "light",
}: {
  event: BuyerEventSummary;
  variant?: "light" | "dark";
}) {
  const { month, day, weekday } = eventDateParts(event.dateTime);
  const isDark = variant === "dark";

  return (
    <article
      className={`flex gap-4 rounded-xl p-4 transition ${
        isDark
          ? "hover:bg-white/4"
          : "rounded-[var(--radius-card)] border border-[var(--line)] bg-white hover:border-[#d6d4ce]"
      }`}
    >
      <div
        className={`flex w-16 shrink-0 flex-col items-center justify-center rounded-xl border px-2 py-3 text-center ${
          isDark
            ? "border-white/10 bg-white/4"
            : "border-[var(--line)] bg-[var(--tone)]"
        }`}
      >
        <span className={`text-[10px] font-bold tracking-[0.14em] ${isDark ? "text-white/50" : "text-[var(--ink-soft)]"}`}>
          {month}
        </span>
        <span className={`text-2xl font-semibold leading-none ${isDark ? "text-white" : "text-[var(--ink)]"}`}>{day}</span>
        <span className={`mt-1 text-[10px] font-medium ${isDark ? "text-white/58" : "text-[var(--ink-soft)]"}`}>
          {weekday}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-xs font-semibold tracking-[0.12em] uppercase ${isDark ? "text-white/42" : "text-[var(--ink-soft)]"}`}>
              {labelFromSnake(event.eventType)}
            </p>
            <h3 className={`mt-1 text-base font-semibold ${isDark ? "text-white" : "text-[var(--ink)]"}`}>{event.title}</h3>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
              isDark
                ? "border-white/10 bg-white/8 text-white/64"
                : "border-[var(--line)] bg-[var(--tone)] text-[var(--ink-soft)]"
            }`}
          >
            {labelFromSnake(event.status)}
          </span>
        </div>
        <p className={`mt-3 text-sm ${isDark ? "text-white/64" : "text-[var(--ink-soft)]"}`}>
          {formatBuyerDateTime(event.dateTime)}
        </p>
        <p className={`mt-1 inline-flex items-center gap-1.5 text-sm ${isDark ? "text-white/64" : "text-[var(--ink-soft)]"}`}>
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {event.location}
        </p>
      </div>
    </article>
  );
}
