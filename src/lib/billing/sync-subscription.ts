import type Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { industrySubscriptionAccess, mapStripeSubscriptionStatus } from "./subscription-state";
import { industryLegacyPriceIds } from "./industry-offer";

/** Call only with an authenticated Stripe API response after signature/session ownership checks. */
export async function syncIndustrySubscription(subscription: Stripe.Subscription, eventId: string, eventAt: number | undefined, expectedUserId?: string) {
  const priceId = process.env.STRIPE_INDUSTRY_PRICE_ID;
  if (!priceId?.trim()) throw new Error("Industry subscription price is not configured");
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Subscription storage unavailable");
  const { data: existing, error } = await admin.from("subscriptions").select("user_id, provider_verified, plan_entitlement").eq("provider", "stripe").eq("external_id", subscription.id).maybeSingle<{user_id:string;provider_verified:boolean;plan_entitlement:string|null}>();
  if (error) throw new Error("Could not verify subscription owner");
  const access = industrySubscriptionAccess(subscription, priceId, existing?.provider_verified === true && existing.plan_entitlement === "industry_pro", industryLegacyPriceIds(process.env.STRIPE_INDUSTRY_LEGACY_PRICE_IDS));
  if (!access.sync) return { applied: false, reason: "other_product" };
  const userId = existing?.user_id ?? subscription.metadata.user_id;
  if (!userId || (expectedUserId && expectedUserId !== userId)) throw new Error("Subscription owner mismatch");
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const { data, error: writeError } = await admin.rpc("sync_verified_stripe_subscription", {
    p_user_id: userId, p_subscription_id: subscription.id, p_customer_id: customerId,
    p_status: mapStripeSubscriptionStatus(subscription.status), p_period_end: access.periodEnd,
    p_event_id: eventId, p_event_at: new Date(eventAt === undefined ? Date.now() : eventAt * 1000).toISOString(),
  });
  if (writeError) throw new Error("Could not save subscription status");
  return { applied: data === true, userId, status: subscription.status };
}
