"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeJoinReferralCode } from "@/lib/referrals/code";
import { referralClaimMessage } from "@/lib/referrals/claim";

export async function claimReferral(rawCode: string): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  if (typeof rawCode !== "string" || rawCode.length > 100) return { ok: false, error: "Enter your friend’s username or referral code." };
  const code = normalizeJoinReferralCode(rawCode);
  if (!code) return { ok: false, error: "Enter your friend’s username or referral code." };
  const db = await createServerSupabaseClient();
  if (!db) return { ok: false, error: "Referrals are temporarily unavailable." };
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to confirm your referral." };
  const { data, error } = await db.rpc("claim_user_referral", { p_code: code, p_source: "manual_code" });
  if (error) return { ok: false, error: "Couldn’t confirm this referral. Please try again." };
  return data?.ok === true ? { ok: true, message: data.alreadyRecorded ? "This referral is already recorded." : "Referral confirmed. Thanks for joining your friend on Motiion." } : { ok: false, error: referralClaimMessage(data?.error) };
}
