import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/http.ts";
import {
  applyTalentFlags,
  BOOKING_NOTE_MAX,
  cleanNote,
  isMemoExpired,
  TERMINAL_MEMO_STATUSES,
  type TalentFlagInput,
} from "../_shared/booking-deal-memo-template.ts";
import {
  assertVersion,
  BookingError,
  handleBookingRequest,
  intField,
  loadMemoForParty,
  memoPayload,
  notifyParty,
  otherParty,
  requireUser,
  uuidField,
  writeMemo,
} from "../_shared/booking-deal-memo-store.ts";

/**
 * Talent review: request structured changes, or ask for a call (either party).
 *
 * Body: { memoId, expectedVersion, action?: "flag" | "request_call",
 *         flags?: [{ moduleCode, flag: "accept"|"remove"|"add"|"dispute", proposedValue?, note? }], note? }
 */
serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return handleBookingRequest(req, "booking-deal-memo-flag", async (body) => {
    const user = await requireUser(req, body);
    const { memo, provisions, viewer } = await loadMemoForParty(uuidField(body, "memoId"), user.id);
    assertVersion(memo, intField(body, "expectedVersion"));

    if (body.action === "request_call") {
      if ((TERMINAL_MEMO_STATUSES as readonly string[]).includes(memo.status) || memo.status === "draft") {
        throw new BookingError("NOT_YOUR_TURN", "Calls can be requested while the deal is open.");
      }
      if (typeof body.note === "string" && body.note.trim().length > BOOKING_NOTE_MAX) {
        throw new BookingError("INVALID_FLAG", `Notes are limited to ${BOOKING_NOTE_MAX} characters.`);
      }
      await writeMemo({
        memoId: memo.id,
        event: { action: "call_requested", actor_role: viewer, actor_user_id: user.id, payload: { note: cleanNote(body.note) } },
      });
      await notifyParty({ userId: otherParty(memo, viewer), memoId: memo.id, action: "call_requested", actorId: user.id });
      return await memoPayload(memo.id, viewer);
    }

    if (viewer !== "talent") throw new BookingError("FORBIDDEN", "Only the talent can request changes.");
    if (isMemoExpired(memo)) throw new BookingError("MEMO_EXPIRED", "This deal memo has expired.");
    if (!["offered", "negotiating"].includes(memo.status) || memo.awaiting_party !== "talent") {
      throw new BookingError("NOT_YOUR_TURN", "Waiting on Industry.");
    }

    const result = applyTalentFlags(provisions, (body.flags ?? []) as TalentFlagInput[]);
    if (!result.ok) throw new BookingError("INVALID_FLAG", "Check your requested changes.", result.errors);

    await writeMemo({
      memoId: memo.id,
      expectedVersion: memo.version,
      provisions: result.provisions,
      patch: { status: "negotiating", awaiting_party: "industry", negotiation_round: memo.negotiation_round + 1 },
      event: {
        action: "talent_flagged",
        actor_role: "talent",
        actor_user_id: user.id,
        payload: {
          round: memo.negotiation_round + 1,
          modules: result.provisions.filter((p) => p.state === "change_requested").map((p) => ({
            module_code: p.module_code,
            flag: p.talent_flag,
          })),
        },
      },
    });
    await notifyParty({ userId: memo.industry_user_id, memoId: memo.id, action: "talent_flagged", actorId: user.id });
    return await memoPayload(memo.id, "talent");
  });
});
