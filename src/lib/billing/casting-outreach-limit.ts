import {
  FREE_CASTING_OUTREACH_LIMIT,
} from "@/lib/billing/freemium-limits";
import { hasIndustryProAccess } from "@/lib/billing/gate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type LimitResult =
  | { ok: true; remaining: number | null }
  | { ok: false; reason: "paywall"; used: number; limit: number; error: string };

/** Count invites + referrals a buyer has initiated on a casting. */
export async function countCastingOutreachUsed(
  userId: string,
  castingId: string,
): Promise<number> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return 0;

  const [{ count: inviteCount }, { count: referralCount }] = await Promise.all([
    supabase
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("casting_id", castingId)
      .eq("invited_by", userId)
      .neq("status", "withdrawn"),
    supabase
      .from("casting_referrals")
      .select("id", { count: "exact", head: true })
      .eq("casting_id", castingId)
      .eq("created_by", userId),
  ]);

  return (inviteCount ?? 0) + (referralCount ?? 0);
}

export async function requireCastingOutreachAllowance(
  userId: string,
  castingId: string,
  additionalCount = 1,
): Promise<LimitResult> {
  if (await hasIndustryProAccess(userId)) {
    return { ok: true, remaining: null };
  }

  const used = await countCastingOutreachUsed(userId, castingId);
  const limit = FREE_CASTING_OUTREACH_LIMIT;
  if (used + additionalCount > limit) {
    return {
      ok: false,
      reason: "paywall",
      used,
      limit,
      error: `Free plans include ${limit} invites/referrals per casting. Upgrade to Industry Pro for unlimited outreach.`,
    };
  }

  return { ok: true, remaining: Math.max(0, limit - used - additionalCount) };
}
