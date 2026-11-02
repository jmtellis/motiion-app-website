import type Stripe from "stripe";

/** Subscription items own their periods in the current Stripe API. */
export function subscriptionPeriodEndIso(subscription: Stripe.Subscription): string | null {
  const legacy = subscription as Stripe.Subscription & { current_period_end?: number };
  const periods = subscription.items?.data.map(item => item.current_period_end).filter((value): value is number => Number.isFinite(value)) ?? [];
  const unix = periods.length ? Math.min(...periods) : legacy.current_period_end ?? (subscription.status === "trialing" ? subscription.trial_end : null);
  return unix && Number.isFinite(unix) ? new Date(unix * 1000).toISOString() : null;
}

export function isIndustrySubscription(subscription: Stripe.Subscription, priceId: string | undefined, legacyPriceIds: string[] = []): boolean {
  const eligible = new Set([priceId, ...legacyPriceIds].filter(Boolean));
  return Boolean(priceId && subscription.items?.data.some(item => eligible.has(item.price.id)));
}

/** Preserve failure states for recovery; paused has no entitlement in our schema. */
export function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  return status === "paused" ? "unpaid" : status;
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
  const value = invoice.parent?.subscription_details?.subscription ?? legacy.subscription;
  return typeof value === "string" ? value : value?.id ?? null;
}

/** Reconcile previously verified plans even after their eligible price is removed. */
export function industrySubscriptionAccess(
  subscription: Stripe.Subscription,
  priceId: string | undefined,
  previouslyVerifiedIndustry: boolean,
  legacyPriceIds: string[] = [],
): { sync: false } | { sync: true; periodEnd: string | null } {
  if (!priceId?.trim()) throw new Error("Industry subscription price is not configured");
  if (isIndustrySubscription(subscription, priceId, legacyPriceIds)) {
    return { sync: true, periodEnd: subscriptionPeriodEndIso(subscription) };
  }
  // Keep the real Stripe status, but expire access to the removed eligible plan.
  return previouslyVerifiedIndustry ? { sync: true, periodEnd: null } : { sync: false };
}
