import { getUserEntitlement, requireProEntitlement } from "@/lib/billing/entitlement";
import type { ProFeatureKey } from "@/lib/billing/pro-features";

/**
 * Hard server paywall is opt-in via ENFORCE_INDUSTRY_PAYWALL so the LA beta
 * can run with billing configured but not yet blocking mutations.
 * Soft UI locks always follow the user's real entitlement.
 */
export function isPaywallEnforced(): boolean {
  return (
    process.env.ENFORCE_INDUSTRY_PAYWALL === "true" &&
    Boolean(process.env.STRIPE_SECRET_KEY) &&
    Boolean(process.env.STRIPE_INDUSTRY_PRICE_ID)
  );
}

/**
 * Whether the user currently has Industry Pro (trialing or active).
 * Used for soft UI locks (blurred profiles, Pro chips, upgrade dialogs).
 */
export async function hasIndustryProAccess(userId: string): Promise<boolean> {
  const entitlement = await getUserEntitlement(userId);
  return entitlement.active && entitlement.tier === "pro";
}

/** @deprecated Prefer feature-level locks via requireIndustryProFeature. */
export async function isIndustryLocked(userId: string): Promise<boolean> {
  return !(await hasIndustryProAccess(userId));
}

/**
 * Hard reject for mutations. When paywall enforcement is off (beta),
 * returns ok so APIs stay open while the UI still shows freemium gates.
 */
export async function requireIndustryProFeature(
  userId: string,
  feature: ProFeatureKey,
): Promise<{ ok: true } | { ok: false; reason: "paywall"; feature: ProFeatureKey }> {
  if (!isPaywallEnforced()) return { ok: true };
  const check = await requireProEntitlement(userId);
  if (check.ok) return { ok: true };
  return { ok: false, reason: "paywall", feature };
}
