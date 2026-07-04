import { getUserEntitlement } from "@/lib/billing/entitlement";

/**
 * Paywall enforcement is opt-in via ENFORCE_INDUSTRY_PAYWALL so the LA beta
 * can run with billing configured but not yet blocking (PRD: degrade gracefully).
 */
export function isPaywallEnforced(): boolean {
  return (
    process.env.ENFORCE_INDUSTRY_PAYWALL === "true" &&
    Boolean(process.env.STRIPE_SECRET_KEY) &&
    Boolean(process.env.STRIPE_INDUSTRY_PRICE_ID)
  );
}

/** True when the user must upgrade before using advanced industry features. */
export async function isIndustryLocked(userId: string): Promise<boolean> {
  if (!isPaywallEnforced()) return false;
  const entitlement = await getUserEntitlement(userId);
  return !(entitlement.active && entitlement.tier === "pro");
}
