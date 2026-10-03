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

const LIVE_SITE_HOSTS = ["motiion.app", "www.motiion.app", ...PRODUCTION_API_HOSTS];
const PUBLIC_SITE_URL_KEYS = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_PROFILE_OG_BASE_URL"] as const;
const INLINED_PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  ...PUBLIC_SITE_URL_KEYS,
] as const;

/**
 * Set on a Vercel preview that inherited production credentials. The sample
 * preview can build without a database; this flag does not allow a production URL.
 */
export const PREVIEW_DISCONNECTED_ENV = "MOTIION_PREVIEW_DISCONNECTED";

function isLiveStripeKey(key: string | undefined) {
  return Boolean(key?.trim() && !/^(sk|rk|pk)_test_/.test(key.trim()));
}

function productionSupabaseHost(url: string | undefined) {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).hostname.replace(/^www\./, "");
  } catch {
    return "invalid";
  }
}

function previewOrigin(env: Environment) {
  const host = env.VERCEL_URL?.trim() || env.VERCEL_BRANCH_URL?.trim();
  if (!host) return undefined;
  if (/^https?:\/\//i.test(host)) return host.replace(/\/$/, "");
  return `https://${host}`;
}

/**
 * Preview deployments on this project inherit Production env vars. Drop those
 * credentials so the build cannot read or charge production. A preview that
 * already points at staging is left alone.
 */
export function disconnectPreviewFromProduction(env: Environment) {
  const declared = env.NEXT_PUBLIC_APP_ENV?.trim();
  if (declared && declared !== "staging" && declared !== "development") {
    env.NEXT_PUBLIC_APP_ENV = "staging";
  }

  const supabaseHost = productionSupabaseHost(env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseBlocked = supabaseHost === null || supabaseHost === "invalid" || PRODUCTION_API_HOSTS.includes(supabaseHost);
  if (supabaseBlocked) {
    env.NEXT_PUBLIC_SUPABASE_URL = "";
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    env.SUPABASE_SERVICE_ROLE_KEY = "";
    env[PREVIEW_DISCONNECTED_ENV] = "1";
  }

  const liveSecretKey = isLiveStripeKey(env.STRIPE_SECRET_KEY);
  if (liveSecretKey) {
    env.STRIPE_SECRET_KEY = "";
    env.STRIPE_WEBHOOK_SECRET = "";
  }
  if (isLiveStripeKey(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)) {
    env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "";
  }

  const origin = previewOrigin(env);
  for (const name of PUBLIC_SITE_URL_KEYS) {
    const value = env[name]?.trim();
    if (!value) continue;
    let live = false;
    try {
      live = LIVE_SITE_HOSTS.includes(new URL(value).hostname);
    } catch {
      live = true;
    }
    if (!live) continue;
    env[name] = origin ?? "";
  }
}

export type PreparedBuildEnvironment = {
  environment: AppEnvironment;
  disconnected: boolean;
};

/** Next config entry. Production and a correctly configured staging preview stay unchanged. */
export function prepareBuildEnvironment(env: Environment): PreparedBuildEnvironment {
  if (env.VERCEL_ENV !== "preview") {
    return { environment: assertDeploymentIsolation(env), disconnected: false };
  }

  try {
    return {
      environment: assertDeploymentIsolation(env),
      disconnected: env[PREVIEW_DISCONNECTED_ENV] === "1",
    };
  } catch {
    disconnectPreviewFromProduction(env);
    return { environment: assertDeploymentIsolation(env), disconnected: true };
  }
}

/** Force sanitized public values into the client bundle when a preview was disconnected. */
export function previewPublicEnvOverrides(env: Environment): Record<string, string> {
  return Object.fromEntries(INLINED_PUBLIC_ENV_KEYS.map((key) => [key, env[key] ?? ""]));
}

/** Called before Next starts or builds, including routes that call REST directly. */
export function assertDeploymentIsolation(env: Environment) {
  const environment = resolveAppEnvironment(env);
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (url) assertSupabaseIsolation(url, environment);
  if (environment === "staging" && !url) {
    const disconnectedPreview = env.VERCEL_ENV === "preview" && env[PREVIEW_DISCONNECTED_ENV] === "1";
    if (!disconnectedPreview) throw new Error("Staging requires its own Supabase URL.");
  }
  assertTestStripeKey(env.STRIPE_SECRET_KEY, environment);
  assertTestStripeKey(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, environment);
  if (environment !== "production") {
    for (const name of PUBLIC_SITE_URL_KEYS) {
      const value = env[name]?.trim();
      if (!value) continue;
      const host = new URL(value).hostname;
      if (LIVE_SITE_HOSTS.includes(host)) {
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
