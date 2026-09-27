import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertDeploymentIsolation, assertSupabaseIsolation, assertTestStripeKey,
  isEmailRecipientAllowed, PRODUCTION_SUPABASE_REF, INDUSTRY_STAGING_SUPABASE_REF,
} from "../src/lib/environment";

const productionUrl = `https://${PRODUCTION_SUPABASE_REF}.supabase.co`;
const stagingUrl = `https://${INDUSTRY_STAGING_SUPABASE_REF}.supabase.co`;

describe("environment isolation", () => {
  it("blocks production data access in local and preview builds, even with an explicit production label", () => {
    for (const context of [{ NODE_ENV: "development" }, { NODE_ENV: "production", VERCEL_ENV: "preview" }]) {
      assert.throws(() => assertDeploymentIsolation({ ...context, NEXT_PUBLIC_SUPABASE_URL: productionUrl }), /production Supabase/);
      assert.throws(() => assertDeploymentIsolation({ ...context, NEXT_PUBLIC_APP_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: productionUrl }), /cannot use the production/);
    }
  });
  it("accepts isolated staging and normal production; rejects a staging database in production", () => {
    assert.equal(assertDeploymentIsolation({ VERCEL_ENV: "preview", NEXT_PUBLIC_SUPABASE_URL: stagingUrl }), "staging");
    assert.equal(assertDeploymentIsolation({ VERCEL_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: productionUrl }), "production");
    assert.throws(() => assertDeploymentIsolation({ VERCEL_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: stagingUrl }), /production Supabase/);
    assert.throws(() => assertSupabaseIsolation(productionUrl, "staging"), /Testing is blocked/);
    assert.throws(() => assertSupabaseIsolation("https://api.motiion.app", "staging"), /Testing is blocked/);
    assert.doesNotThrow(() => assertSupabaseIsolation("https://api.motiion.app", "production"));
    assert.throws(() => assertSupabaseIsolation(productionUrl.replace("https://", "https://www."), "development"), /Testing is blocked/);
  });
  it("blocks production callbacks and link destinations in test builds", () => {
    for (const name of ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_PROFILE_OG_BASE_URL"]) {
      assert.throws(() => assertDeploymentIsolation({ VERCEL_ENV: "preview", NEXT_PUBLIC_SUPABASE_URL: stagingUrl, [name]: "https://www.motiion.app" }), /must point to the test environment/);
    }
  });
  it("rejects live payment keys while accepting absent or test keys", () => {
    for (const key of ["sk_live_example", "rk_live_example", "pk_live_example", "invalid"]) {
      assert.throws(() => assertTestStripeKey(key, "staging"), /Stripe test keys/);
    }
    for (const key of [undefined, "", "sk_test_example", "rk_test_example", "pk_test_example"]) {
      assert.doesNotThrow(() => assertTestStripeKey(key, "staging"));
    }
    assert.doesNotThrow(() => assertTestStripeKey("sk_live_example", "production"));
  });
  it("defaults to blocking test emails and permits only a single exact allowlisted address", () => {
    assert.equal(isEmailRecipientAllowed("tester@example.com", "staging"), false);
    assert.equal(isEmailRecipientAllowed("TESTER@example.com", "staging", "tester@example.com"), true);
    assert.equal(isEmailRecipientAllowed("other@example.com", "staging", "tester@example.com"), false);
    assert.equal(isEmailRecipientAllowed("tester@example.com,other@example.com", "staging", "tester@example.com"), false);
    assert.equal(isEmailRecipientAllowed("Tester <tester@example.com>", "staging", "tester@example.com"), false);
    assert.equal(isEmailRecipientAllowed("customer@example.com", "production"), true);
  });
});
