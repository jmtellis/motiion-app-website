import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe";
import { stripe } from "../_shared/stripe.ts";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";
import { env } from "../_shared/env.ts";
import { supabaseAdmin } from "../_shared/supabase-admin.ts";
import { markCheckoutPaidAndSync, syncRemainingSpots } from "../_shared/payment-sync.ts";
import { syncIdentityVerificationFromStripeSession } from "../_shared/identity-verification-profile.ts";
import { isIdentityVerificationFeePurpose } from "../_shared/identity-verification-fee-policy.ts";
import { applyIdentityVerificationFeePayment } from "../_shared/identity-verification-fee-store.ts";
import { handleBookingStripeEvent, handleThinEvent, isThinEvent } from "../_shared/booking-webhook.ts";

/**
 * One URL, up to three Stripe endpoints: platform events (STRIPE_WEBHOOK_SECRET), Connect events for
 * booking recipients (`account.updated`), and the Accounts v2 thin-event destination.
 */
const webhookSecrets = [
  env.stripeWebhookSecret,
  Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET")?.trim(),
  Deno.env.get("STRIPE_THIN_WEBHOOK_SECRET")?.trim(),
].filter((secret): secret is string => Boolean(secret));

async function constructVerifiedEvent(body: string, signature: string): Promise<Stripe.Event> {
  let lastError: unknown = null;
  for (const secret of webhookSecrets) {
    try {
      return await stripe.webhooks.constructEventAsync(body, signature, secret);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error("No Stripe webhook secret configured");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return jsonResponse({ error: "Missing Stripe signature header" }, 400);
  }

  try {
    const body = await req.text();
    const event = await constructVerifiedEvent(body, signature);

    const rawEvent: unknown = event;
    if (isThinEvent(rawEvent)) {
      try {
        await handleThinEvent(rawEvent);
      } catch (err) {
        console.error("stripe-webhook thin event failed", { id: rawEvent.id, type: rawEvent.type, err });
        return jsonResponse({ error: "Booking payout sync failed" }, 500);
      }
      return jsonResponse({ received: true });
    }

    try {
      if (await handleBookingStripeEvent(event)) return jsonResponse({ received: true });
    } catch (err) {
      console.error("stripe-webhook booking deal memo handling failed", { id: event.id, type: event.type, err });
      return jsonResponse({ error: "Booking deal memo handling failed" }, 500);
    }

    let identityFeeGrantFailed = false;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (isIdentityVerificationFeePurpose(session.metadata?.purpose)) {
          if (session.payment_status !== "paid") break;
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null;
          const userId = session.metadata?.supabase_user_id?.trim() ||
            session.client_reference_id?.trim() ||
            "";
          if (!paymentIntentId || !userId) {
            console.error("stripe-webhook identity fee checkout missing identifiers", session.id);
            identityFeeGrantFailed = true;
            break;
          }
          const granted = await applyIdentityVerificationFeePayment({
            userId,
            paymentIntentId,
            amountCents: session.amount_total ?? 0,
            currency: session.currency ?? "usd",
          });
          if (!granted.ok) identityFeeGrantFailed = true;
          break;
        }

        const sessionId = session.id;
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;
        let activityId = session.metadata?.activity_id ?? null;
        let studentId = session.metadata?.student_id ?? null;

        if (!activityId || !studentId) {
          const { data: storedSession, error: storedSessionError } = await supabaseAdmin
            .from("stripe_checkout_sessions")
            .select("activity_id,student_id")
            .eq("stripe_checkout_session_id", sessionId)
            .maybeSingle<{ activity_id: string; student_id: string }>();

          if (storedSessionError) {
            console.error("stripe-webhook checkout.session.completed fallback lookup failed", {
              sessionId,
              storedSessionError,
            });
          } else if (storedSession) {
            activityId = activityId ?? storedSession.activity_id;
            studentId = studentId ?? storedSession.student_id;
          }
        }

        if (!activityId || !studentId) {
          console.error("stripe-webhook checkout.session.completed missing identifiers", {
            sessionId,
            metadata: session.metadata,
          });
          break;
        }

        const pricingTierRaw = session.metadata?.pricing_tier_id;
        const pricingTierId =
          typeof pricingTierRaw === "string" && pricingTierRaw.trim().length > 0
            ? pricingTierRaw.trim()
            : null;

        const result = await markCheckoutPaidAndSync({
          activityId,
          studentId,
          sessionId,
          paymentIntentId,
          pricingTierId,
        });
        if (!result.success) break;
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { error } = await supabaseAdmin
          .from("stripe_checkout_sessions")
          .update({
            status: "expired",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_checkout_session_id", session.id);

        if (error) {
          console.error("stripe-webhook failed to mark expired session", error);
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id ?? null;
        if (!paymentIntentId) break;

        const { data: session, error: sessionError } = await supabaseAdmin
          .from("stripe_checkout_sessions")
          .select("activity_id,student_id")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<{ activity_id: string; student_id: string }>();

        if (sessionError) {
          console.error("stripe-webhook charge.refunded session lookup failed", sessionError);
          break;
        }

        if (!session) break;
        const nowIso = new Date().toISOString();

        const { error: sessionUpdateError } = await supabaseAdmin
          .from("stripe_checkout_sessions")
          .update({ status: "refunded", updated_at: nowIso })
          .eq("stripe_payment_intent_id", paymentIntentId);
        if (sessionUpdateError) {
          console.error("stripe-webhook charge.refunded session update failed", sessionUpdateError);
        }

        const { error: enrollmentUpdateError } = await supabaseAdmin
          .from("enrollments")
          .update({ status: "refunded", updated_at: nowIso })
          .eq("activity_id", session.activity_id)
          .eq("student_id", session.student_id);
        if (enrollmentUpdateError) {
          console.error("stripe-webhook charge.refunded enrollment update failed", enrollmentUpdateError);
        }

        await syncRemainingSpots(session.activity_id);
        break;
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        if (!isIdentityVerificationFeePurpose(paymentIntent.metadata?.purpose)) break;
        const userId = paymentIntent.metadata?.supabase_user_id?.trim() || "";
        if (!userId) {
          console.error("stripe-webhook identity fee payment missing user", paymentIntent.id);
          identityFeeGrantFailed = true;
          break;
        }
        const granted = await applyIdentityVerificationFeePayment({
          userId,
          paymentIntentId: paymentIntent.id,
          amountCents: paymentIntent.amount_received || paymentIntent.amount,
          currency: paymentIntent.currency,
        });
        if (!granted.ok) identityFeeGrantFailed = true;
        break;
      }
      case "payment_intent.canceled": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { data: session, error: sessionError } = await supabaseAdmin
          .from("stripe_checkout_sessions")
          .select("activity_id,student_id")
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<{ activity_id: string; student_id: string }>();

        if (sessionError) {
          console.error("stripe-webhook payment_intent.canceled session lookup failed", sessionError);
          break;
        }

        if (!session) break;
        const nowIso = new Date().toISOString();

        const { error: sessionUpdateError } = await supabaseAdmin
          .from("stripe_checkout_sessions")
          .update({ status: "canceled", updated_at: nowIso })
          .eq("stripe_payment_intent_id", paymentIntent.id);
        if (sessionUpdateError) {
          console.error("stripe-webhook payment_intent.canceled session update failed", sessionUpdateError);
        }

        const { error: enrollmentUpdateError } = await supabaseAdmin
          .from("enrollments")
          .update({ status: "cancelled", updated_at: nowIso })
          .eq("activity_id", session.activity_id)
          .eq("student_id", session.student_id)
          .eq("status", "paid");
        if (enrollmentUpdateError) {
          console.error("stripe-webhook payment_intent.canceled enrollment update failed", enrollmentUpdateError);
        }

        await syncRemainingSpots(session.activity_id);
        break;
      }
      case "identity.verification_session.created":
      case "identity.verification_session.processing":
      case "identity.verification_session.requires_input":
      case "identity.verification_session.verified":
      case "identity.verification_session.canceled": {
        const identitySession = event.data.object as Stripe.Identity.VerificationSession;
        await syncIdentityVerificationFromStripeSession(identitySession);
        break;
      }
      default:
        break;
    }

    if (identityFeeGrantFailed) {
      return jsonResponse({ error: "Identity verification fee grant failed" }, 500);
    }
    return jsonResponse({ received: true });
  } catch (error) {
    console.error("stripe-webhook signature verification/processing failed", error);
    return jsonResponse({ error: "Invalid webhook signature or event handling failure" }, 400);
  }
});
