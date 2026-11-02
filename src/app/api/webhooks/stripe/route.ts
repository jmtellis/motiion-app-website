import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getIndustryIdentityVerificationBySessionId, updateIndustryIdentityVerificationBySessionId, upsertIndustryIdentityVerification } from "@/lib/billing/identity";
import { identitySessionOwner } from "@/lib/billing/identity-model";
import { getStripeClient, mapStripeIdentityStatus } from "@/lib/billing/stripe";
import { invoiceSubscriptionId } from "@/lib/billing/subscription-state";
import { syncIndustrySubscription } from "@/lib/billing/sync-subscription";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return NextResponse.json({ error: "Invalid signature" }, { status: 400 }); }
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Subscription storage unavailable" }, { status: 503 });
  try {
    const { data: seen, error: readError } = await admin.from("stripe_webhook_events").select("id").eq("id", event.id).maybeSingle();
    if (readError) throw readError;
    if (seen) return NextResponse.json({ ok: true, duplicate: true });
    let subscriptionId: string | null = null;
    let expectedUserId: string | undefined;
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      // Class/event ticket purchases have their own fulfillment path.
      if (session.mode === "subscription") {
        subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
        expectedUserId = session.client_reference_id ?? session.metadata?.user_id;
      }
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted" || event.type === "customer.subscription.created") {
      subscriptionId = event.data.object.id;
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      subscriptionId = invoiceSubscriptionId(event.data.object);
    }
    if (subscriptionId) {
      // Retrieve current state: Stripe does not guarantee event delivery order.
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncIndustrySubscription(subscription, event.id, event.created, expectedUserId);
    }
    if (event.type.startsWith("identity.verification_session.")) {
      const snapshot = event.data.object as Stripe.Identity.VerificationSession;
      const session = await stripe.identity.verificationSessions.retrieve(snapshot.id);
      const existing = await getIndustryIdentityVerificationBySessionId(session.id);
      const fields = { stripeSessionId: session.id, status: mapStripeIdentityStatus(session.status), lastErrorCode: session.last_error?.code ?? null };
      const identityOwner = identitySessionOwner(session.metadata);
      if ((session.metadata?.user_id || session.metadata?.supabase_user_id) && !identityOwner) throw new Error("Identity ownership metadata is inconsistent");
      if (existing && identityOwner !== existing.user_id) throw new Error("Identity ownership does not match the stored session");
      const result = existing ? await updateIndustryIdentityVerificationBySessionId(fields)
        : identityOwner ? await upsertIndustryIdentityVerification({ ...fields, userId: identityOwner }) : null;
      if (result && !result.ok) throw new Error("Identity status could not be saved");
    }
    // Subscription sync records the event atomically with its write. Other event
    // families are marked only after successful work; failures are retried by Stripe.
    const { error: eventError } = await admin.from("stripe_webhook_events").upsert({ id: event.id }, { onConflict: "id", ignoreDuplicates: true });
    if (eventError) throw eventError;
    return NextResponse.json({ ok: true });
  } catch {
    console.error("Stripe event processing failed", { eventId: event.id, eventType: event.type });
    return NextResponse.json({ error: "Could not process event; retry required" }, { status: 500 });
  }
}
