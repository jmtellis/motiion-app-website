"use server";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { createBillingPortalSession, createIndustryCheckoutSession } from "@/lib/billing/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function startIndustryCheckout(): Promise<{ url: string | null; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { url: null, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { url: null, error: "You must be signed in." };

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

  const { data } = await admin
    .from("subscriptions")
    .select("customer_id")
    .eq("user_id", user.id)
    .eq("provider", "stripe")
    .not("customer_id", "is", null)
    .limit(1)
    .maybeSingle<{ customer_id: string }>();

  if (!data?.customer_id) {
    return { url: null, error: "No Stripe billing profile found for this account." };
  }

  return createBillingPortalSession(data.customer_id);
}
