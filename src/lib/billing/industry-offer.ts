/** Current US iOS offer: StoreKit catalog + public App Store verified 2026-11-02.
 * Introductory eligibility is provider-specific; no universal web trial is offered. */
export const INDUSTRY_OFFER = {
  amountCents: 5999,
  currency: "usd",
  interval: "month",
  version: "ios-parity-20261102",
  price: "$59.99",
  priceWithPeriod: "$59.99 USD/month",
  description: "$59.99 USD/month. Billed monthly. Cancel anytime.",
  cta: "Upgrade to Industry Pro",
} as const;

type CheckoutPrice = {
  active: boolean;
  livemode: boolean;
  currency: string;
  unit_amount: number | null;
  type: string;
  recurring: { interval: string; interval_count: number } | null;
  product: string | { active?: boolean; deleted?: boolean | void };
};

export function industryCheckoutPriceError(price: CheckoutPrice, production: boolean): string | null {
  if (price.livemode !== production) return "The billing environment is not configured correctly.";
  if (!price.active || typeof price.product === "string" || price.product.deleted || !price.product.active) {
    return "The Industry Pro offer is unavailable. Please try again later.";
  }
  if (price.type !== "recurring" || price.currency !== INDUSTRY_OFFER.currency || price.unit_amount !== INDUSTRY_OFFER.amountCents
    || price.recurring?.interval !== INDUSTRY_OFFER.interval || price.recurring.interval_count !== 1) {
    return "The configured Industry Pro price does not match the advertised offer. Checkout has not been started.";
  }
  return null;
}

/** Explicit server-owned old catalog entries are entitlement-only, never new-sale prices. */
export function industryLegacyPriceIds(value: string | undefined): string[] {
  return [...new Set((value ?? "").split(",").map((id) => id.trim()).filter((id) => /^price_[A-Za-z0-9]+$/.test(id)))];
}
