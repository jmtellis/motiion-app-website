import assert from "node:assert/strict";
import test from "node:test";
import { groupOpportunityProjects } from "../src/lib/app/opportunity-groups";
import {
  bookingSegment,
  memoSegment,
} from "../src/lib/booking/booking-inbox-rules";
import { explicitWorkedWith } from "../src/lib/talent-navigator/credit-intent";
import { filterSearchProfiles } from "../src/lib/search/talent-filter-logic";

test("multi-role projects retain all role actions under one card", () => {
  const cards = [
    { projectId: "tour", roleId: "lead" },
    { projectId: "film", roleId: "actor" },
    { projectId: "tour", roleId: "ensemble" },
  ];
  assert.deepEqual(groupOpportunityProjects(cards), [
    [cards[0], cards[2]],
    [cards[1]],
  ]);
});
test("unlinked roles stay separate rather than merging under an empty project", () => {
  assert.equal(
    groupOpportunityProjects([
      { projectId: "", roleId: "a" },
      { projectId: "", roleId: "b" },
    ]).length,
    2,
  );
});
test("acceptance awaiting payment is confirmed; exited bookings move to past", () => {
  assert.equal(bookingSegment("payment_pending"), "confirmed");
  assert.equal(bookingSegment("booked"), "confirmed");
  for (const status of [
    "expired",
    "cancelled",
    "released",
    "unavailable",
    "completed",
    "declined",
  ])
    assert.equal(bookingSegment(status), "past");
  for (const status of [
    "availability",
    "on_hold",
    "offer",
    "contract",
    "negotiating",
    "offered",
  ])
    assert.equal(bookingSegment(status), "in-progress");
});
test("artist credit intent can be narrowed by location and talent type", () => {
  assert.equal(explicitWorkedWith("worked with Beyonce"), "Beyonce");
  const matchingCredits = [
    { id: "la", location: "Los Angeles", talent_types: ["dancer"] },
    { id: "ny", location: "New York", talent_types: ["dancer"] },
    { id: "choreo", location: "Los Angeles", talent_types: ["choreographer"] },
  ];
  assert.deepEqual(
    filterSearchProfiles(matchingCredits, {
      location: "Los Angeles",
      subtype: "dancer",
    }).map((row) => row.id),
    ["la"],
  );
});

test("credit searches respect multi-select styles, skills, and physical filters", async () => {
  const { filterCreditProfiles } =
    await import("../src/lib/search/credit-profile-filters");
  const matches = [
    {
      id: "a",
      talent_types: ["dancer"],
      styles: ["Contemporary"],
      skills: ["Partnering"],
      hair_color: "Brown",
      eye_color: "Green",
    },
    {
      id: "b",
      talent_types: ["dancer"],
      styles: ["Ballet"],
      skills: ["Tumbling"],
      hair_color: "Blonde",
      eye_color: "Blue",
    },
  ];
  assert.deepEqual(
    filterCreditProfiles(matches, {
      styles: ["Hip Hop", "Contemporary"],
      skills: ["Partnering"],
      hairColors: ["Brown"],
      eyeColors: ["Green"],
    }).map((row) => row.id),
    ["a"],
  );
  assert.deepEqual(
    filterCreditProfiles(matches, { location: "Los Angeles" }),
    [],
  );
});

test("paid and accepted memos stay Confirmed; overdue payment moves to Past", () => {
  assert.equal(
    memoSegment({ status: "accepted", expires_at: null }),
    "confirmed",
  );
  assert.equal(memoSegment({ status: "paid", expires_at: null }), "confirmed");
  assert.equal(
    memoSegment(
      { status: "payment_pending", expires_at: "2026-10-01T00:00:00Z" },
      Date.parse("2026-10-12T00:00:00Z"),
    ),
    "past",
  );
});

import { formatCastingScheduleDay } from "../src/lib/casting/date-labels";
test("casting calendar dates are readable without shifting the selected day", () => {
  assert.equal(formatCastingScheduleDay("2026-10-12"), "Mon, Oct 12, 2026");
  assert.equal(formatCastingScheduleDay("2026-10-12T00:00:00Z"), "Mon, Oct 12, 2026");
  assert.equal(formatCastingScheduleDay("Dates to confirm"), "Dates to confirm");
});
