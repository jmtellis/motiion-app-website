import type Stripe from "stripe";
import { invoiceSubscriptionId } from "./subscription-state";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PROJECT_CATALOG, isProjectPlan, type ProjectPlan } from "./project-catalog";
import { getAppEnvironment, allowsLocalProductionSupabase } from "@/lib/environment";

function planForPrice(id: string): ProjectPlan | undefined {
  return (Object.keys(PROJECT_CATALOG) as ProjectPlan[]).find(p => process.env[PROJECT_CATALOG[p].priceEnv] === id);
}
async function ownerForCustomer(customer: string, expected?: string) {
  const db = createAdminSupabaseClient(); if (!db) throw new Error("Billing storage unavailable");
  const {data,error}=await db.from("stripe_customer_links").select("user_id").eq("customer_id",customer).single();
  if (error || !data || (expected && expected !== data.user_id)) throw new Error("Billing ownership could not be verified");
  return data.user_id as string;
}
async function save(user: string, external: string, plan: ProjectPlan, status: string, expires: string | null, eventAt: number) {
  if (allowsLocalProductionSupabase()) throw new Error("Test receipts cannot write to production data");
  const db=createAdminSupabaseClient(); if (!db) throw new Error("Billing storage unavailable");
  const {error}=await db.rpc("sync_project_purchase", {p_user_id:user,p_provider:"stripe",p_external_id:external,p_plan:plan,p_status:status,p_expires_at:expires,p_event_at:new Date(eventAt*1000).toISOString()});
  if (error) throw new Error("Could not save project purchase");
}
export async function syncProjectSubscription(sub: Stripe.Subscription, eventAt = Date.now()/1000) {
  const item=sub.items.data.find(i=>planForPrice(i.price.id));
  if (!item) {
    // An existing project subscription can leave this catalog through the portal.
    // Retire its capacity instead of leaving the last recognized tier active.
    if (allowsLocalProductionSupabase()) throw new Error("Test receipts cannot write to production data");
    const db=createAdminSupabaseClient(); if (!db) throw new Error("Billing storage unavailable");
    const {data,error}=await db.from("project_purchases").select("user_id,plan").eq("provider","stripe").eq("external_id",sub.id).maybeSingle();
    if (error) throw error;
    if (!data) return false;
    if (sub.livemode !== (getAppEnvironment()==="production") || !isProjectPlan(data.plan)) throw new Error("Invalid subscription catalog");
    const customer=typeof sub.customer==="string" ? sub.customer : sub.customer.id;
    await ownerForCustomer(customer,data.user_id);
    await save(data.user_id,sub.id,data.plan,"inactive",new Date(eventAt*1000).toISOString(),eventAt);
    return true;
  }
  const plan=planForPrice(item.price.id)!;
  if (plan === "project_pass" || sub.livemode !== (getAppEnvironment()==="production") || sub.items.data.length !== 1 || item.quantity !== 1) throw new Error("Invalid subscription catalog");
  const offer=PROJECT_CATALOG[plan];
  if (item.price.unit_amount !== offer.amount || item.price.currency!=="usd" || item.price.recurring?.interval!=="month" || item.price.recurring.interval_count!==1) throw new Error("Invalid subscription price");
  const customer=typeof sub.customer==="string" ? sub.customer : sub.customer.id;
  const user=await ownerForCustomer(customer,sub.metadata.user_id);
  await save(user,sub.id,plan,["active","trialing"].includes(sub.status)?"active":"inactive",new Date(item.current_period_end*1000).toISOString(),eventAt);
  return true;
}
export async function syncProjectCheckout(session: Stripe.Checkout.Session, stripe: Stripe, eventAt = Date.now()/1000) {
  if (!isProjectPlan(session.metadata?.project_plan)) return false;
  if (session.livemode !== (getAppEnvironment()==="production")) throw new Error("Billing environment mismatch");
  if (session.status !== "complete" || session.payment_status !== "paid") return false;
  const customer=typeof session.customer==="string" ? session.customer : session.customer?.id;
  if (!customer) throw new Error("Missing billing owner");
  const user=await ownerForCustomer(customer,session.client_reference_id ?? undefined);
  if (session.mode==="subscription") {
    const id=typeof session.subscription==="string" ? session.subscription : session.subscription?.id;
    if (!id) throw new Error("Missing subscription");
    return syncProjectSubscription(await stripe.subscriptions.retrieve(id),eventAt);
  }
  const lines=await stripe.checkout.sessions.listLineItems(session.id,{limit:2});
  const line=lines.data[0]; const plan=line?.price ? planForPrice(line.price.id) : undefined;
  if (plan!=="project_pass" || lines.data.length!==1 || line.quantity!==1 || line.price?.unit_amount!==19900 || line.price.currency!=="usd") throw new Error("Invalid project pass price");
  const payment=typeof session.payment_intent==="string" ? session.payment_intent : session.payment_intent?.id;
  if (!payment) throw new Error("Missing payment");
  const intent=await stripe.paymentIntents.retrieve(payment,{expand:["latest_charge"]});
  const charge=typeof intent.latest_charge==="object" ? intent.latest_charge : null;
  await save(user,payment,plan,charge && (charge.refunded || charge.disputed) ? "revoked":"active",null,eventAt);
  return true;
}
export async function revokeProjectCharge(charge: Stripe.Charge, stripe: Stripe, eventAt: number) {
  const payment=typeof charge.payment_intent==="string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!payment) return;
  const db=createAdminSupabaseClient(); if (!db || allowsLocalProductionSupabase()) throw new Error("Billing storage unavailable");
  const sessions=await stripe.checkout.sessions.list({payment_intent:payment,limit:100});
  for (const session of sessions.data) if (session.metadata?.project_plan === "project_pass") await syncProjectCheckout(session,stripe,eventAt);
  const ids=[payment];
  const invoices=await stripe.invoicePayments.list({payment:{type:"payment_intent",payment_intent:payment},limit:100});
  for (const entry of invoices.data) {
    const invoice=await stripe.invoices.retrieve(typeof entry.invoice === "string" ? entry.invoice : entry.invoice.id);
    const subId=invoiceSubscriptionId(invoice);
    if (subId && await syncProjectSubscription(await stripe.subscriptions.retrieve(subId),eventAt)) ids.push(subId);
  }
  const {error}=await db.from("project_purchases").update({status:"revoked",event_at:new Date(eventAt*1000).toISOString()}).eq("provider","stripe").in("external_id",ids);
  if (error) throw error;
}
