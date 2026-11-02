import Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { assertTestStripeKey, getAppEnvironment } from "@/lib/environment";
import { INDUSTRY_OFFER, industryCheckoutPriceError } from "./industry-offer";

import type { IndustryIdentityStatus } from "@/types/talent-buyers";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  assertTestStripeKey(key, getAppEnvironment());
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
  }
  return stripeClient;
}

export function mapStripeIdentityStatus(
  status: Stripe.Identity.VerificationSession.Status,
): IndustryIdentityStatus {
  switch (status) {
    case "verified":
      return "verified";
    case "processing":
      return "processing";
    case "canceled":
      return "canceled";
    case "requires_input":
    default:
      return "requires_input";
  }
}

export async function createIdentityVerificationSession(input: {
  userId: string;
  email?: string | null;
}): Promise<
  | { ok: true; sessionId: string; clientSecret: string; status: IndustryIdentityStatus }
  | { ok: false; error: string }
> {
  const stripe = getStripeClient();
  if (!stripe) return { ok: false, error: "Stripe is not configured." };

  try {
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      metadata: {
        user_id: input.userId,
        supabase_user_id: input.userId,
      },
      provided_details: input.email
        ? {
            email: input.email,
          }
        : undefined,
    });

    if (!session.client_secret) {
      return { ok: false, error: "Stripe did not return a verification client secret." };
    }

    return {
      ok: true,
      sessionId: session.id,
      clientSecret: session.client_secret,
      status: mapStripeIdentityStatus(session.status),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not start identity verification.",
    };
  }
}

export async function retrieveIdentityVerificationSession(
  sessionId: string,
): Promise<
  | {
      ok: true;
      sessionId: string;
      status: IndustryIdentityStatus;
      lastErrorCode: string | null;
      clientSecret: string | null;
    }
  | { ok: false; error: string }
> {
  const stripe = getStripeClient();
  if (!stripe) return { ok: false, error: "Stripe is not configured." };

  try {
    const session = await stripe.identity.verificationSessions.retrieve(sessionId);
    return {
      ok: true,
      sessionId: session.id,
      status: mapStripeIdentityStatus(session.status),
      lastErrorCode: session.last_error?.code ?? null,
      clientSecret: session.client_secret ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not refresh identity verification.",
    };
  }
}

export async function createIndustryCheckoutSession(input: {
  userId: string;
  email: string;
  priceId: string;
}): Promise<{ url: string | null; error?: string }> {
  const stripe = getStripeClient();
  if (!stripe) return { url: null, error: "Stripe is not configured" };

  const appUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");

  try {
    const price = await stripe.prices.retrieve(input.priceId, { expand: ["product"] });
    const offerError = industryCheckoutPriceError(price, getAppEnvironment() === "production");
    if (offerError) return { url: null, error: offerError };
    const admin = createAdminSupabaseClient();
    if (!admin) return { url: null, error: "Billing is temporarily unavailable." };
    const [saved, existing] = await Promise.all([
      admin.from("stripe_customer_links").select("customer_id").eq("user_id", input.userId).maybeSingle<{customer_id:string}>(),
      admin.from("subscriptions").select("customer_id").eq("user_id", input.userId).eq("provider", "stripe").maybeSingle<{customer_id:string|null}>(),
    ]);
    if (saved.error || existing.error) throw new Error("Could not check existing billing profile. Please retry.");
    let customerId = saved.data?.customer_id ?? existing.data?.customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: input.email, metadata: { user_id: input.userId } }, { idempotencyKey: `motiion-customer-${input.userId}` });
      const { error } = await admin.from("stripe_customer_links").upsert({ user_id: input.userId, customer_id: customer.id }, { onConflict: "user_id", ignoreDuplicates: true });
      if (error) throw new Error("Could not save billing profile. Please retry.");
      const { data: linked, error: linkError } = await admin.from("stripe_customer_links").select("customer_id").eq("user_id",input.userId).single<{customer_id:string}>();
      if (linkError || !linked) throw new Error("Could not load billing profile. Please retry.");
      customerId = linked.customer_id;
    }
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    if (subscriptions.data.some(sub => ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(sub.status))) {
      return { url: null, error: "You already have a subscription or pending payment. Open Manage billing in Settings to continue." };
    }
    const pending = await stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 100 });
    const reusable = pending.data.find(session => session.mode === "subscription" && session.metadata?.price_id === input.priceId && session.metadata?.offer_version === INDUSTRY_OFFER.version);
    if (reusable?.url) return { url: reusable.url };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      integration_identifier: "motiion_web_yctmhzva",
      customer: customerId,
      client_reference_id: input.userId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      // Match the current monthly iOS base offer; no unverified introductory trial.
      subscription_data: {
        metadata: { user_id: input.userId, plan_entitlement: "industry_pro" },
      },
      allow_promotion_codes: true,
      success_url: `${appUrl}/payments/industry-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payments/cancelled`,
      metadata: { user_id: input.userId, plan_entitlement: "industry_pro", price_id: input.priceId, offer_version: INDUSTRY_OFFER.version },
    }, { idempotencyKey: `motiion-checkout-${input.userId}-${input.priceId}-${INDUSTRY_OFFER.version}-${Math.floor(Date.now() / 1_800_000)}` });
    return { url: session.url };
  } catch (err) {
    return { url: null, error: err instanceof Error ? err.message : "Checkout failed" };
  }
}

export { mapStripeSubscriptionStatus, subscriptionPeriodEndIso } from "./subscription-state";

export async function createBillingPortalSession(customerId: string): Promise<{ url: string | null; error?: string }> {
  const stripe = getStripeClient();
  if (!stripe) return { url: null, error: "Stripe is not configured" };

  const appUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard/settings`,
    });
    return { url: session.url };
  } catch (err) {
    return { url: null, error: err instanceof Error ? err.message : "Portal failed" };
  }
}
