import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  entitlementFromAccessRows,
  isLiveAccessCodeGrant,
  isLiveSubscriptionRow,
  userIsPaidFromRows,
  type AccessCodeGrantRow,
  type SubscriptionAccessRow,
} from "../src/lib/billing/entitlement";

const NOW = new Date("2026-10-03T12:00:00.000Z");
const FUTURE = "2026-11-01T00:00:00.000Z";
const PAST = "2026-09-01T00:00:00.000Z";

function sub(partial: Partial<SubscriptionAccessRow> = {}): SubscriptionAccessRow {
  return {
    status: "active",
    tier: "free",
    current_period_end: FUTURE,
    ...partial,
  };
}

function grant(partial: Partial<AccessCodeGrantRow> = {}): AccessCodeGrantRow {
  return {
    entitlement: "industry_pro",
    status: "active",
    expires_at: FUTURE,
    revoked_at: null,
    ...partial,
  };
}

describe("account-level subscription check", () => {
  it("treats an App Store row as paid once status is active and the period has not ended", () => {
    assert.equal(isLiveSubscriptionRow(sub({ tier: "free" }), NOW), true);
    assert.equal(
      userIsPaidFromRows({
        subscriptions: [sub({ tier: "free", status: "active" })],
        grants: [],
        entitlement: "industry_pro",
        now: NOW,
      }),
      true,
    );
  });

  it("does not treat an ended period as paid", () => {
    assert.equal(isLiveSubscriptionRow(sub({ current_period_end: PAST }), NOW), false);
  });

  it("treats a live row with no period end as paid", () => {
    assert.equal(isLiveSubscriptionRow(sub({ current_period_end: null }), NOW), true);
  });

  it("keeps Stripe trials entitled", () => {
    assert.equal(isLiveSubscriptionRow(sub({ status: "trialing" }), NOW), true);
  });

  it("rejects canceled and inactive subscription rows", () => {
    assert.equal(isLiveSubscriptionRow(sub({ status: "canceled" }), NOW), false);
    assert.equal(isLiveSubscriptionRow(sub({ status: "inactive" }), NOW), false);
  });

  it("treats an unexpired, not-revoked grant as paid for that entitlement", () => {
    assert.equal(isLiveAccessCodeGrant(grant(), NOW, "industry_pro"), true);
    assert.equal(
      userIsPaidFromRows({
        subscriptions: [],
        grants: [grant({ entitlement: "talent_pro" })],
        entitlement: "talent_pro",
        now: NOW,
      }),
      true,
    );
  });

  it("does not let a grant for another entitlement unlock paid UI", () => {
    assert.equal(
      userIsPaidFromRows({
        subscriptions: [],
        grants: [grant({ entitlement: "talent_pro" })],
        entitlement: "industry_pro",
        now: NOW,
      }),
      false,
    );
  });

  it("rejects revoked or expired grants", () => {
    assert.equal(
      isLiveAccessCodeGrant(grant({ revoked_at: NOW.toISOString() }), NOW, "industry_pro"),
      false,
    );
    assert.equal(isLiveAccessCodeGrant(grant({ status: "revoked" }), NOW, "industry_pro"), false);
    assert.equal(
      isLiveAccessCodeGrant(grant({ expires_at: PAST }), NOW, "industry_pro"),
      false,
    );
  });

  it("treats a lifetime grant as paid", () => {
    assert.equal(isLiveAccessCodeGrant(grant({ expires_at: null }), NOW, "industry_pro"), true);
  });

  it("builds a Pro entitlement from a live subscriptions row without a client flag", () => {
    const entitlement = entitlementFromAccessRows({
      subscriptions: [sub({ status: "active", tier: null })],
      grants: [],
      entitlement: "industry_pro",
      now: NOW,
    });
    assert.equal(entitlement.active, true);
    assert.equal(entitlement.tier, "pro");
    assert.equal(entitlement.status, "active");
    assert.equal(entitlement.currentPeriodEnd, FUTURE);
  });

  it("builds a Pro entitlement from a matching grant when there is no subscription row", () => {
    const entitlement = entitlementFromAccessRows({
      subscriptions: [],
      grants: [grant({ entitlement: "community_pro", expires_at: null })],
      entitlement: "community_pro",
      now: NOW,
    });
    assert.equal(entitlement.active, true);
    assert.equal(entitlement.tier, "pro");
    assert.equal(entitlement.currentPeriodEnd, null);
  });
});
