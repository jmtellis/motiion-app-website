import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { entitlementFromAccessRows, isLiveAccessCodeGrant, isLiveSubscriptionRow, userIsPaidFromRows, type AccessCodeGrantRow, type SubscriptionAccessRow } from "../src/lib/billing/entitlement";
const NOW = new Date("2026-11-02T12:00:00.000Z");
const FUTURE = "2026-12-01T00:00:00.000Z";
const PAST = "2026-09-01T00:00:00.000Z";
const sub=(extra:Partial<SubscriptionAccessRow>={}):SubscriptionAccessRow=>({status:"active",provider:"stripe",billing_source:"stripe",provider_verified:true,plan_entitlement:"industry_pro",current_period_end:FUTURE,...extra});
const grant=(extra:Partial<AccessCodeGrantRow>={}):AccessCodeGrantRow=>({entitlement:"industry_pro",status:"active",expires_at:FUTURE,revoked_at:null,...extra});
describe("trusted plan-specific entitlement",()=>{
 it("verified Industry Stripe subscription unlocks only Industry",()=>{
   assert.equal(isLiveSubscriptionRow(sub(),NOW,"industry_pro"),true);
   for(const plan of ["talent_pro","community_pro"] as const) assert.equal(isLiveSubscriptionRow(sub(),NOW,plan),false);
 });
 it("does not trust legacy active flags, missing proof or ambiguous pro tier",()=>{
   for(const extra of [{provider_verified:false},{plan_entitlement:null},{billing_source:"polar"},{current_period_end:null},{current_period_end:"invalid"}]) assert.equal(isLiveSubscriptionRow(sub(extra),NOW,"industry_pro"),false);
 });
 it("uses verified Apple SKU and retains the shared three-minute clock grace",()=>{
   const apple=sub({provider:"apple_iap",billing_source:"apple_iap",plan_entitlement:null,app_store_product_id:"com.motiion.talent.pro.monthly"});
   assert.equal(isLiveSubscriptionRow(apple,NOW,"talent_pro"),true);
   assert.equal(isLiveSubscriptionRow(apple,NOW,"industry_pro"),false);
   assert.equal(isLiveSubscriptionRow({...apple,current_period_end:new Date(NOW.getTime()-120_000).toISOString()},NOW,"talent_pro"),true);
   assert.equal(isLiveSubscriptionRow({...apple,current_period_end:new Date(NOW.getTime()-240_000).toISOString()},NOW,"talent_pro"),false);
 });
 it("dual Apple plan covers talent and industry without community",()=>{
   const dual=sub({billing_source:"apple_iap",app_store_product_id:"com.motiion.dual.pro.monthly"});
   assert.equal(isLiveSubscriptionRow(dual,NOW,"talent_pro"),true);assert.equal(isLiveSubscriptionRow(dual,NOW,"industry_pro"),true);assert.equal(isLiveSubscriptionRow(dual,NOW,"community_pro"),false);
 });
 it("denies expired, canceled and failed-payment subscriptions",()=>{
   assert.equal(isLiveSubscriptionRow(sub({current_period_end:PAST}),NOW),false);
   for(const status of ["canceled","past_due","unpaid","incomplete"])assert.equal(isLiveSubscriptionRow(sub({status}),NOW),false);
   assert.equal(isLiveSubscriptionRow(sub({status:"trialing"}),NOW,"industry_pro"),true);
 });
 it("accepts matching lifetime grants but denies revoked, expired and wrong-plan grants",()=>{
   assert.equal(isLiveAccessCodeGrant(grant({expires_at:null}),NOW,"industry_pro"),true);
   for(const extra of [{revoked_at:NOW.toISOString()},{expires_at:PAST},{expires_at:"invalid"},{status:"revoked"},{entitlement:"talent_pro"}])assert.equal(isLiveAccessCodeGrant(grant(extra),NOW,"industry_pro"),false);
 });
 it("does not allow a different product to unlock paid UI",()=>assert.equal(userIsPaidFromRows({subscriptions:[sub()],grants:[grant({entitlement:"community_pro"})],entitlement:"talent_pro",now:NOW}),false));
 it("reports actual trial and period information",()=>assert.deepEqual(entitlementFromAccessRows({subscriptions:[sub({status:"trialing"})],grants:[],entitlement:"industry_pro",now:NOW}),{tier:"pro",active:true,status:"trialing",currentPeriodEnd:FUTURE,source:"stripe"}));
});
