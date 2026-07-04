import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type EntitlementTier = "free" | "pro";

export async function getUserEntitlement(userId: string): Promise<{
  tier: EntitlementTier;
  active: boolean;
  currentPeriodEnd: string | null;
}> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return { tier: "free", active: false, currentPeriodEnd: null };

  const { data } = await supabase
    .from("subscriptions")
    .select("status, tier, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle<{ status: string; tier: string; current_period_end: string | null }>();

  if (!data) return { tier: "free", active: false, currentPeriodEnd: null };

  return {
    tier: data.tier === "pro" ? "pro" : "free",
    active: data.status === "active" || data.status === "trialing",
    currentPeriodEnd: data.current_period_end,
  };
}

export async function requireProEntitlement(userId: string): Promise<{ ok: true } | { ok: false; reason: "paywall" }> {
  const entitlement = await getUserEntitlement(userId);
  if (entitlement.active && entitlement.tier === "pro") return { ok: true };
  return { ok: false, reason: "paywall" };
}
