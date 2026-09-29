import Stripe from "npm:stripe";
import { stripe } from "./stripe.ts";
import { supabaseAdmin } from "./supabase-admin.ts";
import { BOOKING_DEAL_MEMO_PURPOSE, BOOKING_CURRENCY } from "./booking-deal-memo-template.ts";
import { BookingError, loadMemo, type MemoRow, notifyParty, writeMemo } from "./booking-deal-memo-store.ts";

export function isBookingPurpose(metadata: Stripe.Metadata | null | undefined): boolean {
  return metadata?.purpose === BOOKING_DEAL_MEMO_PURPOSE && typeof metadata?.memo_id === "string";
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/** PSE FINAL lock: charge = deal + fee, application fee = fee, destination gets the full deal. */
export function paymentMatchesMemo(pi: Stripe.PaymentIntent, memo: MemoRow): string | null {
  if (pi.currency !== BOOKING_CURRENCY) return "currency";
  if (pi.amount !== memo.charge_amount_cents) return "amount";
  if ((pi.application_fee_amount ?? 0) !== memo.platform_fee_cents) return "application_fee_amount";
  const destination = idOf(pi.transfer_data?.destination as string | { id: string } | undefined);
  if (!destination) return "destination";
  if (memo.stripe_destination_account_id && destination !== memo.stripe_destination_account_id) return "destination";
  if (pi.metadata?.memo_id !== memo.id) return "memo_id";
  return null;
}

const PENDING_PI_STATUSES = new Set(["requires_payment_method", "requires_confirmation", "requires_action"]);

export function isReusableIntent(pi: Stripe.PaymentIntent) {
  return PENDING_PI_STATUSES.has(pi.status);
}

/** Cancels the unpaid memo that took this availability slot after an expired memo got paid late. */
async function releaseAvailabilitySlot(memo: MemoRow) {
  const { data, error } = await supabaseAdmin
    .from("booking_deal_memos")
    .select("id,version,stripe_payment_intent_id,payment_state")
    .eq("availability_check_request_id", memo.availability_check_request_id)
    .neq("id", memo.id)
    .not("status", "in", "(declined,cancelled,expired,paid)");
  if (error) throw error;
  for (const other of data ?? []) {
    if (other.payment_state === "processing" || other.payment_state === "succeeded") continue;
    if (other.stripe_payment_intent_id) {
      await stripe.paymentIntents.cancel(other.stripe_payment_intent_id).catch((err) =>
        console.warn("booking late-pay: cancel competing intent failed", { memoId: other.id, err })
      );
    }
    await writeMemo({
      memoId: other.id,
      patch: {
        status: "cancelled",
        awaiting_party: null,
        cancelled_at: new Date().toISOString(),
        payment_state: other.payment_state === "requires_payment" ? "none" : other.payment_state,
      },
      event: { action: "cancelled", actor_role: "system", payload: { reason: "superseded_by_late_payment", paid_memo_id: memo.id } },
    });
  }
}

/**
 * Before a new memo reuses an availability request, cancel any open PaymentIntent left on an
 * expired memo so a late confirmation can't pay for superseded terms.
 */
export async function cancelStaleIntentsForAvailability(availabilityId: string) {
  const { data, error } = await supabaseAdmin
    .from("booking_deal_memos")
    .select("id,stripe_payment_intent_id,payment_state")
    .eq("availability_check_request_id", availabilityId)
    .eq("status", "expired")
    .not("stripe_payment_intent_id", "is", null);
  if (error) throw error;
  for (const row of data ?? []) {
    if (row.payment_state === "processing") {
      throw new BookingError("MEMO_EXISTS", "A payment on the earlier deal memo is still processing.");
    }
    if (row.payment_state !== "requires_payment" && row.payment_state !== "failed") continue;
    const pi = await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id!);
    if (pi.status === "succeeded" || pi.status === "processing") {
      throw new BookingError("MEMO_EXISTS", "A payment on the earlier deal memo is completing.");
    }
    if (pi.status !== "canceled") await stripe.paymentIntents.cancel(pi.id);
  }
}

export type ApplyResult = { memoId: string | null; applied: boolean; reason?: string };

/**
 * Applies a PaymentIntent's state to its deal memo. Idempotent per Stripe event id (webhook) and
 * safe to call from client-triggered sync (no event id) because paid memos are left untouched.
 */
export async function applyBookingPaymentIntent(
  pi: Stripe.PaymentIntent,
  stripeEventId: string | null,
): Promise<ApplyResult> {
  const memoId = pi.metadata?.memo_id ?? null;
  if (!memoId) return { memoId: null, applied: false, reason: "no_memo" };
  const loaded = await loadMemo(memoId);
  if (!loaded) {
    console.error("booking payment for unknown memo", { memoId, paymentIntentId: pi.id });
    return { memoId, applied: false, reason: "unknown_memo" };
  }
  const { memo } = loaded;
  const chargeId = idOf(pi.latest_charge as string | { id: string } | null);

  if (pi.status === "succeeded") {
    if (memo.status === "paid") {
      if (memo.stripe_payment_intent_id !== pi.id) {
        console.error("booking memo paid twice", { memoId, paid: memo.stripe_payment_intent_id, extra: pi.id });
        await writeMemo({
          memoId,
          event: {
            action: "payment_succeeded",
            actor_role: "stripe",
            stripe_event_id: stripeEventId,
            payload: { applied: false, reason: "duplicate_payment", payment_intent_id: pi.id },
          },
        });
      }
      return { memoId, applied: false, reason: "already_paid" };
    }
    const mismatch = paymentMatchesMemo(pi, memo);
    const payable = memo.status === "payment_pending" || memo.status === "expired";
    if (mismatch || !payable || !memo.industry_signed_at) {
      const reason = mismatch ? `FEE_MISMATCH:${mismatch}` : `memo_${memo.status}`;
      console.error("booking payment not applied; needs ops review/refund", { memoId, paymentIntentId: pi.id, reason });
      await writeMemo({
        memoId,
        event: {
          action: "payment_succeeded",
          actor_role: "stripe",
          stripe_event_id: stripeEventId,
          payload: { applied: false, reason, payment_intent_id: pi.id, amount: pi.amount },
        },
      });
      return { memoId, applied: false, reason };
    }
    const patch = {
      status: "paid",
      awaiting_party: null,
      paid_at: new Date().toISOString(),
      payment_state: "succeeded",
      stripe_payment_intent_id: pi.id,
      stripe_charge_id: chargeId,
      stripe_destination_account_id: idOf(pi.transfer_data?.destination as string | { id: string } | undefined),
    };
    const event = {
      action: "payment_succeeded",
      actor_role: "stripe" as const,
      stripe_event_id: stripeEventId,
      payload: { applied: true, payment_intent_id: pi.id, amount: pi.amount, application_fee_amount: pi.application_fee_amount },
    };
    try {
      await writeMemo({ memoId, patch, event });
    } catch (err) {
      if (!(err instanceof BookingError) || err.code !== "MEMO_EXISTS") throw err;
      await releaseAvailabilitySlot(memo);
      await writeMemo({ memoId, patch, event });
    }
    await Promise.all([
      notifyParty({ userId: memo.industry_user_id, memoId, action: "payment_succeeded", actorId: null }),
      notifyParty({ userId: memo.talent_user_id, memoId, action: "payment_succeeded", actorId: null }),
    ]);
    return { memoId, applied: true };
  }

  if (memo.status === "paid") return { memoId, applied: false, reason: "already_paid" };
  if (memo.stripe_payment_intent_id && memo.stripe_payment_intent_id !== pi.id) {
    return { memoId, applied: false, reason: "stale_intent" };
  }
  if (!["payment_pending", "expired"].includes(memo.status)) return { memoId, applied: false, reason: `memo_${memo.status}` };

  let paymentState: string;
  let action: string;
  if (pi.status === "processing") {
    paymentState = "processing";
    action = "payment_processing";
  } else if (pi.status === "canceled") {
    paymentState = "none";
    action = "payment_failed";
  } else if (pi.last_payment_error) {
    paymentState = "failed";
    action = "payment_failed";
  } else {
    return { memoId, applied: false, reason: "no_change" };
  }
  if (memo.status === "expired") {
    // Terminal row; keep the audit trail only.
    await writeMemo({ memoId, event: { action, actor_role: "stripe", stripe_event_id: stripeEventId, payload: { payment_intent_id: pi.id, status: pi.status } } });
    return { memoId, applied: false, reason: "memo_expired" };
  }
  await writeMemo({
    memoId,
    patch: { payment_state: paymentState, stripe_payment_intent_id: pi.id },
    event: {
      action,
      actor_role: "stripe",
      stripe_event_id: stripeEventId,
      payload: {
        payment_intent_id: pi.id,
        status: pi.status,
        ...(pi.last_payment_error?.code ? { error_code: pi.last_payment_error.code } : {}),
      },
    },
  });
  return { memoId, applied: true };
}

export async function applyBookingCheckoutSession(
  session: Stripe.Checkout.Session,
  stripeEventId: string | null,
): Promise<ApplyResult> {
  const paymentIntentId = idOf(session.payment_intent as string | { id: string } | null);
  if (!paymentIntentId) return { memoId: session.metadata?.memo_id ?? null, applied: false, reason: "no_intent" };
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  return await applyBookingPaymentIntent(pi, stripeEventId);
}

async function memoByPaymentIntent(paymentIntentId: string): Promise<MemoRow | null> {
  const { data, error } = await supabaseAdmin
    .from("booking_deal_memos")
    .select("*")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle<MemoRow>();
  if (error) throw error;
  return data;
}

/** Returns false when the charge is not a booking (class refunds keep their existing path). */
export async function applyBookingRefund(charge: Stripe.Charge, stripeEventId: string): Promise<boolean> {
  const paymentIntentId = idOf(charge.payment_intent as string | { id: string } | null);
  if (!paymentIntentId) return false;
  const memo = await memoByPaymentIntent(paymentIntentId);
  if (!memo) return false;
  const refunded = Math.min(charge.amount_refunded ?? 0, memo.charge_amount_cents);
  const full = charge.refunded || refunded >= memo.charge_amount_cents;
  const patch: Record<string, unknown> = {
    amount_refunded_cents: refunded,
    payment_state: full ? "refunded" : "partially_refunded",
  };
  if (full && memo.status === "paid") {
    patch.status = "cancelled";
    patch.cancelled_at = new Date().toISOString();
  }
  await writeMemo({
    memoId: memo.id,
    patch,
    event: { action: "refunded", actor_role: "stripe", stripe_event_id: stripeEventId, payload: { charge_id: charge.id, amount_refunded: refunded, full } },
  });
  return true;
}

/** Dispute stub: flags the memo for ops; money movement is handled in the Stripe Dashboard. */
export async function applyBookingDispute(dispute: Stripe.Dispute, stripeEventId: string, opened: boolean): Promise<boolean> {
  const paymentIntentId = idOf(dispute.payment_intent as string | { id: string } | null);
  if (!paymentIntentId) return false;
  const memo = await memoByPaymentIntent(paymentIntentId);
  if (!memo) return false;
  const nextState = opened ? "disputed" : dispute.status === "won" ? "succeeded" : memo.payment_state;
  await writeMemo({
    memoId: memo.id,
    patch: memo.paid_at ? { payment_state: nextState } : null,
    event: {
      action: opened ? "dispute_opened" : "dispute_closed",
      actor_role: "stripe",
      stripe_event_id: stripeEventId,
      payload: { dispute_id: dispute.id, status: dispute.status, reason: dispute.reason, amount: dispute.amount },
    },
  });
  return true;
}
