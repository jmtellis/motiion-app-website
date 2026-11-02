"use client";

import Link from "next/link";
import { useState } from "react";
import { DealMemoList } from "./DealMemoDesk";
import {
  bookingPlacement,
  inboxBookingLabel,
  memoSegment,
  type BookingSegment,
  type InboxBooking,
} from "@/lib/booking/booking-inbox-rules";
import { unconfirmedWorkHasPassed } from "@/lib/booking/booking-lifecycle";
import type { DealMemoListItem } from "@/lib/booking/deal-memo-types";
import type { TalentSubmissionCard } from "@/lib/app/talent-castings";
import { WorkspaceSidePanel } from "@/components/workspace/WorkspaceSidePanel";
import { CastingDetailPanel } from "@/components/app/CastingDetailPanel";

export function TalentBookingsView({
  bookings,
  memos,
  submissions,
  error,
}: {
  bookings: InboxBooking[];
  memos: DealMemoListItem[];
  submissions: TalentSubmissionCard[];
  error: boolean;
}) {
  const [segment, setSegment] = useState<BookingSegment>("in-progress");
  const [roleId, setRoleId] = useState<string | null>(null);
  const [selected, setSelected] = useState<InboxBooking | null>(null);
  const memoFor = (row: InboxBooking) =>
    memos.find(
      (memo) =>
        memo.id === row.deal_memo_id ||
        Boolean(
          memo.availabilityId &&
          memo.availabilityId === row.availability_check_request_id,
        ),
    );
  const visible = bookings.filter(
    (row) => bookingPlacement(row) === segment,
  );
  const linked = new Set(
    bookings.flatMap((row) => {
      const memo = memoFor(row);
      return memo ? [memo.id] : [];
    }),
  );
  const offers = memos.filter(
    (memo) => !linked.has(memo.id) && memoSegment(memo) === segment,
  );
  const castings = submissions.filter((row) =>
    segment === "past" ? row.closed : segment === "in-progress" && !row.closed,
  );
  const groups = new Map<
    string,
    { title: string; bookings: InboxBooking[]; memos: DealMemoListItem[] }
  >();
  for (const row of visible) {
    const key = row.project_id || row.id;
    const group = groups.get(key) ?? {
      title: row.projectTitle || row.work_title || "Booking",
      bookings: [],
      memos: [],
    };
    group.bookings.push(row);
    groups.set(key, group);
  }
  for (const memo of offers) {
    const key = memo.projectId || memo.id;
    const group = groups.get(key) ?? {
      title: memo.projectTitle || memo.title,
      bookings: [],
      memos: [],
    };
    group.memos.push(memo);
    groups.set(key, group);
  }
  return (
    <section>
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
        <p role="alert">
          Some booking information could not be loaded. Refresh to try again.
        </p>
      ) : null}
      {[...groups].map(([id, group]) => (
        <section
          className="deal-memo__panel"
          key={id}
          style={{ marginTop: 16 }}
        >
          <h2>{group.title}</h2>
          <ul className="deal-memo__list">
            {group.bookings.map((row) => (
              <li key={row.id}>
                <div className="deal-memo__list-link">
                  <span>
                    <strong>{row.work_title || "Booking"}</strong>
                    <small>
                      {inboxBookingLabel(row, memoFor(row))} ·{" "}
                      {row.date_ranges?.map((range) => range.date).join(", ") ||
                        "Dates to confirm"}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="deal-memo__btn"
                    data-size="small"
                    onClick={() => setSelected(row)}
                  >
                    View booking
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <DealMemoList
            memos={group.memos}
            viewer="talent"
            hrefFor={(id) => `/deal-memos/${id}`}
            emptyCopy=""
          />
        </section>
      ))}
      {castings.length ? (
        <section style={{ marginTop: 20 }}>
          <h2>Submitted castings</h2>
          <ul className="deal-memo__list">
            {castings.map((row) => (
              <li key={row.key}>
                <button
                  className="deal-memo__list-link"
                  type="button"
                  onClick={() => setRoleId(row.roleId)}
                >
                  <span>
                    <strong>{row.title}</strong>
                    <small>{row.subtitle}</small>
                  </span>
                  <span>{row.outcome.replaceAll("_", " ")}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {!visible.length && !offers.length && !castings.length && !error ? (
        <p className="deal-memo__sub">
          No{" "}
          {segment === "in-progress"
            ? "bookings in progress"
            : `${segment} bookings`}{" "}
          yet.
        </p>
      ) : null}
      <WorkspaceSidePanel
        id="talent-booking-detail"
        open={Boolean(selected)}
        title={selected?.work_title || "Booking"}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="deal-memo__stack" style={{ padding: 20 }}>
            <h2>{selected.work_title || "Booking"}</h2>
            <p>{inboxBookingLabel(selected, memoFor(selected))}</p>
            <h3>Schedule</h3>
            {selected.date_ranges?.length ? (
              <ul>
                {selected.date_ranges.map((range, index) => (
                  <li key={`${range.date}-${index}`}>
                    {new Date(`${range.date}T12:00:00`).toLocaleDateString(
                      undefined,
                      { weekday: "short", month: "short", day: "numeric" },
                    )}
                    {range.start_time
                      ? ` · ${range.start_time.slice(0, 5)}`
                      : ""}
                    {range.end_time ? `–${range.end_time.slice(0, 5)}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Dates to confirm</p>
            )}
            {memoFor(selected) ? (
              <Link
                className="deal-memo__btn"
                href={`/deal-memos/${memoFor(selected)!.id}`}
              >
                {unconfirmedWorkHasPassed({
                  status: selected.status,
                  confirmedAt: selected.confirmed_at,
                  bookingDates: selected.date_ranges,
                  schedule: selected.projectSchedule,
                  timeZone: selected.timezone,
                  now: new Date(),
                }) || inboxBookingLabel(selected, memoFor(selected)) === "Contract expired"
                  ? "View agreement"
                  : "Review agreement"}
              </Link>
            ) : unconfirmedWorkHasPassed({
                status: selected.status,
                confirmedAt: selected.confirmed_at,
                bookingDates: selected.date_ranges,
                schedule: selected.projectSchedule,
                timeZone: selected.timezone,
                now: new Date(),
              }) ? null : ["availability", "on_hold", "offer", "contract"].includes(
                selected.status,
              ) ? (
              <Link href="/inbox?filter=requests">Review booking requests</Link>
            ) : null}
          </div>
        ) : null}
      </WorkspaceSidePanel>
      <CastingDetailPanel
        roleId={roleId}
        open={Boolean(roleId)}
        preferRole
        onClose={() => setRoleId(null)}
      />
    </section>
  );
}
