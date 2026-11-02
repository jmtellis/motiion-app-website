"use client";

import { useState } from "react";
import { DealMemoList, IndustryDealMemoDesk } from "./DealMemoDesk";
import {
  memoSegment,
  type BookingSegment,
} from "@/lib/booking/booking-inbox-rules";
import type {
  ConfirmedAvailability,
  DealMemoListItem,
} from "@/lib/booking/deal-memo-types";

export function IndustryBookingsView({
  confirmed,
  memos,
  error,
}: {
  confirmed: ConfirmedAvailability[];
  memos: DealMemoListItem[];
  error: boolean;
}) {
  const [segment, setSegment] = useState<BookingSegment>("in-progress");
  const groups = new Map<string, DealMemoListItem[]>();
  for (const memo of memos.filter(
    (row) => memoSegment(row) === segment,
  )) {
    const key = memo.projectId || memo.id;
    groups.set(key, [...(groups.get(key) ?? []), memo]);
  }
  return (
    <div>
      <div
        className="home-browser__filters"
        role="group"
        aria-label="Booking status"
      >
        {(
          [
            ["in-progress", "In Progress"],
            ["confirmed", "Confirmed"],
            ["past", "Past"],
          ] as const
        ).map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={segment === id}
            onClick={() => setSegment(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert">Could not load bookings. Refresh to try again.</p>
      ) : null}
      {[...groups].map(([id, rows]) => (
        <section
          key={id}
          className="deal-memo__panel"
          style={{ marginTop: 16 }}
        >
          <h2>{rows[0].projectTitle || rows[0].title}</h2>
          <DealMemoList
            memos={rows}
            viewer="industry"
            hrefFor={(id) => `/bookings/deal-memos/${id}`}
            emptyCopy=""
          />
        </section>
      ))}
      {!groups.size && !error ? (
        <p className="deal-memo__sub">
          No{" "}
          {segment === "in-progress"
            ? "bookings in progress"
            : `${segment} bookings`}{" "}
          yet.
        </p>
      ) : null}
      {segment === "in-progress" && confirmed.some((row) => !row.openMemoId) ? (
        <IndustryDealMemoDesk
          confirmed={confirmed}
          memos={[]}
          error={error}
          readyOnly
        />
      ) : null}
    </div>
  );
}
