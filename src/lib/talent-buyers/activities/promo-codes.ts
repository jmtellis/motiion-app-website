import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { getStripeClient } from "@/lib/billing/stripe";
import { dollarsToCents } from "@/lib/talent-buyers/activities/defaults";
import type { ActivityDraft, DraftPromoCode } from "@/lib/talent-buyers/activities/types";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function applyPromoToBaseCents(
  baseAmountCents: number,
  promo: { discount_type: string; discount_value: number },
): { discountedBaseCents: number; discountCents: number } {
  const base = Math.max(0, Math.round(baseAmountCents));
  let discountCents = 0;
  if (promo.discount_type === "percent") {
    const pct = Math.min(100, Math.max(0, promo.discount_value));
    discountCents = Math.round((base * pct) / 100);
  } else {
    discountCents = Math.min(base, Math.max(0, Math.round(promo.discount_value)));
  }
  const discountedBaseCents = Math.max(50, base - discountCents);
  // If discount would push below Stripe minimum, clamp and recompute discount.
  discountCents = base - discountedBaseCents;
  return { discountedBaseCents, discountCents };
}

export async function loadPromoCodesForDraft(
  supabase: SupabaseClient,
  activityId: string,
): Promise<DraftPromoCode[]> {
  const { data } = await supabase
    .from("activity_promo_codes")
    .select(
      "id,code,discount_type,discount_value,max_redemptions,expires_at,is_active,sort_order",
    )
    .eq("activity_id", activityId)
    .order("sort_order", { ascending: true });

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const discountType = row.discount_type === "fixed_cents" ? "fixed_cents" : "percent";
    const rawValue = Number(row.discount_value ?? 0);
    return {
      id: String(row.id),
      persistedId: String(row.id),
      code: String(row.code ?? ""),
      discountType,
      discountValue:
        discountType === "fixed_cents" ? Math.max(0.5, rawValue / 100) : Math.max(1, rawValue),
      maxRedemptions: (row.max_redemptions as number | null) ?? null,
      expiresAt: row.expires_at ? String(row.expires_at).slice(0, 10) : "",
      isActive: row.is_active !== false,
    };
  });
}

async function upsertStripeCoupon(
  stripe: Stripe,
  activityId: string,
  promo: DraftPromoCode,
  existingCouponId: string | null,
): Promise<{ couponId: string; promotionCodeId: string } | { error: string }> {
  const code = normalizeCode(promo.code);
  if (!code) return { error: "Promo code is required." };

  const couponParams: Stripe.CouponCreateParams = {
    name: `${code} · ${activityId.slice(0, 8)}`,
    duration: "once",
    metadata: {
      activity_id: activityId,
      motiion_promo_code: code,
    },
  };

  if (promo.discountType === "percent") {
    couponParams.percent_off = Math.min(100, Math.max(1, Math.round(promo.discountValue)));
  } else {
    couponParams.amount_off = dollarsToCents(promo.discountValue);
    couponParams.currency = "usd";
  }

  let couponId = existingCouponId;
  if (!couponId) {
    const coupon = await stripe.coupons.create(couponParams);
    couponId = coupon.id;
  }

  const promotion = await stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon: couponId },
    code,
    active: promo.isActive,
    max_redemptions: promo.maxRedemptions ?? undefined,
    expires_at: promo.expiresAt
      ? Math.floor(new Date(`${promo.expiresAt}T23:59:59Z`).getTime() / 1000)
      : undefined,
    metadata: {
      activity_id: activityId,
      motiion_promo_code: code,
    },
  });

  return { couponId, promotionCodeId: promotion.id };
}

export async function syncActivityPromoCodes(
  supabase: SupabaseClient,
  activityId: string,
  draft: ActivityDraft,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (draft.type !== "event" || !draft.isPaid) {
    return { ok: true };
  }

  const stripe = getStripeClient();
  const desired = draft.promoCodes
    .map((promo) => ({ ...promo, code: normalizeCode(promo.code) }))
    .filter((promo) => promo.code.length >= 3);

  const { data: existing } = await supabase
    .from("activity_promo_codes")
    .select("id,code,stripe_coupon_id,stripe_promotion_code_id")
    .eq("activity_id", activityId);

  const existingRows = (existing ?? []) as {
    id: string;
    code: string;
    stripe_coupon_id: string | null;
    stripe_promotion_code_id: string | null;
  }[];
  const existingById = new Map(existingRows.map((row) => [row.id, row]));
  const keepIds = new Set(
    desired.map((promo) => promo.persistedId).filter((id): id is string => Boolean(id)),
  );

  for (const row of existingRows) {
    if (!keepIds.has(row.id)) {
      if (stripe && row.stripe_promotion_code_id) {
        try {
          await stripe.promotionCodes.update(row.stripe_promotion_code_id, { active: false });
        } catch (error) {
          console.warn("[promos] deactivate stripe promotion", error);
        }
      }
      await supabase
        .from("activity_promo_codes")
        .update({ is_active: false })
        .eq("id", row.id);
    }
  }

  for (let index = 0; index < desired.length; index += 1) {
    const promo = desired[index];
    const existingRow = promo.persistedId ? existingById.get(promo.persistedId) : null;
    const discountValue =
      promo.discountType === "fixed_cents"
        ? dollarsToCents(promo.discountValue)
        : Math.min(100, Math.max(1, Math.round(promo.discountValue)));

    let stripeCouponId = existingRow?.stripe_coupon_id ?? null;
    let stripePromotionCodeId = existingRow?.stripe_promotion_code_id ?? null;

    if (stripe) {
      try {
        // Always mint a fresh promotion code when code text changes; deactivate old.
        if (
          existingRow?.stripe_promotion_code_id &&
          existingRow.code !== promo.code
        ) {
          await stripe.promotionCodes.update(existingRow.stripe_promotion_code_id, {
            active: false,
          });
          stripeCouponId = null;
          stripePromotionCodeId = null;
        }

        if (!stripePromotionCodeId || !existingRow || existingRow.code !== promo.code) {
          const created = await upsertStripeCoupon(
            stripe,
            activityId,
            promo,
            stripeCouponId,
          );
          if ("error" in created) return { ok: false, error: created.error };
          stripeCouponId = created.couponId;
          stripePromotionCodeId = created.promotionCodeId;
        } else if (stripePromotionCodeId) {
          await stripe.promotionCodes.update(stripePromotionCodeId, {
            active: promo.isActive,
          });
        }
      } catch (error) {
        console.error("[promos] stripe sync", error);
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not sync promo code with Stripe.",
        };
      }
    }

    const payload = {
      activity_id: activityId,
      code: promo.code,
      discount_type: promo.discountType,
      discount_value: discountValue,
      max_redemptions: promo.maxRedemptions,
      expires_at: promo.expiresAt ? `${promo.expiresAt}T23:59:59Z` : null,
      is_active: promo.isActive,
      sort_order: index,
      stripe_coupon_id: stripeCouponId,
      stripe_promotion_code_id: stripePromotionCodeId,
      updated_at: new Date().toISOString(),
    };

    if (existingRow) {
      const { error } = await supabase
        .from("activity_promo_codes")
        .update(payload)
        .eq("id", existingRow.id);
      if (error) {
        console.error("[promos] update", error.message);
        return { ok: false, error: "Could not save promo codes." };
      }
    } else {
      const { error } = await supabase.from("activity_promo_codes").insert(payload);
      if (error) {
        console.error("[promos] insert", error.message);
        if (error.message.toLowerCase().includes("duplicate")) {
          return { ok: false, error: `Promo code ${promo.code} is already in use for this event.` };
        }
        return { ok: false, error: "Could not save promo codes." };
      }
    }
  }

  return { ok: true };
}
