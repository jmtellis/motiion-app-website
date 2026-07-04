import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
  }
  return stripeClient;
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
