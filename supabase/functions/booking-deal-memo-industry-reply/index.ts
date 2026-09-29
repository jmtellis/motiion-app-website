import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/http.ts";
import {
  applyIndustryReplies,
  BOOKING_PLATFORM_FEE_BPS,
  type IndustryReplyInput,
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
 * Industry answers every open talent flag (accept change / decline with reason / counter).
 * The memo returns to the talent, who confirms with Accept deal or flags again.
 *
 * Body: { memoId, expectedVersion, replies: [{ moduleCode, reply, counterValue?, declineReason?, note? }] }
 */
serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return handleBookingRequest(req, "booking-deal-memo-industry-reply", async (body) => {
    const user = await requireUser(req, body);
    const { memo, provisions, viewer } = await loadMemoForParty(uuidField(body, "memoId"), user.id);
    if (viewer !== "industry") throw new BookingError("FORBIDDEN", "Only Industry can reply to requested changes.");
    assertVersion(memo, intField(body, "expectedVersion"));
    if (memo.status !== "negotiating" || memo.awaiting_party !== "industry") {
      throw new BookingError("NOT_YOUR_TURN", "Waiting on talent.");
    }

    const result = applyIndustryReplies(provisions, (body.replies ?? []) as IndustryReplyInput[]);
    if (!result.ok) throw new BookingError("INVALID_REPLY", "Respond to each requested change.", result.errors);

    await writeMemo({
      memoId: memo.id,
      expectedVersion: memo.version,
      provisions: result.provisions,
      patch: {
        awaiting_party: "talent",
        agency_clause_enabled: result.provisions.some((p) => p.module_code === "agency_commission" && p.included),
        ...moneyPatch(result.provisions, BOOKING_PLATFORM_FEE_BPS),
      },
      event: {
        action: "industry_replied",
        actor_role: "industry",
        actor_user_id: user.id,
        payload: {
          round: memo.negotiation_round,
          replies: result.provisions.filter((p) => p.industry_reply).map((p) => ({
            module_code: p.module_code,
            reply: p.industry_reply,
          })),
        },
      },
    });
    await notifyParty({ userId: memo.talent_user_id, memoId: memo.id, action: "industry_replied", actorId: user.id });
    return await memoPayload(memo.id, "industry");
  });
});
