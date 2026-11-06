import test from "node:test";
import assert from "node:assert/strict";
import { pendingRequestActions, pendingRequestKey, requestScheduleLines } from "../src/lib/messaging/request-actions";
import { friendlyRequestSchedule } from "../src/lib/messaging/reliability";

test("a reactivated invitation is not hidden by an earlier response", () => {
  const request = { id: "invite-1", request_kind: "session_invite", sort_key: "2026-11-01T10:00:00Z" };
  const hidden = new Set([pendingRequestKey(request)]);
  assert.equal(hidden.has(pendingRequestKey({ ...request, sort_key: "2026-11-02T10:00:00Z" })), false);
  assert.equal(hidden.has(pendingRequestKey({ ...request, request_kind: "event_invite" })), false);
});

test("casting and waiting request primary actions open context without accepting", () => {
  assert.deepEqual(pendingRequestActions("casting"), { primary: "View casting", negative: "Decline", review: false, view: true });
  assert.equal(pendingRequestActions("session_join_requester").view, true);
  assert.equal(pendingRequestActions("class_guest_requester").negative, "Cancel request");
});

test("coordination, availability and size sharing require review", () => {
  for (const kind of ["booking_confirmation", "availability_check", "size_sheet"]) {
    assert.equal(pendingRequestActions(kind).review, true);
  }
  assert.equal(pendingRequestActions("session_join_organizer").primary, "Approve");
});

test("impossible request dates remain unknown rather than silently moving days", () => {
  assert.equal(friendlyRequestSchedule("2026-02-31 · 10:00"), null);
  assert.equal(friendlyRequestSchedule("2026-11-02 · 25:00"), null);
  assert.equal(friendlyRequestSchedule("2026-11-02 · 00:00"), "Nov 2 at 12am");
});


test("request review shows every unique date in civil order with overnight timing", () => {
  assert.deepEqual(requestScheduleLines([{ date: "2026-11-03" }, { date: "2026-11-01", start_time: "23:00", end_time: "01:00" }, { date: "2026-11-03" }, { date: "2026-02-31" }]), ["Sun, Nov 1, 2026 · 23:00–01:00 (+1 day)", "Tue, Nov 3, 2026 · All day"]);
});

test("resolved coordination notifications land in the correct role workspace", async () => {
  const { coordinationNotificationHref } = await import("../src/lib/app/notification-inbox");
  const project_id = "11111111-1111-4111-8111-111111111111";
  assert.equal(coordinationNotificationHref({ type: "booking_status_changed", data: { project_id, recipient_role: "talent" } }), "/activities?view=projects");
  assert.equal(coordinationNotificationHref({ type: "request_resolved_availability", data: { project_id } }), `/projects/${project_id}/coordination`);
  assert.equal(coordinationNotificationHref({ type: "request_resolved_booking_confirm", data: { project_id: "../../other" } }), "/messages");
  assert.equal(coordinationNotificationHref({ type: "message" }), null);
});


test("legacy handoff and hold notifications use the current workspace and preserve their booking", async () => {
  const { coordinationNotificationHref } = await import("../src/lib/app/notification-inbox");
  const booking_id = "22222222-2222-4222-8222-222222222222";
  const project_id = "11111111-1111-4111-8111-111111111111";
  for (const type of ["booking_hold_placed", "booking_hold_released", "booking_handoff", "booking_status_changed"]) {
    assert.equal(coordinationNotificationHref({ type, data: { booking_id, project_id } }, "talent"), `/activities?view=projects&booking=${booking_id}`);
    assert.equal(coordinationNotificationHref({ type, data: { booking_id, project_id } }, "industry"), `/projects/${project_id}/coordination`);
  }
  assert.equal(coordinationNotificationHref({ type: "booking_status_changed", data: { recipient_role: "industry", project_id } }, "talent"), "/activities?view=projects");
  assert.equal(coordinationNotificationHref({ type: "booking_handoff", data: { booking_id: "../../elsewhere" } }, "talent"), "/activities?view=projects");
  assert.equal(coordinationNotificationHref({ type: "booking_handoff" }, "community"), "/inbox");
});

test("confirmation links select history for cancelled or unavailable coordination", async () => {
  const { confirmationScope } = await import("../src/lib/talent-buyers/confirmation-model");
  for (const status of ["cancelled", "released", "expired", "completed"]) assert.equal(confirmationScope({ status, availabilityResponse: null }), "past");
  assert.equal(confirmationScope({ status: "availability", availabilityResponse: "unavailable" }), "past");
  assert.equal(confirmationScope({ status: "availability", availabilityResponse: "available_with_conflict" }), "active");
  assert.equal(confirmationScope({ status: "on_hold", availabilityResponse: null }), "active");
});
