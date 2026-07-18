import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  getIndustryIdentityVerificationBySessionId,
  updateIndustryIdentityVerificationBySessionId,
  upsertIndustryIdentityVerification,
} from "@/lib/billing/identity";
import {
  getStripeClient,
  mapStripeIdentityStatus,
  mapStripeSubscriptionStatus,
  subscriptionPeriodEndIso,
} from "@/lib/billing/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof createAdminSupabaseClient>>;

async function trackSubscriptionEvent(
  supabase: AdminClient,
  eventName: "subscription_started" | "subscription_renewed" | "subscription_canceled",
  userId: string | null,
  properties: Record<string, unknown>,
) {
  await supabase.from("analytics_events").insert({
    user_id: userId,
    session_id: null,
    platform: "web",
    event_name: eventName,
    properties,
    path: "/api/webhooks/stripe",
  });
}

async function handleIdentitySessionEvent(session: Stripe.Identity.VerificationSession) {
  const status = mapStripeIdentityStatus(session.status);
  const lastErrorCode = session.last_error?.code ?? null;
  const existing = await getIndustryIdentityVerificationBySessionId(session.id);

  if (existing) {
    await updateIndustryIdentityVerificationBySessionId({
      stripeSessionId: session.id,
      status,
      lastErrorCode,
    });
    return;
  }

  const userId = session.metadata?.user_id;
  if (!userId) return;

  await upsertIndustryIdentityVerification({
    userId,
    stripeSessionId: session.id,
    status,
    lastErrorCode,
  });
}

async function upsertSubscriptionFromStripe(
  supabase: AdminClient,
  stripe: Stripe,
  input: {
    userId: string;
    subscriptionId: string;
    customerId: string | null;
  },
) {
  const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
  const status = mapStripeSubscriptionStatus(subscription.status);
  const periodEnd = subscriptionPeriodEndIso(subscription);

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: input.userId,
      provider: "stripe",
      billing_source: "stripe",
      external_id: subscription.id,
      customer_id: input.customerId,
      status,
      tier: status === "canceled" ? "free" : "pro",
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );

  if (error) {
    throw new Error(`Subscription upsert failed for ${input.userId}: ${error.message}`);
  }

  return { status, subscription };
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin not configured" }, { status: 503 });
  }

  const { data: seen } = await supabase.from("stripe_webhook_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ ok: true, duplicate: true });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id ?? session.metadata?.user_id;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (userId && subscriptionId) {
      const customerId = typeof session.customer === "string" ? session.customer : null;
      await upsertSubscriptionFromStripe(supabase, stripe, {
        userId,
        subscriptionId,
        customerId,
      });
      await trackSubscriptionEvent(supabase, "subscription_started", userId, {
        provider: "stripe",
        subscription_id: subscriptionId,
      });
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
    if (invoice.billing_reason === "subscription_cycle" && invoice.subscription) {
      const { data: subRow } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("external_id", invoice.subscription)
        .maybeSingle<{ user_id: string }>();
      await trackSubscriptionEvent(supabase, "subscription_renewed", subRow?.user_id ?? null, {
        provider: "stripe",
        subscription_id: invoice.subscription,
      });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const status = mapStripeSubscriptionStatus(sub.status);
    const periodEnd = subscriptionPeriodEndIso(sub);
    const customerId = typeof sub.customer === "string" ? sub.customer : null;

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("external_id", sub.id)
      .maybeSingle<{ user_id: string }>();

    const userId = existing?.user_id ?? sub.metadata?.user_id ?? null;

    if (userId) {
      await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          provider: "stripe",
          billing_source: "stripe",
          external_id: sub.id,
          customer_id: customerId,
          status,
          tier: status === "canceled" ? "free" : "pro",
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" },
      );
    } else {
      await supabase
        .from("subscriptions")
        .update({
          status,
          tier: status === "canceled" ? "free" : "pro",
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("external_id", sub.id);
    }

    if (status === "canceled") {
      await trackSubscriptionEvent(supabase, "subscription_canceled", userId, {
        provider: "stripe",
        subscription_id: sub.id,
      });
    }
  }

  if (
    event.type === "identity.verification_session.verified" ||
    event.type === "identity.verification_session.requires_input"
  ) {
    await handleIdentitySessionEvent(event.data.object as Stripe.Identity.VerificationSession);
  }

  await supabase.from("stripe_webhook_events").insert({ id: event.id });
  return NextResponse.json({ ok: true });
}
