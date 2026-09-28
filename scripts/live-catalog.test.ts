import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveLiveCatalogConfig } from "../src/lib/catalog/live-catalog-config";
import { INDUSTRY_STAGING_SUPABASE_REF, PRODUCTION_SUPABASE_REF } from "../src/lib/environment";

function jwt(role: string) {
  const payload = Buffer.from(JSON.stringify({ role })).toString("base64url");
  return `eyJhbGciOiJub25lIn0.${payload}.sig`;
}

const keys = {
  CATALOG_SUPABASE_URL: "https://api.motiion.app",
  CATALOG_SUPABASE_ANON_KEY: jwt("anon"),
  CATALOG_SUPABASE_SECRET_KEY: jwt("service_role"),
};

describe("live catalog config", () => {
  it("accepts a read of the live project from staging", () => {
    const config = resolveLiveCatalogConfig(keys, "staging");
    assert.equal(config?.origin, "https://api.motiion.app");
  });

  it("accepts the production project host", () => {
    const config = resolveLiveCatalogConfig({
      ...keys,
      CATALOG_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_REF}.supabase.co`,
    }, "development");
    assert.equal(config?.origin, `https://${PRODUCTION_SUPABASE_REF}.supabase.co`);
  });

  it("stays off in production and rejects any other database", () => {
    assert.equal(resolveLiveCatalogConfig(keys, "production"), null);
    assert.equal(resolveLiveCatalogConfig({
      ...keys,
      CATALOG_SUPABASE_URL: `https://${INDUSTRY_STAGING_SUPABASE_REF}.supabase.co`,
    }, "staging"), null);
    assert.equal(resolveLiveCatalogConfig({ ...keys, CATALOG_SUPABASE_ANON_KEY: jwt("service_role") }, "staging"), null);
    assert.equal(resolveLiveCatalogConfig({ ...keys, CATALOG_SUPABASE_SECRET_KEY: jwt("anon") }, "staging"), null);
  });
});
