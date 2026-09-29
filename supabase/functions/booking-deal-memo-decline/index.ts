import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/http.ts";
import { stripe } from "../_shared/stripe.ts";
import { BOOKING_NOTE_MAX, cleanNote, DECLINE_REASONS } from "../_shared/booking-deal-memo-template.ts";
import {
  assertVersion,
  BookingError,
  handleBookingRequest,
  intField,
  loadMemoForParty,
  memoPayload,
  notifyParty,
  otherRole,
  requireUser,
  stringField,
  uuidField,
  writeMemo,
} from "../_shared/booking-deal-memo-store.ts";

/**
 * Talent Decline (with reason) or Industry Cancel. Not available once paid or while a payment is
 * processing. Any open PaymentIntent / Checkout Session is canceled first.
 *
 * Body: { memoId, expectedVersion, reason?: budget|not_available|policy|other, note? }
 */
serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return handleBookingRequest(req, "booking-deal-memo-decline", async (body) => {
    const user = await requireUser(req, body);
    const { memo, viewer } = await loadMemoForParty(uuidField(body, "memoId"), user.id);
    assertVersion(memo, intField(body, "expectedVersion"));

    const open = viewer === "industry"
      ? ["draft", "offered", "negotiating", "payment_pending"]
      : ["offered", "negotiating", "payment_pending"];
    if (!open.includes(memo.status)) throw new BookingError("NOT_YOUR_TURN", "This deal memo is already closed.");
    if (memo.payment_state === "processing" || memo.payment_state === "succeeded") {
      throw new BookingError("ALREADY_PAID", "A payment is already in progress for this booking.");
    }

    const reason = stringField(body, "reason");
    const validReason = DECLINE_REASONS.some((r) => r.value === reason) ? reason : null;
    if (typeof body.note === "string" && body.note.trim().length > BOOKING_NOTE_MAX) {
      throw new BookingError("INVALID_REPLY", `Notes are limited to ${BOOKING_NOTE_MAX} characters.`);
    }
    const note = cleanNote(body.note);
    if (viewer === "talent" && !validReason) throw new BookingError("INVALID_REPLY", "Choose a reason for declining.");
    if (validReason === "other" && !note) throw new BookingError("INVALID_REPLY", "Add a short note when the reason is Other.");

    if (memo.stripe_payment_intent_id) {
      const pi = await stripe.paymentIntents.retrieve(memo.stripe_payment_intent_id);
      if (pi.status === "succeeded" || pi.status === "processing") {
        throw new BookingError("ALREADY_PAID", "A payment is already in progress for this booking.");
      }
      if (pi.status !== "canceled") await stripe.paymentIntents.cancel(pi.id);
    }
    if (memo.stripe_checkout_session_id) {
      const session = await stripe.checkout.sessions.retrieve(memo.stripe_checkout_session_id);
      if (session.status === "complete") throw new BookingError("ALREADY_PAID", "This booking is already paid.");
      if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
    }

    const nowIso = new Date().toISOString();
    const action = viewer === "talent" ? "declined" : "cancelled";
    await writeMemo({
      memoId: memo.id,
      expectedVersion: memo.version,
      patch: viewer === "talent"
        ? { status: "declined", awaiting_party: null, declined_by: "talent", decline_reason: validReason, decline_note: note, declined_at: nowIso, payment_state: "none" }
        : { status: "cancelled", awaiting_party: null, decline_reason: validReason, decline_note: note, cancelled_at: nowIso, payment_state: "none" },
      event: { action, actor_role: viewer, actor_user_id: user.id, payload: { reason: validReason, note } },
    });
    if (memo.status !== "draft") {
      await notifyParty({ memo, to: otherRole(viewer), action, actorId: user.id });
    }
    return await memoPayload(memo.id, viewer);
  });
});
