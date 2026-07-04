import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";

import { formatBuyerDateTime, labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import type { BuyerEventSummary } from "@/types/talent-buyer-dashboard";

function eventDateParts(dateTime: string) {
  const date = new Date(dateTime);
  return {
    month: date.toLocaleDateString(undefined, { month: "long" }),
    day: date.getDate(),
  };
}

function WireframeDecoration() {
  return (
    <svg
      className="bd-wireframe"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M20 140 L80 60 L140 100 L180 40" stroke="white" strokeWidth="1" />
      <path d="M40 180 L100 120 L160 160" stroke="white" strokeWidth="1" />
      <rect x="60" y="80" width="48" height="48" stroke="white" strokeWidth="1" transform="rotate(12 84 104)" />
      <rect x="110" y="50" width="36" height="36" stroke="white" strokeWidth="1" transform="rotate(-8 128 68)" />
      <circle cx="150" cy="130" r="24" stroke="white" strokeWidth="1" />
    </svg>
  );
}

export function EventSpotlight({ event }: { event: BuyerEventSummary }) {
  const { month, day } = eventDateParts(event.dateTime);

  return (
    <Link href="/events" className="bd-feature group relative block overflow-hidden py-6 text-white">
      <WireframeDecoration />
      <div className="relative flex min-h-[200px] flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-3">
          <span className="bd-chip gap-2 px-3 py-1.5 text-xs font-semibold text-white/80">
            <CalendarDays className="size-3.5" aria-hidden />
            Next up
          </span>
          <span className="bd-corner-arrow static shrink-0">
            <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </div>

        <div>
          <p className="font-mono text-xs font-medium tracking-[0.08em] text-[#2dd4bf] uppercase">
            {labelFromSnake(event.eventType)}
          </p>
          <h3 className="mt-2 max-w-xs text-2xl font-semibold tracking-tight text-white/92">
            {event.title}
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/50">
            {formatBuyerDateTime(event.dateTime)} · {event.location}
          </p>
          <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/4 px-4 py-3">
            <div>
              <p className="text-xs text-white/42">{month}</p>
              <p className="text-2xl font-semibold leading-none text-white/92">{day}</p>
            </div>
            <p className="inline-flex items-center gap-1.5 text-xs text-white/58">
              <MapPin className="size-3.5" aria-hidden />
              View details
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
