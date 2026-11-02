import assert from "node:assert/strict";
import { test } from "node:test";
import { industryCheckoutPriceError, industryLegacyPriceIds, INDUSTRY_OFFER } from "../src/lib/billing/industry-offer";
import { industrySubscriptionAccess } from "../src/lib/billing/subscription-state";
import type Stripe from "stripe";

const price = { active: true, livemode: false, currency: "usd", unit_amount: 5999, type: "recurring", recurring: { interval: "month", interval_count: 1 }, product: { active: true } };
test("new Industry checkout requires the current iOS monthly offer and correct environment", () => {
  assert.equal(INDUSTRY_OFFER.amountCents, 5999);
  assert.equal(industryCheckoutPriceError(price, false), null);
  assert.ok(industryCheckoutPriceError(price, true));
  assert.ok(industryCheckoutPriceError({ ...price, unit_amount: 20000 }, false));
  assert.ok(industryCheckoutPriceError({ ...price, currency: "eur" }, false));
  assert.ok(industryCheckoutPriceError({ ...price, recurring: { interval: "year", interval_count: 1 } }, false));
  assert.ok(industryCheckoutPriceError({ ...price, recurring: { interval: "month", interval_count: 2 } }, false));
});
test("inactive, deleted and one-time prices cannot start subscription checkout", () => {
  assert.ok(industryCheckoutPriceError({ ...price, active: false }, false));
  assert.ok(industryCheckoutPriceError({ ...price, product: { deleted: true } }, false));
  assert.ok(industryCheckoutPriceError({ ...price, product: "prod_unexpanded" }, false));
  assert.ok(industryCheckoutPriceError({ ...price, type: "one_time", recurring: null }, false));
});
test("explicit legacy prices retain finite Industry access after a sale-price rotation", () => {
  const subscription = { status: "active", items: { data: [{ price: { id: "price_legacy" }, current_period_end: 1800000000 }] } } as Stripe.Subscription;
  assert.deepEqual(industrySubscriptionAccess(subscription, "price_current", true, ["price_legacy"]), { sync: true, periodEnd: new Date(1800000000 * 1000).toISOString() });
  assert.deepEqual(industrySubscriptionAccess(subscription, "price_current", true), { sync: true, periodEnd: null });
  assert.deepEqual(industrySubscriptionAccess(subscription, "price_current", false), { sync: false });
  assert.ok(industryCheckoutPriceError({ ...price, unit_amount: 20000 }, false), "Legacy entitlement recognition must not permit legacy sale prices");
});
test("legacy price configuration is explicit and deduplicated", () => {
  assert.deepEqual(industryLegacyPriceIds(" price_legacy,price_legacy,price_current,arbitrary,sub_subscription "), ["price_legacy", "price_current"]);
  assert.deepEqual(industryLegacyPriceIds(undefined), []);
});
