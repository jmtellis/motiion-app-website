import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/http.ts";
import {
  acceptAllProvisions,
  BOOKING_MAX_CHARGE_CENTS,
  BOOKING_MIN_DEAL_CENTS,
  BOOKING_PLATFORM_FEE_BPS,
  cleanSignature,
  EOR_PLACEHOLDER_VERSION,
  EXHIBIT_A_PLACEHOLDER_VERSION,
  openFlagCount,
  readyExpiry,
  validateForSend,
} from "../_shared/booking-deal-memo-template.ts";
import {
  assertVersion,
  BookingError,
  handleBookingRequest,
  intField,
  loadMemoForParty,
  memoPayload,
  moneyPatch,
  notifyParty,
  requireUser,
  uuidField,
  writeMemo,
} from "../_shared/booking-deal-memo-store.ts";

/**
 * Talent Accept deal (typed-name signature). Freezes the money snapshot and legal versions and
 * moves the memo to Ready for payment (`payment_pending`) for 7 days. Talent payout onboarding
 * is not required here; Pay is gated on it instead.
 *
 * Body: { memoId, expectedVersion, signatureName }
 */
serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return handleBookingRequest(req, "booking-deal-memo-accept", async (body) => {
    const user = await requireUser(req, body);
    const { memo, provisions, viewer } = await loadMemoForParty(uuidField(body, "memoId"), user.id);
    if (viewer !== "talent") throw new BookingError("FORBIDDEN", "Only the talent can accept the deal.");
    assertVersion(memo, intField(body, "expectedVersion"));
    if (!["offered", "negotiating"].includes(memo.status) || memo.awaiting_party !== "talent") {
      throw new BookingError("NOT_YOUR_TURN", "Waiting on Industry.");
    }
    if (openFlagCount(provisions) > 0) throw new BookingError("NOT_YOUR_TURN", "Requested changes are still open.");

    const signature = cleanSignature(body.signatureName);
    if (!signature) throw new BookingError("SIGNATURE_REQUIRED", "Type your full name to sign.");

    const gate = validateForSend(provisions);
    if (!gate.ok) {
      throw new BookingError(gate.code ?? "REQUIRED_MODULES_MISSING", "This deal memo is missing required terms.", gate.errors);
    }
    const money = moneyPatch(provisions, BOOKING_PLATFORM_FEE_BPS);
    if (money.talent_deal_cents < BOOKING_MIN_DEAL_CENTS || money.charge_amount_cents > BOOKING_MAX_CHARGE_CENTS) {
      throw new BookingError("FEE_MISMATCH", "The deal amount is outside card limits.");
    }

    const now = new Date();
    await writeMemo({
      memoId: memo.id,
      expectedVersion: memo.version,
      provisions: acceptAllProvisions(provisions),
      patch: {
        status: "payment_pending",
        awaiting_party: null,
        accepted_at: now.toISOString(),
        expires_at: readyExpiry(now),
        talent_signed_name: signature,
        talent_signed_at: now.toISOString(),
        exhibit_a_version: EXHIBIT_A_PLACEHOLDER_VERSION,
        eor_version: EOR_PLACEHOLDER_VERSION,
        agency_clause_enabled: provisions.some((p) => p.module_code === "agency_commission" && p.included),
        ...money,
      },
      event: {
        action: "talent_accepted",
        actor_role: "talent",
        actor_user_id: user.id,
        payload: { talent_deal_cents: money.talent_deal_cents, charge_amount_cents: money.charge_amount_cents },
      },
    });
    await notifyParty({ userId: memo.industry_user_id, memoId: memo.id, action: "talent_accepted", actorId: user.id });
    return await memoPayload(memo.id, "talent");
  });
});
