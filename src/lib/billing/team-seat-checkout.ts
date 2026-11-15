"use server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStripeClient } from "./stripe";
import { PROJECT_CATALOG } from "./project-catalog";
import { validSeatQuantity, seatPriceMatches } from "./team-seats";
import {ensureTeamSeatCatalog} from "./team-seat-catalog.server";
import { allowsLocalProductionSupabase, getAppEnvironment } from "@/lib/environment";
import { syncProjectSubscription } from "./project-sync";
import type { TeamWorkspace } from "@/lib/talent-buyers/project-team";

async function context(projectId:string) {
 if(allowsLocalProductionSupabase()) throw new Error("Purchases are disabled in this local production-data preview.");
 const db=await createServerSupabaseClient(), admin=createAdminSupabaseClient(), stripe=getStripeClient();
 const user=db?(await db.auth.getUser()).data.user:null;
 if(!db || !admin || !stripe || !user) throw new Error("Sign in to manage project seats.");
 const {data,error}=await db.rpc("get_project_team_workspace",{p_project_id:projectId});
 const w=data as TeamWorkspace|null;
 if(error || w?.role!=="owner" || !w.capacity) throw new Error("Only the project owner can buy seats.");
 const {data:link,error:linkError}=await admin.from("stripe_customer_links").select("customer_id").eq("user_id",user.id).maybeSingle();
 if(linkError) throw new Error("Could not load billing profile.");
 const catalog=await ensureTeamSeatCatalog(stripe);
 const priceId=w.capacity.pass?catalog.pass:catalog.monthly;
 const price=await stripe.prices.retrieve(priceId);
 if(!price.active || price.livemode!==(getAppEnvironment()==="production") || !seatPriceMatches(price,w.capacity.pass)) throw new Error("Seat pricing is unavailable.");
 return {db,admin,stripe,user,w,priceId,customer:link?.customer_id as string|undefined};
}
async function monthly(c:Awaited<ReturnType<typeof context>>) {
 if(!c.customer) throw new Error("A website Studio or Production House subscription is required for monthly seat purchases.");
 const subs=await c.stripe.subscriptions.list({customer:c.customer,status:"active",limit:100});
 const sub=subs.data.find(s=>s.items.data.some(i=>[process.env[PROJECT_CATALOG.studio.priceEnv],process.env[PROJECT_CATALOG.production_house.priceEnv]].includes(i.price.id)));
 if(!sub || sub.cancel_at_period_end || sub.pending_update) throw new Error("Manage your subscription or finish its pending payment in billing settings before adding seats.");
 const seat=sub.items.data.find(i=>i.price.id===c.priceId);
 return {sub,seat};
}
export async function previewTeamSeats(projectId:string,quantity:number):Promise<{error?:string;amount?:number;quantity?:number;current?:number;prorationDate?:number;pass?:boolean}> {
 try {
  if(!validSeatQuantity(quantity)) throw new Error("Choose between 1 and 100 additional seats.");
  const c=await context(projectId);
  if(c.w.capacity!.pass) return {amount:3900*quantity,quantity,pass:true};
  const {sub,seat}=await monthly(c); const current=seat?.quantity??0;
  if(quantity<=current) throw new Error(`You already have ${current} extra seats. Choose a higher total to add seats.`);
  const prorationDate=Math.floor(Date.now()/1000);
  const invoice=await c.stripe.invoices.createPreview({customer:c.customer,subscription:sub.id,subscription_details:{proration_date:prorationDate,proration_behavior:"always_invoice",items:[{...(seat?{id:seat.id}:{}),price:c.priceId,quantity}]}});
  return {amount:invoice.amount_due,quantity,current,prorationDate,pass:false};
 }catch(e){return {error:e instanceof Error?e.message:"Could not preview seats."};}
}
export async function purchaseTeamSeats(projectId:string,quantity:number,current:number,prorationDate:number):Promise<{error?:string;url?:string;message?:string}> {
 try {
  if(!validSeatQuantity(quantity)) throw new Error("Choose between 1 and 100 additional seats.");
  const c=await context(projectId); const origin=(process.env.NEXT_PUBLIC_SITE_URL??"").replace(/\/$/,"");
  if(c.w.capacity!.pass) {
   const {data:pass,error}=await c.admin.from("project_purchases").select("expires_at").eq("user_id",c.user.id).eq("project_id",projectId).eq("plan","project_pass").eq("status","active").gt("expires_at",new Date().toISOString()).maybeSingle();
   if(error || !pass?.expires_at) throw new Error("This project needs an active Project Pass.");
   let customer=c.customer;
   if(!customer) {
    customer=(await c.stripe.customers.create({email:c.user.email,metadata:{user_id:c.user.id}},{idempotencyKey:`motiion-customer-${c.user.id}`})).id;
    const {error}=await c.admin.from("stripe_customer_links").upsert({user_id:c.user.id,customer_id:customer},{onConflict:"user_id",ignoreDuplicates:true});
    if(error) throw new Error("Could not save billing profile.");
   }
   const history=await c.stripe.checkout.sessions.list({customer,limit:100});
   const prior=history.data.filter(s=>s.metadata?.seat_project_id===projectId);
   for(const open of prior.filter(s=>s.status==="open")) {
    if(open.metadata?.seat_quantity===String(quantity) && open.url) return {url:open.url};
    await c.stripe.checkout.sessions.expire(open.id);
   }
   const metadata={seat_project_id:projectId,seat_quantity:String(quantity),seat_expires_at:pass.expires_at,user_id:c.user.id};
   const session=await c.stripe.checkout.sessions.create({mode:"payment",customer,client_reference_id:c.user.id,line_items:[{price:c.priceId,quantity}],metadata,payment_intent_data:{metadata},integration_identifier:"motiion_seats_kxqjvptz",success_url:`${origin}/team-projects/${projectId}?seats=pending`,cancel_url:`${origin}/team-projects/${projectId}`},{idempotencyKey:`pass-seats-${projectId}-${quantity}-${prior[0]?.id??"first"}`});
   return {url:session.url??undefined};
  }
  const {sub,seat}=await monthly(c);
  if((seat?.quantity??0)!==current || quantity<=current || !Number.isInteger(prorationDate) || Math.abs(Date.now()/1000-prorationDate)>600) throw new Error("Your quote changed or expired. Review the price again.");
  const updated=await c.stripe.subscriptions.update(sub.id,{items:[{...(seat?{id:seat.id}:{}),price:c.priceId,quantity}],proration_date:prorationDate,proration_behavior:"always_invoice",payment_behavior:"pending_if_incomplete",expand:["latest_invoice"]},{idempotencyKey:`team-seats-${sub.id}-${current}-${quantity}-${prorationDate}`});
  await syncProjectSubscription(updated);
  if(updated.pending_update) {
   const invoice=typeof updated.latest_invoice==="object"?updated.latest_invoice:null;
   return {url:invoice?.hosted_invoice_url??undefined,message:"Finish the pending invoice in billing settings to activate your seats."};
  }
  return {message:"Seats added. You can now send your invitation."};
 }catch(e){return {error:e instanceof Error?e.message:"Could not purchase seats."};}
}
