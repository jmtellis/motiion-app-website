import type Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/billing/stripe";
import { subscriptionPreventsAccountDeletion, type AccountDeletionResult } from "@/lib/billing/account-deletion-state";

/** Search supplements local links so a delayed webhook cannot hide a live plan. */
export async function findAccountStripeCustomerIds(userId: string, stripe: Stripe): Promise<string[]> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("Invalid account identifier.");
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Billing verification is unavailable.");
  const [links, subscriptions] = await Promise.all([
    admin.from("stripe_customer_links").select("customer_id").eq("user_id", userId),
    admin.from("subscriptions").select("customer_id").eq("user_id", userId).eq("provider", "stripe"),
  ]);
  if (links.error || subscriptions.error) throw new Error("Couldn’t check your billing profile.");
  const ids = new Set<string>();
  for (const row of [...(links.data ?? []), ...(subscriptions.data ?? [])]) if (row.customer_id) ids.add(row.customer_id);
  for await (const customer of stripe.customers.search({ query: `metadata['user_id']:'${userId}' OR metadata['supabase_user_id']:'${userId}'`, limit: 100 })) ids.add(customer.id);
  for (const id of ids) {
    const customer = await stripe.customers.retrieve(id);
    if (customer.deleted) { ids.delete(id); continue; }
    const owners = [customer.metadata.user_id, customer.metadata.supabase_user_id].filter(Boolean);
    if (owners.some(owner => owner !== userId)) throw new Error("Your billing ownership needs support review before deleting this account.");
  }
  return [...ids];
}

/** Read-only provider check. Deletion never cancels plans or changes payment settings. */
export async function checkAccountDeletionBilling(userId: string): Promise<AccountDeletionResult> {
  try {
    const stripe = getStripeClient();
    if (!stripe) return { ok: false, error: "We can’t verify subscription status right now. Please try again before deleting your account." };
    const customerIds = await findAccountStripeCustomerIds(userId, stripe);
    for (const customer of customerIds) {
      for await (const subscription of stripe.subscriptions.list({ customer, status: "all", limit: 100 })) {
        if (subscriptionPreventsAccountDeletion(subscription)) return { ok: false, billingRequired: true, error: "Cancel your renewing Stripe subscription in Manage billing before deleting your account. Resolve any pending payment there, then return and try again." };
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "We couldn’t verify your subscription status. Your account is unchanged. Please try again or contact support." };
  }
}
