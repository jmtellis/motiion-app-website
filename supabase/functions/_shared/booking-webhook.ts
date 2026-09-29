import Stripe from "npm:stripe";
import { supabaseAdmin } from "./supabase-admin.ts";
import { writeMemo } from "./booking-deal-memo-store.ts";
import {
  applyBookingCheckoutSession,
  applyBookingDispute,
  applyBookingPaymentIntent,
  applyBookingRefund,
  isBookingPurpose,
} from "./booking-payments.ts";
import { syncPayoutAccountById } from "./stripe-accounts-v2.ts";

/** Accounts v2 thin event (event destination payload); fetch state from the API, never trust the body. */
type ThinEvent = { id: string; object: "v2.core.event"; type: string; related_object?: { id?: string; type?: string } | null };

export function isThinEvent(event: unknown): event is ThinEvent {
  return Boolean(event && typeof event === "object" && (event as { object?: unknown }).object === "v2.core.event");
}

export async function handleThinEvent(event: ThinEvent): Promise<void> {
  const related = event.related_object;
  if (!event.type.startsWith("v2.core.account") || related?.type !== "v2.core.account" || !related.id) return;
  await syncPayoutAccountById(related.id);
}

/**
 * MOT-94 booking deal memo events. Returns true when the event belonged to a booking so the caller
 * skips class/identity handling. Idempotency: `booking_deal_memo_events.stripe_event_id`
 * (not `stripe_webhook_events`, which the website webhook owns).
 */
export async function handleBookingStripeEvent(event: Stripe.Event): Promise<boolean> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!isBookingPurpose(session.metadata)) return false;
      await applyBookingCheckoutSession(session, event.id);
      return true;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!isBookingPurpose(session.metadata)) return false;
      const { data: memo, error } = await supabaseAdmin
        .from("booking_deal_memos")
        .select("id,status,payment_state")
        .eq("stripe_checkout_session_id", session.id)
        .maybeSingle<{ id: string; status: string; payment_state: string }>();
      if (error) throw error;
      if (memo && memo.status === "payment_pending" && memo.payment_state === "requires_payment") {
        await writeMemo({
          memoId: memo.id,
          patch: { payment_state: "none", stripe_checkout_session_id: null },
          event: { action: "payment_failed", actor_role: "stripe", stripe_event_id: event.id, payload: { reason: "checkout_expired" } },
        });
      }
      return true;
    }
    case "payment_intent.succeeded":
    case "payment_intent.processing":
    case "payment_intent.payment_failed":
    case "payment_intent.canceled": {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (!isBookingPurpose(pi.metadata)) return false;
      await applyBookingPaymentIntent(pi, event.id);
      return true;
    }
    case "charge.refunded":
      return await applyBookingRefund(event.data.object as Stripe.Charge, event.id);
    case "charge.dispute.created":
      return await applyBookingDispute(event.data.object as Stripe.Dispute, event.id, true);
    case "charge.dispute.closed":
      return await applyBookingDispute(event.data.object as Stripe.Dispute, event.id, false);
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      return Boolean(await syncPayoutAccountById(account.id));
    }
    default:
      return false;
  }
}
