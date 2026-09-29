export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function parsePlatformFeeBps(): number {
  const raw = Deno.env.get("STRIPE_PLATFORM_FEE_BPS");
  if (raw == null || raw.trim() === "") return 1000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 10_000) {
    console.warn(`STRIPE_PLATFORM_FEE_BPS invalid (${raw}); using 1000`);
    return 1000;
  }
  return Math.trunc(n);
}

export const env = {
  stripeSecretKey: requireEnv("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: requireEnv("STRIPE_WEBHOOK_SECRET"),
  appUrl: requireEnv("NEXT_PUBLIC_APP_URL"),
  supabaseUrl: requireEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  platformFeeBps: parsePlatformFeeBps(),
  /**
   * Stripe Dashboard → Identity → Verification *flows* (`vf_…` template id).
   * Do not use a Verification *Session* id (`vs_…`); those are created per user at runtime.
   * When unset, sessions use `type: document`.
   */
  stripeIdentityVerificationFlowId: Deno.env.get("STRIPE_IDENTITY_VERIFICATION_FLOW_ID")?.trim() || null,
};
