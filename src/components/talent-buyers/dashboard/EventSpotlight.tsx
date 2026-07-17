import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";

import { formatBuyerDateTime, labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import { resolveBuyerCoverImage } from "@/lib/talent-buyers/stock-images";
import type { BuyerEventSummary } from "@/types/talent-buyer-dashboard";

import { BuyerCoverImage } from "./BuyerCoverImage";

function eventDateParts(dateTime: string) {
  const date = new Date(dateTime);
  return {
    month: date.toLocaleDateString(undefined, { month: "long" }),
    day: date.getDate(),
  };
}

export function EventSpotlight({ event }: { event: BuyerEventSummary }) {
  const { month, day } = eventDateParts(event.dateTime);
  const coverSrc = resolveBuyerCoverImage(event.id, event.coverImageUrl, "event");

  return (
    <Link
      href="/calendar"
      className="group relative block min-h-[280px] overflow-hidden rounded-xl text-white"
    >
      <BuyerCoverImage
        src={coverSrc}
        alt=""
        fill
        overlay
        fallbackId={event.id}
        fallbackCategory="event"
      />

      <div className="relative z-10 flex min-h-[280px] flex-col justify-between gap-6 px-1 py-6">
        <div className="flex items-start justify-between gap-3">
          <span className="bd-chip gap-2 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm">
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
          <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-sm">
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
