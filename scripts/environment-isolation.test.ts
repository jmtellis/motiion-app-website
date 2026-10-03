import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertDeploymentIsolation, assertSupabaseIsolation, assertTestStripeKey,
  isEmailRecipientAllowed, prepareBuildEnvironment, previewPublicEnvOverrides,
  PRODUCTION_SUPABASE_REF, INDUSTRY_STAGING_SUPABASE_REF, PREVIEW_DISCONNECTED_ENV,
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
  it("disconnects a preview that inherited production credentials", () => {
    const env: Record<string, string> = {
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_URL: "motiion-app-website-example.vercel.app",
      NEXT_PUBLIC_APP_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: productionUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "preview-should-not-inline-anon",
      SUPABASE_SERVICE_ROLE_KEY: "preview-should-not-inline-service",
      STRIPE_SECRET_KEY: "sk_live_example",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example",
      STRIPE_WEBHOOK_SECRET: "whsec_live_example",
      NEXT_PUBLIC_SITE_URL: "https://www.motiion.app",
      NEXT_PUBLIC_APP_URL: "https://motiion.app",
      NEXT_PUBLIC_PROFILE_OG_BASE_URL: "https://api.motiion.app",
    };
    const prepared = prepareBuildEnvironment(env);
    assert.equal(prepared.environment, "staging");
    assert.equal(prepared.disconnected, true);
    assert.equal(env.NEXT_PUBLIC_APP_ENV, "staging");
    assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, "");
    assert.equal(env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "");
    assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, "");
    assert.equal(env.STRIPE_SECRET_KEY, "");
    assert.equal(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, "");
    assert.equal(env.STRIPE_WEBHOOK_SECRET, "");
    assert.equal(env.NEXT_PUBLIC_SITE_URL, "https://motiion-app-website-example.vercel.app");
    assert.equal(env.NEXT_PUBLIC_APP_URL, "https://motiion-app-website-example.vercel.app");
    assert.equal(env.NEXT_PUBLIC_PROFILE_OG_BASE_URL, "https://motiion-app-website-example.vercel.app");
    assert.equal(env[PREVIEW_DISCONNECTED_ENV], "1");
    assert.equal(assertDeploymentIsolation(env), "staging");
    const overrides = previewPublicEnvOverrides(env);
    assert.equal(overrides.NEXT_PUBLIC_SUPABASE_URL, "");
    assert.equal(overrides.NEXT_PUBLIC_SUPABASE_ANON_KEY, "");
    assert.doesNotMatch(JSON.stringify(overrides), /pygdxcscmebeqjxhzzuq|preview-should-not-inline|sk_live|pk_live/);
  });
  it("keeps a staging database when a preview only inherited live payments and links", () => {
    const env: Record<string, string> = {
      VERCEL_ENV: "preview",
      VERCEL_URL: "branch.vercel.app",
      NEXT_PUBLIC_SUPABASE_URL: stagingUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "staging-anon",
      SUPABASE_SERVICE_ROLE_KEY: "staging-service",
      STRIPE_SECRET_KEY: "sk_live_example",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example",
      NEXT_PUBLIC_SITE_URL: "https://motiion.app/path",
    };
    const prepared = prepareBuildEnvironment(env);
    assert.equal(prepared.disconnected, true);
    assert.equal(prepared.environment, "staging");
    assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, stagingUrl);
    assert.equal(env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "staging-anon");
    assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, "staging-service");
    assert.equal(env.STRIPE_SECRET_KEY, "");
    assert.equal(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, "");
    assert.equal(env.NEXT_PUBLIC_SITE_URL, "https://branch.vercel.app");
    assert.equal(env[PREVIEW_DISCONNECTED_ENV], undefined);
  });
  it("leaves a staging-configured preview and production deployments unchanged", () => {
    const stagingPreview: Record<string, string> = {
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_SUPABASE_URL: stagingUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "staging-anon",
      STRIPE_SECRET_KEY: "sk_test_example",
      NEXT_PUBLIC_SITE_URL: "https://motiion-industry-staging.vercel.app",
    };
    const preparedPreview = prepareBuildEnvironment(stagingPreview);
    assert.equal(preparedPreview.disconnected, false);
    assert.equal(preparedPreview.environment, "staging");
    assert.equal(stagingPreview.NEXT_PUBLIC_SUPABASE_URL, stagingUrl);
    assert.equal(stagingPreview.NEXT_PUBLIC_SUPABASE_ANON_KEY, "staging-anon");

    const production: Record<string, string> = {
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: productionUrl,
      STRIPE_SECRET_KEY: "sk_live_example",
      NEXT_PUBLIC_SITE_URL: "https://www.motiion.app",
    };
    const preparedProduction = prepareBuildEnvironment(production);
    assert.equal(preparedProduction.disconnected, false);
    assert.equal(preparedProduction.environment, "production");
    assert.equal(production.NEXT_PUBLIC_SUPABASE_URL, productionUrl);
    assert.equal(production.STRIPE_SECRET_KEY, "sk_live_example");
    assert.equal(production.NEXT_PUBLIC_SITE_URL, "https://www.motiion.app");
  });
  it("allows only a disconnected preview to build without a database", () => {
    assert.equal(assertDeploymentIsolation({
      VERCEL_ENV: "preview",
      [PREVIEW_DISCONNECTED_ENV]: "1",
    }), "staging");
    assert.throws(() => assertDeploymentIsolation({ VERCEL_ENV: "preview" }), /Staging requires its own Supabase URL/);
    assert.throws(() => assertDeploymentIsolation({
      VERCEL_ENV: "preview",
      [PREVIEW_DISCONNECTED_ENV]: "1",
      NEXT_PUBLIC_SUPABASE_URL: productionUrl,
    }), /production Supabase/);
    assert.throws(() => prepareBuildEnvironment({
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: stagingUrl,
    }), /production Supabase/);
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
