import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type EntitlementTier = "free" | "pro";
export type EntitlementStatus = "none" | "trialing" | "active";
export type PlanEntitlement = "talent_pro" | "industry_pro" | "community_pro";

export type UserEntitlement = {
  tier: EntitlementTier;
  active: boolean;
  status: EntitlementStatus;
  currentPeriodEnd: string | null;
};

export type SubscriptionAccessRow = {
  status: string | null;
  tier?: string | null;
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
  if (Number.isNaN(end)) return true;
  return end > now.getTime();
}

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

/** Live `public.subscriptions` row: status active (or Stripe trial) and period not ended. */
export function isLiveSubscriptionRow(row: SubscriptionAccessRow, now: Date = new Date()): boolean {
  const status = normalized(row.status);
  if (status !== "active" && status !== "trialing") return false;
  return periodHasNotEnded(row.current_period_end, now);
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
 * an active subscriptions row for the user, or an unexpired grant for the entitlement.
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
  if (subscriptions.some((row) => isLiveSubscriptionRow(row, now))) return true;
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
  const liveSubs = subscriptions.filter((row) => isLiveSubscriptionRow(row, now));
  if (liveSubs.length > 0) {
    const preferred =
      liveSubs.find((row) => normalized(row.status) === "trialing") ?? liveSubs[0];
    return {
      tier: "pro",
      active: true,
      status: normalized(preferred.status) === "trialing" ? "trialing" : "active",
      currentPeriodEnd: preferred.current_period_end ?? null,
    };
  }

  const liveGrant = grants.find((row) => isLiveAccessCodeGrant(row, now, entitlement));
  if (!liveGrant) return FREE_ENTITLEMENT;

  return {
    tier: "pro",
    active: true,
    status: "active",
    currentPeriodEnd: liveGrant.expires_at,
  };
}

async function loadAccountAccessRows(userId: string): Promise<{
  subscriptions: SubscriptionAccessRow[];
  grants: AccessCodeGrantRow[];
}> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return { subscriptions: [], grants: [] };

  const [subscriptions, grants] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, tier, current_period_end")
      .eq("user_id", userId),
    supabase
      .from("access_code_grants")
      .select("entitlement, status, expires_at, revoked_at")
      .eq("user_id", userId),
  ]);

  return {
    subscriptions: (subscriptions.data ?? []) as SubscriptionAccessRow[],
    grants: grants.error ? [] : ((grants.data ?? []) as AccessCodeGrantRow[]),
  };
}

export async function getUserEntitlement(
  userId: string,
  entitlement: PlanEntitlement = "industry_pro",
): Promise<UserEntitlement> {
  const rows = await loadAccountAccessRows(userId);
  return entitlementFromAccessRows({ ...rows, entitlement });
}

export async function userHasPaidEntitlement(
  userId: string,
  entitlement: PlanEntitlement,
): Promise<boolean> {
  const rows = await loadAccountAccessRows(userId);
  return userIsPaidFromRows({ ...rows, entitlement });
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
