"use server";

import { requireIndustryApproval } from "@/lib/talent-buyers/require-industry-approval";
import { hasIndustryProAccess } from "@/lib/billing/gate";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { createBillingPortalSession, createIndustryCheckoutSession, getStripeClient } from "@/lib/billing/stripe";
import { findAccountStripeCustomerIds } from "@/lib/billing/account-deletion";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function startIndustryCheckout(): Promise<{ url: string | null; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { url: null, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { url: null, error: "You must be signed in." };

  const approval = await requireIndustryApproval(user.id);
  if (!approval.ok) return { url: null, error: approval.error };
  if (await hasIndustryProAccess(user.id)) return { url: null, error: "Industry Pro is already active. Manage your plan in Settings." };

  const priceId = process.env.STRIPE_INDUSTRY_PRICE_ID;
  if (!priceId) return { url: null, error: "Billing is not configured yet." };

  await trackServerEvent("paywall_cta_tapped", { plan: "industry_pro" });

  return createIndustryCheckoutSession({
    userId: user.id,
    email: user.email,
    priceId,
  });
}

export async function openBillingPortal(): Promise<{ url: string | null; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { url: null, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url: null, error: "You must be signed in." };

  const admin = createAdminSupabaseClient();
  if (!admin) return { url: null, error: "Billing is not configured yet." };

  const [subscription, linked] = await Promise.all([
    admin.from("subscriptions").select("customer_id").eq("user_id", user.id).eq("provider", "stripe").maybeSingle<{ customer_id: string | null }>(),
    admin.from("stripe_customer_links").select("customer_id").eq("user_id", user.id).maybeSingle<{ customer_id: string }>(),
  ]);
  if (subscription.error || linked.error) return { url: null, error: "Could not load billing. Please retry." };
  let customerId = subscription.data?.customer_id ?? linked.data?.customer_id;
  if (!customerId) {
    try {
      const stripe = getStripeClient();
      if (!stripe) return { url: null, error: "Billing is temporarily unavailable." };
      customerId = (await findAccountStripeCustomerIds(user.id, stripe))[0];
    } catch { return { url: null, error: "Could not verify billing ownership. Please retry or contact support." }; }
  }
  if (!customerId) return { url: null, error: "No Stripe billing profile found. Manage App Store subscriptions through Apple." };
  return createBillingPortalSession(customerId);
}
