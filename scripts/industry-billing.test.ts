import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapStripeSubscriptionStatus } from "../src/lib/billing/stripe";

describe("stripe subscription status mapping", () => {
  it("keeps active and trialing as entitled statuses", () => {
    assert.equal(mapStripeSubscriptionStatus("active"), "active");
    assert.equal(mapStripeSubscriptionStatus("trialing"), "trialing");
  });

  it("maps non-entitled Stripe statuses to canceled", () => {
    assert.equal(mapStripeSubscriptionStatus("canceled"), "canceled");
    assert.equal(mapStripeSubscriptionStatus("unpaid"), "canceled");
    assert.equal(mapStripeSubscriptionStatus("incomplete"), "canceled");
    assert.equal(mapStripeSubscriptionStatus("past_due"), "canceled");
    assert.equal(mapStripeSubscriptionStatus("incomplete_expired"), "canceled");
    assert.equal(mapStripeSubscriptionStatus("paused"), "canceled");
  });
});
