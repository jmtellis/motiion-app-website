import { supabaseAdmin } from "./supabase-admin.ts";
import {
  isIdentityFeeUnlocked,
  type IdentityVerificationAudience,
} from "./identity-verification-fee-policy.ts";
import { identityVerificationAudience } from "./identity-verification-fee-policy.ts";

export type IdentityFeeProfile = {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  stripe_customer_id: string | null;
  stripe_identity_verification_session_id: string | null;
  identity_verification_status: string | null;
  identity_verification_attempts_remaining: number | null;
  identity_verification_fee_paid_at: string | null;
  identity_verification_fee_unlocked_at: string | null;
  account_type: string | null;
  enabled_shells: string[] | null;
};

const PROFILE_COLUMNS = [
  "user_id",
  "email",
  "first_name",
  "last_name",
  "display_name",
  "stripe_customer_id",
  "stripe_identity_verification_session_id",
  "identity_verification_status",
  "identity_verification_attempts_remaining",
  "identity_verification_fee_paid_at",
  "identity_verification_fee_unlocked_at",
  "account_type",
  "enabled_shells",
].join(",");

export async function loadIdentityFeeProfile(userId: string): Promise<IdentityFeeProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle<IdentityFeeProfile>();
  if (error) {
    console.error("identity fee profile lookup failed", error);
    throw new Error("profile_lookup_failed");
  }
  return data;
}

export function audienceForProfile(profile: IdentityFeeProfile): IdentityVerificationAudience {
  return identityVerificationAudience({
    accountType: profile.account_type,
    enabledShells: profile.enabled_shells,
  });
}

export function profileFeeUnlocked(profile: IdentityFeeProfile): boolean {
  return isIdentityFeeUnlocked({
    feeUnlockedAt: profile.identity_verification_fee_unlocked_at,
    feePaidAt: profile.identity_verification_fee_paid_at,
  });
}

/** Trusted server plan. Active and trialing allowlisted Apple IAP rows live inside this function. */
export async function isEffectiveTalentPro(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("effective_talent_plan_tier", {
    p_user_id: userId,
  });
  if (error) {
    console.error("effective_talent_plan_tier lookup failed", error);
    throw new Error("plan_lookup_failed");
  }
  return data === "pro";
}

export async function applyIdentityVerificationFeePayment(input: {
  userId: string;
  paymentIntentId: string;
  amountCents: number;
  currency: string;
}): Promise<{ ok: true; applied: boolean } | { ok: false; error: string }> {
  const { data, error } = await supabaseAdmin.rpc("apply_identity_verification_fee_payment", {
    p_user_id: input.userId,
    p_payment_intent_id: input.paymentIntentId,
    p_amount_cents: input.amountCents,
    p_currency: input.currency,
  });
  if (error) {
    console.error("apply_identity_verification_fee_payment failed", error);
    return { ok: false, error: "fee_grant_failed" };
  }
  const applied = Boolean(
    data && typeof data === "object" && "applied" in data &&
      (data as { applied?: boolean }).applied,
  );
  return { ok: true, applied };
}

/** Returns remaining attempts after a successful decrement, or null when the budget is exhausted. */
export async function consumeIdentityVerificationAttempt(userId: string): Promise<number | null> {
  const { data, error } = await supabaseAdmin.rpc("consume_identity_verification_attempt", {
    p_user_id: userId,
  });
  if (error) {
    console.error("consume_identity_verification_attempt failed", error);
    throw new Error("attempt_consume_failed");
  }
  if (typeof data === "number" && Number.isFinite(data)) return data;
  return null;
}
