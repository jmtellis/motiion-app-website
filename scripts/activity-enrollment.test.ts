import { test } from "node:test";
import assert from "node:assert/strict";
import { activityPaymentState, isActiveEnrollment, normalizeActivityCheckoutSelection, activityRegistrationError } from "../src/lib/app/activity-enrollment";

test("only verified settlement produces a payment confirmation", () => {
  for (const status of ["paid", "succeeded", " PAID "]) assert.equal(activityPaymentState(status), "confirmed");
  for (const status of [undefined, null, "complete", "unknown", ""]) assert.equal(activityPaymentState(status), "unverified");
  assert.equal(activityPaymentState("pending"), "pending");
});
test("failed, expired, cancelled and refunded checkout never claim success", () => {
  for (const status of ["failed", "expired", "cancelled", "canceled", "refunded"]) assert.equal(activityPaymentState(status), "failed");
});
test("only actual attending enrollment suppresses another reservation", () => {
  for (const status of ["guest", "paid", "comped"]) assert.equal(isActiveEnrollment(status), true);
  for (const status of ["pending", "cancelled", "refunded", undefined]) assert.equal(isActiveEnrollment(status), false);
});
test("restored ticket choices deduplicate valid days without retaining identity fields", () => {
  const day = "12345678-1234-1234-1234-123456789abc";
  assert.deepEqual(normalizeActivityCheckoutSelection({ ticketOptionId: "ticket", selectedEventDayIds: [day, day, "bad", 4], promoCode: " SAVE ", email: "private@example.invalid", dateOfBirth: "1990-01-01", accessToken: "private" }), { ticketOptionId: "ticket", selectedEventDayIds: [day], promoCode: "SAVE" });
  assert.deepEqual(normalizeActivityCheckoutSelection(null), { ticketOptionId: null, selectedEventDayIds: [], promoCode: "" });
});
test("stale price, capacity and waitlist refusals explain recovery without claiming enrollment", () => {
  assert.match(activityRegistrationError("activity_full"), /full.*Refresh/);
  assert.match(activityRegistrationError("reserved_for_waitlist"), /waitlist.*Inbox/);
  assert.match(activityRegistrationError("activity_not_open_for_free_registration"), /no longer available.*Refresh/);
});
