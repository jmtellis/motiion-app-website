import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type Stripe from "stripe";
import { mapStripeSubscriptionStatus, subscriptionPeriodEndIso, isIndustrySubscription, invoiceSubscriptionId, industrySubscriptionAccess } from "../src/lib/billing/subscription-state";
const subscription=(extra:Record<string,unknown>={}):Stripe.Subscription=>({status:"active",items:{data:[{price:{id:"price_industry"},current_period_end:1800000000}]},...extra}) as Stripe.Subscription;
describe("Stripe subscription state",()=>{
 it("keeps recovery states distinct and maps paused into unpaid",()=>{ for(const status of ["active","trialing","past_due","canceled","unpaid","incomplete","incomplete_expired"] as const)assert.equal(mapStripeSubscriptionStatus(status),status);assert.equal(mapStripeSubscriptionStatus("paused"),"unpaid");});
 it("reads item period end instead of an expired former trial",()=>assert.equal(subscriptionPeriodEndIso(subscription({trial_end:1700000000})),new Date(1800000000*1000).toISOString()));
 it("uses the earliest period for mixed subscription items",()=>assert.equal(subscriptionPeriodEndIso(subscription({items:{data:[{current_period_end:1800000000},{current_period_end:1800100000}]}})),new Date(1800000000*1000).toISOString()));
 it("missing periods never become permanent access",()=>assert.equal(subscriptionPeriodEndIso(subscription({items:{data:[]},trial_end:1700000000})),null));
 it("only configured recurring product establishes entitlement",()=>{assert.equal(isIndustrySubscription(subscription(),"price_industry"),true);assert.equal(isIndustrySubscription(subscription(),"price_other"),false);assert.equal(isIndustrySubscription(subscription(),undefined),false);});
 it("reads current and historical invoice subscription references",()=>{assert.equal(invoiceSubscriptionId({parent:{subscription_details:{subscription:"sub_current"}}} as Stripe.Invoice),"sub_current");assert.equal(invoiceSubscriptionId({subscription:"sub_legacy"} as unknown as Stripe.Invoice),"sub_legacy");assert.equal(invoiceSubscriptionId({} as Stripe.Invoice),null);});
});

describe("Stripe plan reconciliation", () => {
  it("configuration failures retry instead of discarding the signed event", () => {
    assert.throws(() => industrySubscriptionAccess(subscription(), undefined, false), /not configured/);
    assert.throws(() => industrySubscriptionAccess(subscription(), " ", true), /not configured/);
  });
  it("an unrelated product cannot create Industry Pro entitlement", () => {
    assert.deepEqual(industrySubscriptionAccess(subscription(), "price_other", false), { sync: false });
  });
  it("removing the eligible price from a verified plan expires access immediately", () => {
    assert.deepEqual(industrySubscriptionAccess(subscription(), "price_other", true), { sync: true, periodEnd: null });
  });
  it("restoring the eligible price reinstates only its verified finite period", () => {
    assert.deepEqual(industrySubscriptionAccess(subscription(), "price_industry", true), { sync: true, periodEnd: new Date(1800000000 * 1000).toISOString() });
  });
});
