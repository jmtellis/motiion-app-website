import { CalendarDays, MapPin } from "lucide-react";

import { formatBuyerDateTime, labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import { resolveBuyerCoverImage } from "@/lib/talent-buyers/stock-images";
import type { BuyerEventSummary } from "@/types/talent-buyer-dashboard";

import { BuyerCoverImage } from "./BuyerCoverImage";

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
  const coverSrc = resolveBuyerCoverImage(event.id, event.coverImageUrl, "event");

  return (
    <article
      className={
        isDark
          ? "bd-visual-card group overflow-hidden"
          : "ui-card-interactive group overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-white"
      }
    >
      <div className={isDark ? "bd-visual-card__media" : "relative"}>
        <BuyerCoverImage
          src={coverSrc}
          alt=""
          aspectRatio="16/9"
          fallbackId={event.id}
          fallbackCategory="event"
        />
        <span
          className={`bd-visual-card__status shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            isDark
              ? "border-white/10 bg-black/50 text-white/80 backdrop-blur-sm"
              : "border-[var(--line)] bg-white/90 text-[var(--ink-soft)] backdrop-blur-sm"
          }`}
        >
          {labelFromSnake(event.status)}
        </span>
        <div
          className={`absolute bottom-3 left-3 z-[1] flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold backdrop-blur-sm ${
            isDark
              ? "border-white/10 bg-black/50 text-white/90"
              : "border-[var(--line)] bg-white/90 text-[var(--ink)]"
          }`}
        >
          <CalendarDays className="size-3.5" aria-hidden />
          <span>{month}</span>
          <span className="text-base leading-none">{day}</span>
          <span className="font-normal opacity-70">{weekday}</span>
        </div>
      </div>

      <div className={isDark ? "bd-visual-card__body" : "p-4"}>
        <p
          className={`text-xs font-semibold tracking-[0.12em] uppercase ${
            isDark ? "text-white/42" : "text-[var(--ink-soft)]"
          }`}
        >
          {labelFromSnake(event.eventType)}
        </p>
        <h3
          className={`mt-1 text-base font-semibold ${
            isDark ? "text-white group-hover:text-[var(--accent)]" : "text-[var(--ink)]"
          }`}
        >
          {event.title}
        </h3>
        <p className={`mt-3 text-sm ${isDark ? "text-white/64" : "text-[var(--ink-soft)]"}`}>
          {formatBuyerDateTime(event.dateTime)}
        </p>
        <p
          className={`mt-1 inline-flex items-center gap-1.5 text-sm ${
            isDark ? "text-white/64" : "text-[var(--ink-soft)]"
          }`}
        >
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {event.location}
        </p>
      </div>
    </article>
  );
}
