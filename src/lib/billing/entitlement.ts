import { cache } from "react";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type EntitlementTier = "free" | "pro";
export type EntitlementStatus = "none" | "trialing" | "active";
export type PlanEntitlement = "talent_pro" | "industry_pro" | "community_pro";

export type UserEntitlement = {
  tier: EntitlementTier;
  active: boolean;
  status: EntitlementStatus;
  currentPeriodEnd: string | null;
  source?: "stripe" | "apple_iap" | "access_code" | null;
};

export type SubscriptionAccessRow = {
  status: string | null;
  tier?: string | null;
  provider?: string | null;
  billing_source?: string | null;
  provider_verified?: boolean;
  app_store_product_id?: string | null;
  plan_entitlement?: string | null;
  current_period_end?: string | null;
};

export type AccessCodeGrantRow = {
  entitlement: string | null;
  status: string | null;
  expires_at: string | null;
  revoked_at?: string | null;
};

const FREE_ENTITLEMENT: UserEntitlement = {
  tier: "free",
  active: false,
  status: "none",
  currentPeriodEnd: null,
};

function periodHasNotEnded(iso: string | null | undefined, now: Date): boolean {
  if (!iso) return true;
  const end = Date.parse(iso);
  if (Number.isNaN(end)) return false;
  return end > now.getTime();
}

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

const APPLE_ENTITLEMENTS: Record<PlanEntitlement, readonly string[]> = {
  talent_pro: ["com.motiion.talent.pro.monthly", "com.motiion.dual.pro.monthly", "com.motiion.dancer.pro.monthly", "com.motiion.dancer.pro.yearly"],
  industry_pro: ["com.motiion.industry.pro.monthly", "com.motiion.dual.pro.monthly", "com.motiion.choreographer.pro.monthly"],
  community_pro: ["com.motiion.community.pro.monthly"],
};

/** Match trusted provider proof and the exact plan, as account_pro_status does. */
export function isLiveSubscriptionRow(row: SubscriptionAccessRow, now: Date = new Date(), entitlement?: PlanEntitlement): boolean {
  const status = normalized(row.status);
  if (!row.provider_verified || !row.current_period_end || !["active", "trialing"].includes(status)) return false;
  const source = normalized(row.billing_source);
  // Apple's existing server contract includes a three-minute clock grace.
  const checkTime = source === "apple_iap" ? new Date(now.getTime() - 180_000) : now;
  if (!periodHasNotEnded(row.current_period_end, checkTime)) return false;
  const plans = entitlement ? [entitlement] : Object.keys(APPLE_ENTITLEMENTS) as PlanEntitlement[];
  if (source === "stripe" && normalized(row.provider) === "stripe") return plans.some(plan => row.plan_entitlement === plan);
  if (source === "apple_iap") return plans.some(plan => APPLE_ENTITLEMENTS[plan].includes(row.app_store_product_id ?? ""));
  return false;
}

/** Unexpired, not-revoked `public.access_code_grants` row for an entitlement. */
export function isLiveAccessCodeGrant(
  row: AccessCodeGrantRow,
  now: Date = new Date(),
  entitlement?: PlanEntitlement,
): boolean {
  if (entitlement && normalized(row.entitlement) !== entitlement) return false;
  if (normalized(row.status) !== "active") return false;
  if (row.revoked_at) return false;
  return periodHasNotEnded(row.expires_at, now);
}

/**
 * Account-level paid check shared with the app:
 * a verified subscription for the requested plan, or an unexpired grant for that plan.
 */
export function userIsPaidFromRows({
  subscriptions,
  grants,
  entitlement,
  now = new Date(),
}: {
  subscriptions: SubscriptionAccessRow[];
  grants: AccessCodeGrantRow[];
  entitlement?: PlanEntitlement;
  now?: Date;
}): boolean {
  if (subscriptions.some((row) => isLiveSubscriptionRow(row, now, entitlement))) return true;
  return grants.some((row) => isLiveAccessCodeGrant(row, now, entitlement));
}

export function entitlementFromAccessRows({
  subscriptions,
  grants,
  entitlement,
  now = new Date(),
}: {
  subscriptions: SubscriptionAccessRow[];
  grants: AccessCodeGrantRow[];
  entitlement?: PlanEntitlement;
  now?: Date;
}): UserEntitlement {
  const liveSubs = subscriptions.filter((row) => isLiveSubscriptionRow(row, now, entitlement));
  if (liveSubs.length > 0) {
    const preferred =
      liveSubs.find((row) => normalized(row.status) === "trialing") ?? liveSubs[0];
    return {
      tier: "pro",
      active: true,
      status: normalized(preferred.status) === "trialing" ? "trialing" : "active",
      currentPeriodEnd: preferred.current_period_end ?? null,
      source: preferred.billing_source === "stripe" ? "stripe" : "apple_iap",
    };
  }

  const liveGrant = grants.find((row) => isLiveAccessCodeGrant(row, now, entitlement));
  if (!liveGrant) return FREE_ENTITLEMENT;

  return {
    tier: "pro",
    active: true,
    status: "active",
    currentPeriodEnd: liveGrant.expires_at,
    source: "access_code",
  };
}

const loadAccountAccessRows = cache(async (userId: string): Promise<{
  subscriptions: SubscriptionAccessRow[];
  grants: AccessCodeGrantRow[];
}> => {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Subscription access is temporarily unavailable.");

  const [subscriptions, grants] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, tier, current_period_end, provider, billing_source, provider_verified, app_store_product_id, plan_entitlement")
      .eq("user_id", userId),
    supabase
      .from("access_code_grants")
      .select("entitlement, status, expires_at, revoked_at")
      .eq("user_id", userId),
  ]);

  if (subscriptions.error || grants.error) throw new Error("Could not refresh subscription access. Please retry.");
  return {
    subscriptions: (subscriptions.data ?? []) as SubscriptionAccessRow[],
    grants: (grants.data ?? []) as AccessCodeGrantRow[],
  };
});


const loadAccountProStatus = cache(async (userId: string): Promise<{ talent: boolean; industry: boolean; community: boolean }> => {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Subscription access is temporarily unavailable.");
  const { data, error } = await supabase.rpc("account_pro_status", { p_user_id: userId });
  if (error || !data) throw new Error("Could not refresh subscription access. Please retry.");
  return { talent: data.talent === true, industry: data.industry === true, community: data.community === true };
});

export async function getUserEntitlement(
  userId: string,
  entitlement: PlanEntitlement = "industry_pro",
): Promise<UserEntitlement> {
  const [rows, status] = await Promise.all([loadAccountAccessRows(userId), loadAccountProStatus(userId)]);
  if (!status[entitlement.replace("_pro", "") as "talent" | "industry" | "community"]) return FREE_ENTITLEMENT;
  const details = entitlementFromAccessRows({ ...rows, entitlement });
  return details.active ? details : { tier: "pro", active: true, status: "active", currentPeriodEnd: null };
}

export async function userHasPaidEntitlement(
  userId: string,
  entitlement: PlanEntitlement,
): Promise<boolean> {
  return (await getUserEntitlement(userId, entitlement)).active;
}

/** Talent Pro, including App Store subscribers once `public.subscriptions` has a live row. */
export async function hasTalentProAccess(userId: string): Promise<boolean> {
  return userHasPaidEntitlement(userId, "talent_pro");
}

export async function hasCommunityProAccess(userId: string): Promise<boolean> {
  return userHasPaidEntitlement(userId, "community_pro");
}

export async function requireProEntitlement(
  userId: string,
): Promise<{ ok: true } | { ok: false; reason: "paywall" }> {
  if (await userHasPaidEntitlement(userId, "industry_pro")) return { ok: true };
  return { ok: false, reason: "paywall" };
}
