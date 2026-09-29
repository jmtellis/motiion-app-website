import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe";
import { corsHeaders } from "../_shared/http.ts";
import { env } from "../_shared/env.ts";
import { stripe } from "../_shared/stripe.ts";
import {
  BOOKING_DEAL_MEMO_PURPOSE,
  BOOKING_PLATFORM_FEE_BPS,
  cleanSignature,
  computeBookingFees,
  computeTalentDeal,
  destinationChargeParams,
  isMemoExpired,
} from "../_shared/booking-deal-memo-template.ts";
import {
  assertVersion,
  BookingError,
  handleBookingRequest,
  intField,
  loadMemoForParty,
  memoPayload,
  type MemoRow,
  type ProvisionRow,
  requireUser,
  stringField,
  uuidField,
  writeMemo,
} from "../_shared/booking-deal-memo-store.ts";
import {
  applyBookingCheckoutSession,
  applyBookingPaymentIntent,
  isReusableIntent,
  paymentMatchesMemo,
} from "../_shared/booking-payments.ts";
import {
  loadPayoutAccountByUser,
  recipientStatus,
  retrieveAccount,
  savePayoutStatus,
} from "../_shared/stripe-accounts-v2.ts";

/**
 * Industry Pay & book: one card charge through a destination charge.
 *   amount = talent_deal + platform_fee; application_fee_amount = platform_fee;
 *   transfer_data.destination = talent booking recipient (receives the full talent_deal).
 *
 * Body: { memoId, expectedVersion?, action?: "create" | "sync", mode?: "payment_intent" | "checkout",
 *         signatureName (first Pay only), returnPath? }
 * Returns the memo payload plus { checkout: { mode, clientSecret?, url?, paymentIntentId?, status } }.
 */

function safeReturnUrl(path: string | null, memoId: string, suffix: string) {
  const base = env.appUrl.replace(/\/$/, "");
  const fallback = `/bookings/deal-memos/${memoId}`;
  const clean = path && path.startsWith("/") && !path.startsWith("//") ? path : fallback;
  return `${base}${clean}${clean.includes("?") ? "&" : "?"}${suffix}`;
}

function assertFeesLocked(memo: MemoRow, provisions: ProvisionRow[]) {
  const expected = computeBookingFees(memo.talent_deal_cents, BOOKING_PLATFORM_FEE_BPS);
  const recomputedDeal = computeTalentDeal(provisions).talentDealCents;
  if (
    memo.platform_fee_bps !== BOOKING_PLATFORM_FEE_BPS ||
    memo.platform_fee_cents !== expected.platformFeeCents ||
    memo.charge_amount_cents !== expected.chargeAmountCents ||
    recomputedDeal !== memo.talent_deal_cents
  ) {
    console.error("booking fee snapshot mismatch", { memoId: memo.id, recomputedDeal, memo: memo.talent_deal_cents });
    throw new BookingError("FEE_MISMATCH", "The payment amount doesn't match the accepted deal. Contact support.");
  }
  return expected;
}

async function requireActiveRecipient(talentUserId: string): Promise<string> {
  const row = await loadPayoutAccountByUser(talentUserId);
  if (!row) {
    throw new BookingError("CONNECT_ONBOARDING_REQUIRED", "The talent needs to finish payout setup before you can pay.");
  }
  let status = row.stripe_transfers_status;
  try {
    const synced = await savePayoutStatus(talentUserId, row.stripe_account_id, recipientStatus(await retrieveAccount(row.stripe_account_id)));
    status = synced.stripe_transfers_status;
  } catch (err) {
    console.warn("booking recipient live sync failed; using stored status", { talentUserId, err });
  }
  if (status !== "active") {
    throw new BookingError("CONNECT_ONBOARDING_REQUIRED", "The talent needs to finish payout setup before you can pay.");
  }
  return row.stripe_account_id;
}

function checkoutInfo(mode: string, extra: Record<string, unknown>) {
  return { checkout: { mode, ...extra } };
}

serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return handleBookingRequest(req, "booking-checkout-create", async (body) => {
    const user = await requireUser(req, body);
    const memoId = uuidField(body, "memoId");
    const loaded = await loadMemoForParty(memoId, user.id);
    const { viewer } = loaded;
    let { memo } = loaded;

    if (body.action === "sync") {
      if (memo.stripe_payment_intent_id) {
        await applyBookingPaymentIntent(await stripe.paymentIntents.retrieve(memo.stripe_payment_intent_id), null);
      } else if (memo.stripe_checkout_session_id) {
        await applyBookingCheckoutSession(await stripe.checkout.sessions.retrieve(memo.stripe_checkout_session_id), null);
      }
      return await memoPayload(memo.id, viewer);
    }

    if (viewer !== "industry") throw new BookingError("FORBIDDEN", "Only Industry can pay for this booking.");
    assertVersion(memo, intField(body, "expectedVersion"));
    if (memo.status === "paid") throw new BookingError("ALREADY_PAID", "This booking is already paid.");
    if (memo.status === "expired" || isMemoExpired(memo)) {
      throw new BookingError("MEMO_EXPIRED", "This deal memo expired before payment. Send a new offer.");
    }
    if (memo.status !== "payment_pending") {
      throw new BookingError("MEMO_NOT_READY", "Payment opens after the talent accepts the deal.");
    }
    if (memo.payment_state === "processing") {
      return await memoPayload(memo.id, viewer, checkoutInfo("payment_intent", { status: "processing" }));
    }

    const fees = assertFeesLocked(memo, loaded.provisions);
    const destination = await requireActiveRecipient(memo.talent_user_id);
    const mode = body.mode === "checkout" ? "checkout" : "payment_intent";

    if (!memo.industry_signed_at) {
      const signature = cleanSignature(body.signatureName);
      if (!signature) throw new BookingError("SIGNATURE_REQUIRED", "Type your full name to sign before paying.");
      memo = await writeMemo({
        memoId: memo.id,
        expectedVersion: memo.version,
        patch: { industry_signed_name: signature, industry_signed_at: new Date().toISOString() },
        event: { action: "industry_signed", actor_role: "industry", actor_user_id: user.id },
      });
    }

    const metadata = {
      purpose: BOOKING_DEAL_MEMO_PURPOSE,
      memo_id: memo.id,
      industry_user_id: memo.industry_user_id,
      talent_user_id: memo.talent_user_id,
      talent_deal_cents: String(fees.talentDealCents),
      platform_fee_cents: String(fees.platformFeeCents),
    };
    const charge = destinationChargeParams(fees, destination);
    const description = "Motiion booking deal memo";

    let previousIntentId: string | null = null;
    if (memo.stripe_payment_intent_id) {
      const existing = await stripe.paymentIntents.retrieve(memo.stripe_payment_intent_id);
      if (existing.status === "succeeded" || existing.status === "processing") {
        await applyBookingPaymentIntent(existing, null);
        return await memoPayload(memo.id, viewer, checkoutInfo("payment_intent", { status: existing.status }));
      }
      const matches = !paymentMatchesMemo(existing, { ...memo, stripe_destination_account_id: destination });
      if (mode === "payment_intent" && isReusableIntent(existing) && matches) {
        return await memoPayload(memo.id, viewer, checkoutInfo("payment_intent", {
          status: existing.status,
          clientSecret: existing.client_secret,
          paymentIntentId: existing.id,
        }));
      }
      if (existing.status !== "canceled") await stripe.paymentIntents.cancel(existing.id);
      previousIntentId = existing.id;
    }
    if (memo.stripe_checkout_session_id) {
      const session = await stripe.checkout.sessions.retrieve(memo.stripe_checkout_session_id);
      if (session.status === "complete") {
        await applyBookingCheckoutSession(session, null);
        return await memoPayload(memo.id, viewer, checkoutInfo("checkout", { status: "complete" }));
      }
      if (mode === "checkout" && session.status === "open" && session.url && session.amount_total === fees.chargeAmountCents) {
        return await memoPayload(memo.id, viewer, checkoutInfo("checkout", { status: "open", url: session.url }));
      }
      if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
    }

    const idempotencySuffix = `${memo.id}:${previousIntentId ?? memo.stripe_checkout_session_id ?? "first"}`;
    const returnPath = stringField(body, "returnPath");

    if (mode === "payment_intent") {
      const pi = await stripe.paymentIntents.create(
        {
          ...charge,
          payment_method_types: ["card"],
          description,
          metadata,
          transfer_group: `booking_${memo.id}`,
          ...(user.email ? { receipt_email: user.email } : {}),
        },
        { idempotencyKey: `booking-pi:${idempotencySuffix}` },
      );
      await writeMemo({
        memoId: memo.id,
        patch: {
          stripe_payment_intent_id: pi.id,
          stripe_checkout_session_id: null,
          stripe_destination_account_id: destination,
          payment_state: "requires_payment",
        },
        event: { action: "checkout_started", actor_role: "industry", actor_user_id: user.id, payload: { mode, payment_intent_id: pi.id } },
      });
      return await memoPayload(memo.id, viewer, checkoutInfo(mode, {
        status: pi.status,
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
      }));
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const memoExpirySec = memo.expires_at ? Math.floor(new Date(memo.expires_at).getTime() / 1000) : nowSec + 86_400;
    const sessionExpiry = Math.max(nowSec + 31 * 60, Math.min(nowSec + 23 * 3600, memoExpirySec));
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      client_reference_id: memo.id,
      metadata,
      expires_at: sessionExpiry,
      ...(user.email ? { customer_email: user.email } : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: charge.currency,
            unit_amount: fees.talentDealCents,
            product_data: { name: "Talent deal", description: "Paid in full to the talent." },
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: charge.currency,
            unit_amount: fees.platformFeeCents,
            product_data: { name: "Motiion platform fee (10%)" },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: charge.application_fee_amount,
        transfer_data: charge.transfer_data,
        description,
        metadata,
        transfer_group: `booking_${memo.id}`,
      },
      success_url: safeReturnUrl(returnPath, memo.id, "checkout=success"),
      cancel_url: safeReturnUrl(returnPath, memo.id, "checkout=cancelled"),
    };
    const session = await stripe.checkout.sessions.create(params, { idempotencyKey: `booking-cs:${idempotencySuffix}` });
    await writeMemo({
      memoId: memo.id,
      patch: {
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: null,
        stripe_destination_account_id: destination,
        payment_state: "requires_payment",
      },
      event: { action: "checkout_started", actor_role: "industry", actor_user_id: user.id, payload: { mode, checkout_session_id: session.id } },
    });
    return await memoPayload(memo.id, viewer, checkoutInfo(mode, { status: session.status, url: session.url }));
  });
});
