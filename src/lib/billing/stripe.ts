import Stripe from "stripe";

import type { IndustryIdentityStatus } from "@/types/talent-buyers";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
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

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: input.email,
      client_reference_id: input.userId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: `${appUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payments/cancelled`,
      metadata: { user_id: input.userId },
    });
    return { url: session.url };
  } catch (err) {
    return { url: null, error: err instanceof Error ? err.message : "Checkout failed" };
  }
}

export async function createBillingPortalSession(customerId: string): Promise<{ url: string | null; error?: string }> {
  const stripe = getStripeClient();
  if (!stripe) return { url: null, error: "Stripe is not configured" };

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
