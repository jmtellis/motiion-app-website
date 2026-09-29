import { supabaseAdmin } from "./supabase-admin.ts";

export type ActivityPromoRow = {
  id: string;
  activity_id: string;
  code: string;
  discount_type: "percent" | "fixed_cents";
  discount_value: number;
  max_redemptions: number | null;
  redeemed_count: number;
  expires_at: string | null;
  is_active: boolean;
};

export function applyPromoToBaseCents(
  baseAmountCents: number,
  promo: Pick<ActivityPromoRow, "discount_type" | "discount_value">,
): { discountedBaseCents: number; discountCents: number } {
  const base = Math.max(0, Math.round(baseAmountCents));
  let discountCents = 0;
  if (promo.discount_type === "percent") {
    const pct = Math.min(100, Math.max(0, promo.discount_value));
    discountCents = Math.round((base * pct) / 100);
  } else {
    discountCents = Math.min(base, Math.max(0, Math.round(promo.discount_value)));
  }
  // Keep Stripe minimum chargeable ticket base.
  const discountedBaseCents = Math.max(50, base - discountCents);
  discountCents = base - discountedBaseCents;
  return { discountedBaseCents, discountCents };
}

export async function resolveActivityPromoCode(
  activityId: string,
  rawCode: string | undefined | null,
): Promise<
  | { ok: true; promo: ActivityPromoRow | null }
  | { ok: false; status: number; error: string; errorCode: string }
> {
  const code = (rawCode ?? "").trim().toUpperCase();
  if (!code) return { ok: true, promo: null };

  const { data, error } = await supabaseAdmin
    .from("activity_promo_codes")
    .select(
      "id,activity_id,code,discount_type,discount_value,max_redemptions,redeemed_count,expires_at,is_active",
    )
    .eq("activity_id", activityId)
    .eq("code", code)
    .maybeSingle<ActivityPromoRow>();

  if (error) {
    console.error("activity-promo lookup failed", error);
    return {
      ok: false,
      status: 500,
      error: "Unable to validate promo code",
      errorCode: "PROMO_LOOKUP_FAILED",
    };
  }

  if (!data || !data.is_active) {
    return {
      ok: false,
      status: 400,
      error: "Promo code is not valid",
      errorCode: "PROMO_INVALID",
    };
  }

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return {
      ok: false,
      status: 400,
      error: "Promo code has expired",
      errorCode: "PROMO_EXPIRED",
    };
  }

  if (
    data.max_redemptions != null &&
    data.redeemed_count >= data.max_redemptions
  ) {
    return {
      ok: false,
      status: 400,
      error: "Promo code has reached its redemption limit",
      errorCode: "PROMO_LIMIT_REACHED",
    };
  }

  return { ok: true, promo: data };
}

export async function recordPromoRedemption(args: {
  promoCodeId: string;
  activityId: string;
  studentId: string;
  sessionId: string;
  discountCents: number;
  enrollmentId?: string | null;
}): Promise<void> {
  const { error: insertError } = await supabaseAdmin.from("activity_promo_redemptions").insert({
    promo_code_id: args.promoCodeId,
    activity_id: args.activityId,
    student_id: args.studentId,
    stripe_checkout_session_id: args.sessionId,
    discount_cents: args.discountCents,
    enrollment_id: args.enrollmentId ?? null,
  });
  if (insertError) {
    console.error("activity-promo redemption insert failed", insertError);
    return;
  }

  const { data: promo } = await supabaseAdmin
    .from("activity_promo_codes")
    .select("redeemed_count")
    .eq("id", args.promoCodeId)
    .maybeSingle<{ redeemed_count: number }>();

  const nextCount = (promo?.redeemed_count ?? 0) + 1;
  const { error: updateError } = await supabaseAdmin
    .from("activity_promo_codes")
    .update({ redeemed_count: nextCount, updated_at: new Date().toISOString() })
    .eq("id", args.promoCodeId);

  if (updateError) {
    console.error("activity-promo redeemed_count update failed", updateError);
  }
}
