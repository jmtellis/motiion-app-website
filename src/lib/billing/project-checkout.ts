"use server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStripeClient } from "./stripe";
import { PROJECT_CATALOG, isProjectPlan, receiptIsActive, type ProjectAccess } from "./project-catalog";
import { requireIndustryApproval } from "@/lib/talent-buyers/require-industry-approval";
import { getAppEnvironment, allowsLocalProductionSupabase } from "@/lib/environment";

export async function startProjectCheckout(plan: string): Promise<{url?: string; error?: string}> {
  if (!isProjectPlan(plan)) return {error: "Choose a valid plan."};
  const db = await createServerSupabaseClient();
  const user = db ? (await db.auth.getUser()).data.user : null;
  if (!user) return {url: `/login?next=${encodeURIComponent(`/checkout?plan=${plan}`)}`};
  const approval = await requireIndustryApproval(user.id);
  if (!approval.ok) return {error: approval.error};
  // Never mix Stripe test receipts with the local production-data escape hatch.
  if (allowsLocalProductionSupabase()) return {error: "Checkout is disabled while this local preview uses production data. Use the staging deployment to test purchases."};
  const stripe = getStripeClient(); const admin = createAdminSupabaseClient();
  if (!stripe || !admin || !db) return {error: "Billing is temporarily unavailable."};
  try {
    const {data: access, error: accessError} = await db.rpc("account_project_access");
    if (accessError) throw new Error("Could not verify project access. Please retry.");
    const state = access as ProjectAccess;
    if (plan !== "project_pass" && (state.legacy || state.purchases.some(p => p.plan !== "project_pass" && receiptIsActive(p)))) {
      return {error: "You already have a monthly plan. Manage it in billing settings to avoid a second subscription."};
    }
    const offer = PROJECT_CATALOG[plan]; const priceId = process.env[offer.priceEnv];
    if (!priceId) throw new Error("This plan is not available for checkout yet.");
    const price = await stripe.prices.retrieve(priceId, {expand:["product"]});
    if (!price.active || price.livemode !== (getAppEnvironment() === "production") || price.currency !== "usd" || price.unit_amount !== offer.amount || typeof price.product === "string" || price.product.deleted || !price.product.active ||
      (offer.mode === "subscription" ? price.type !== "recurring" || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1 : price.type !== "one_time")) throw new Error("The configured price does not match this plan. No payment has been started.");
    const {data: link,error: linkError} = await admin.from("stripe_customer_links").select("customer_id").eq("user_id",user.id).maybeSingle();
    if (linkError) throw new Error("Could not load billing profile.");
    let customer = link?.customer_id as string | undefined;
    if (!customer) {
      customer = (await stripe.customers.create({email:user.email,metadata:{user_id:user.id}}, {idempotencyKey:`motiion-customer-${user.id}`})).id;
      const {error} = await admin.from("stripe_customer_links").upsert({user_id:user.id,customer_id:customer},{onConflict:"user_id",ignoreDuplicates:true});
      if (error) throw new Error("Could not save billing profile.");
    }
    if (offer.mode === "subscription") {
      const existing = await stripe.subscriptions.list({customer,status:"all",limit:100});
      if (existing.data.some(s => ["active","trialing","past_due","unpaid","incomplete"].includes(s.status))) throw new Error("A subscription or payment already exists. Manage billing in Settings.");
    }
    const history = await stripe.checkout.sessions.list({customer,limit:100});
    const open = history.data.filter(s => s.status === "open");
    const same = open.find(s => s.metadata?.project_plan === plan && s.metadata?.price_id === priceId);
    if (same?.url) return {url:same.url};
    // Expire competing subscription checkouts so a different plan cannot also complete.
    if (offer.mode === "subscription") for (const pending of open.filter(s => s.mode === "subscription")) await stripe.checkout.sessions.expire(pending.id);
    const previous = history.data.find(s => s.metadata?.project_plan === plan)?.id ?? "initial";
    const metadata = {user_id:user.id,project_plan:plan,price_id:priceId};
    const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");
    const session = await stripe.checkout.sessions.create({
      mode:offer.mode, customer, client_reference_id:user.id, line_items:[{price:priceId,quantity:1}],
      integration_identifier:"motiion_projects_kxqpzvnt", metadata,
      ...(offer.mode === "subscription" ? {subscription_data:{metadata}} : {payment_intent_data:{metadata}}),
      success_url:`${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/checkout?plan=${plan}`,
    },{idempotencyKey:`projects-${user.id}-${plan}-${priceId}-${previous}`});
    return session.url ? {url:session.url} : {error:"Checkout could not be opened."};
  } catch (error) { return {error:error instanceof Error ? error.message : "Checkout failed. Please retry."}; }
}
