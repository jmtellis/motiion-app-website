import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type EntitlementTier = "free" | "pro";
export type EntitlementStatus = "none" | "trialing" | "active";

export type UserEntitlement = {
  tier: EntitlementTier;
  active: boolean;
  status: EntitlementStatus;
  currentPeriodEnd: string | null;
};

export async function getUserEntitlement(userId: string): Promise<UserEntitlement> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return { tier: "free", active: false, status: "none", currentPeriodEnd: null };

  const { data } = await supabase
    .from("subscriptions")
    .select("status, tier, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle<{ status: string; tier: string; current_period_end: string | null }>();

  if (!data) return { tier: "free", active: false, status: "none", currentPeriodEnd: null };

  const status: EntitlementStatus = data.status === "trialing" ? "trialing" : "active";

  return {
    tier: data.tier === "pro" ? "pro" : "free",
    active: data.status === "active" || data.status === "trialing",
    status,
    currentPeriodEnd: data.current_period_end,
  };
}

export async function requireProEntitlement(userId: string): Promise<{ ok: true } | { ok: false; reason: "paywall" }> {
  const entitlement = await getUserEntitlement(userId);
  if (entitlement.active && entitlement.tier === "pro") return { ok: true };
  return { ok: false, reason: "paywall" };
}
