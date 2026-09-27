/** Public project identifiers, never credentials. Keep production isolated from test builds. */
export const PRODUCTION_SUPABASE_REF = "pygdxcscmebeqjxhzzuq";
export const INDUSTRY_STAGING_SUPABASE_REF = "mvkvztpvakybrhyupown";
const PRODUCTION_API_HOSTS = [`${PRODUCTION_SUPABASE_REF}.supabase.co`, "api.motiion.app"];

type Environment = Record<string, string | undefined>;
export type AppEnvironment = "production" | "staging" | "development";

export function resolveAppEnvironment(env: Environment): AppEnvironment {
  const declared = env.NEXT_PUBLIC_APP_ENV;
  if (declared && !["production", "staging", "development"].includes(declared)) {
    throw new Error("NEXT_PUBLIC_APP_ENV must be production, staging, or development.");
  }
  const deployment = env.VERCEL_ENV ?? env.NEXT_PUBLIC_VERCEL_ENV;
  if (deployment === "production") {
    if (declared && declared !== "production") {
      throw new Error("A production deployment cannot use a test environment.");
    }
    return "production";
  }
  if (deployment === "preview" || env.NODE_ENV === "development") {
    if (declared === "production") {
      throw new Error("Local and preview builds cannot use the production environment.");
    }
    return declared === "staging" || deployment === "preview" ? "staging" : "development";
  }
  return (declared as AppEnvironment | undefined) ?? (env.NODE_ENV === "production" ? "production" : "development");
}

export function getAppEnvironment(): AppEnvironment {
  // Explicit accesses allow Next.js to inline the public values in browser bundles.
  return resolveAppEnvironment({
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
  });
}

export function assertSupabaseIsolation(url: string, environment: AppEnvironment) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const production = PRODUCTION_API_HOSTS.includes(host);
  if (environment !== "production" && production) {
    throw new Error("Testing is blocked: this website is connected to production Supabase. Configure staging credentials before continuing.");
  }
  if (environment === "production" && !production) {
    throw new Error("Production deployments must use the production Supabase project.");
  }
}

export function assertTestStripeKey(key: string | undefined, environment: AppEnvironment) {
  if (key && environment !== "production" && !/^(sk|rk|pk)_test_/.test(key)) {
    throw new Error("Test environments require Stripe test keys. Remove the payment key or replace it with a test key.");
  }
}

/** Called before Next starts or builds, including routes that call REST directly. */
export function assertDeploymentIsolation(env: Environment) {
  const environment = resolveAppEnvironment(env);
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (url) assertSupabaseIsolation(url, environment);
  if (environment === "staging" && !url) throw new Error("Staging requires its own Supabase URL.");
  assertTestStripeKey(env.STRIPE_SECRET_KEY, environment);
  assertTestStripeKey(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, environment);
  if (environment !== "production") {
    for (const name of ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_PROFILE_OG_BASE_URL"]) {
      const value = env[name]?.trim();
      if (!value) continue;
      const host = new URL(value).hostname;
      if (["motiion.app", "www.motiion.app", ...PRODUCTION_API_HOSTS].includes(host)) {
        throw new Error(`${name} must point to the test environment, not the live website or backend.`);
      }
    }
  }
  return environment;
}

export function isEmailRecipientAllowed(to: string, environment: AppEnvironment, allowlist = "") {
  if (environment === "production") return true;
  // Exact single-address match; no wildcards, display names, or recipient lists.
  const normalized = to.trim().toLowerCase();
  if (!/^[^\s,;<>@]+@[^\s,;<>@]+\.[^\s,;<>@]+$/.test(normalized)) return false;
  return allowlist.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean).includes(normalized);
}
