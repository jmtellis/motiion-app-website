import assert from "node:assert/strict";
import test from "node:test";
import { confirmationCanAct, confirmationDateInput, confirmationDateRanges, confirmationLabel, handoffIsCurrent, type ProjectConfirmation } from "../src/lib/talent-buyers/confirmation-model";
const record: ProjectConfirmation = { id: "record", projectId: "project", talentName: "Talent", role: "Lead", status: "availability", dates: [], timeZone: "America/Los_Angeles", availabilityRequestId: null, availabilityStatus: null, availabilityResponse: null, responseNote: null, confirmationStatus: null, hasLegacyAgreement: false };
test("date ranges keep every calendar date across a daylight-saving transition", () => {
  assert.deepEqual(confirmationDateRanges("2026-10-31", "2026-11-02"), [{ date: "2026-10-31" }, { date: "2026-11-01" }, { date: "2026-11-02" }]);
  assert.deepEqual(confirmationDateRanges("2026-03-08", "2026-03-08"), [{ date: "2026-03-08" }]);
});
test("date requests reject impossible dates, reverse ranges, excessive ranges and invalid zones", () => {
  const base = { startDate: "2026-11-20", endDate: "2026-11-21", timeZone: "America/Los_Angeles" };
  assert(confirmationDateInput.safeParse(base).success);
  for (const change of [{ startDate: "2026-02-30" }, { endDate: "2026-11-19" }, { endDate: "2028-11-20" }, { timeZone: "Moon/Base" }]) assert.equal(confirmationDateInput.safeParse({ ...base, ...change }).success, false);
});
test("confirmed is distinct from available, held and awaiting a response", () => {
  assert.equal(confirmationLabel(record), "Ready to coordinate");
  assert.equal(confirmationLabel({ ...record, availabilityRequestId: "request" }), "Availability requested");
  assert.equal(confirmationLabel({ ...record, availabilityResponse: "available_with_conflict" }), "Available with conflict");
  assert.equal(confirmationLabel({ ...record, confirmationStatus: "pending" }), "Confirmation requested");
  assert.equal(confirmationLabel({ ...record, status: "confirmed", confirmationStatus: "confirmed" }), "Confirmed");
});
test("historical financial agreements and closed work cannot enter current coordination mutations", () => {
  assert(confirmationCanAct(record));
  assert(confirmationCanAct({ ...record, status: "on_hold" }));
  assert.equal(confirmationCanAct({ ...record, hasLegacyAgreement: true }), false);
  for (const status of ["contract", "offer", "confirmed", "completed", "cancelled", "expired"]) assert.equal(confirmationCanAct({ ...record, status }), false);
});
test("a handoff matches exact selections irrespective of order, never a partial or empty list", () => {
  const role = { id: "role", title: "Lead", selectedIds: ["a", "b"], movedIds: ["b", "a"] };
  assert(handoffIsCurrent(role));
  assert.equal(handoffIsCurrent({ ...role, movedIds: ["a"] }), false);
  assert.equal(handoffIsCurrent({ ...role, selectedIds: [], movedIds: [] }), false);
});
