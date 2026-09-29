import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/http.ts";
import { supabaseAdmin } from "../_shared/supabase-admin.ts";
import {
  BOOKING_NOTE_MAX,
  BOOKING_PLATFORM_FEE_BPS,
  BOOKING_TEMPLATE_VERSION,
  type ComposeModuleInput,
  composeProvisions,
  isAvailabilityEligible,
  resolveBookingTemplate,
  validateForSend,
} from "../_shared/booking-deal-memo-template.ts";
import {
  assertVersion,
  BookingError,
  handleBookingRequest,
  intField,
  loadMemoForParty,
  memoPayload,
  type MemoRow,
  moneyPatch,
  notifyParty,
  requireIndustryAccount,
  requireUser,
  stringField,
  uuidField,
  writeMemo,
} from "../_shared/booking-deal-memo-store.ts";
import { cancelStaleIntentsForAvailability } from "../_shared/booking-payments.ts";

/**
 * Industry compose: create or update a draft, optionally Send (`send: true`).
 *
 * Body: { availabilityRequestId (new memo) | memoId + expectedVersion (edit draft),
 *         templateKey?, coverNote?, modules: [{ moduleCode, included?, value? }], send?, idempotencyKey? }
 */
serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return handleBookingRequest(req, "booking-deal-memo-create", async (body) => {
    const user = await requireUser(req, body);
    await requireIndustryAccount(user.id);

    const send = body.send === true;
    const rawNote = typeof body.coverNote === "string" ? body.coverNote.trim() : "";
    if (rawNote.length > BOOKING_NOTE_MAX) {
      throw new BookingError("INVALID_MODULE_VALUE", `Notes are limited to ${BOOKING_NOTE_MAX} characters.`, [
        { moduleCode: "", field: "coverNote", message: `Notes are limited to ${BOOKING_NOTE_MAX} characters.` },
      ]);
    }
    const { provisions, errors } = composeProvisions(body.modules as ComposeModuleInput[] | undefined);
    if (errors.length) throw new BookingError("INVALID_MODULE_VALUE", "Fix the highlighted fields.", errors);

    if (send) {
      const gate = validateForSend(provisions);
      if (!gate.ok) {
        const message = gate.code === "RELEASE_NOT_APPROVED"
          ? "Talent release must be approved before you send."
          : "Complete the required modules before you send.";
        throw new BookingError(gate.code ?? "REQUIRED_MODULES_MISSING", message, gate.errors);
      }
    }

    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = {
      cover_note: rawNote || null,
      agency_clause_enabled: provisions.some((p) => p.module_code === "agency_commission" && p.included),
      ...moneyPatch(provisions, BOOKING_PLATFORM_FEE_BPS),
    };
    if (send) Object.assign(patch, { status: "offered", awaiting_party: "talent", offered_at: nowIso, negotiation_round: 0 });

    let memo: MemoRow;
    const memoId = uuidField(body, "memoId");
    if (memoId) {
      const loaded = await loadMemoForParty(memoId, user.id);
      if (loaded.viewer !== "industry") throw new BookingError("NOT_FOUND", "Deal memo not found.");
      if (loaded.memo.status !== "draft") throw new BookingError("NOT_YOUR_TURN", "Only drafts can be edited.");
      assertVersion(loaded.memo, intField(body, "expectedVersion"));
      memo = await writeMemo({
        memoId,
        expectedVersion: loaded.memo.version,
        patch,
        provisions,
        event: send ? { action: "sent", actor_role: "industry", actor_user_id: user.id } : null,
      });
    } else {
      const availabilityId = uuidField(body, "availabilityRequestId");
      if (!availabilityId) {
        throw new BookingError("AVAILABILITY_NOT_ELIGIBLE", "Booking starts from a confirmed availability request.");
      }
      const { data: availability, error: availabilityError } = await supabaseAdmin
        .from("availability_check_requests")
        .select("id,requester_id,talent_id,status,response_kind,project_id")
        .eq("id", availabilityId)
        .maybeSingle<{
          id: string;
          requester_id: string;
          talent_id: string;
          status: string;
          response_kind: string | null;
          project_id: string | null;
        }>();
      if (availabilityError) throw availabilityError;
      if (!availability || availability.requester_id !== user.id || !isAvailabilityEligible(availability)) {
        throw new BookingError(
          "AVAILABILITY_NOT_ELIGIBLE",
          "Booking starts from an availability request the talent confirmed.",
        );
      }

      let project: { id: string; enabled_modules: Record<string, unknown> | null } | null = null;
      if (availability.project_id) {
        const { data, error } = await supabaseAdmin
          .from("projects")
          .select("id,enabled_modules")
          .eq("id", availability.project_id)
          .maybeSingle<{ id: string; enabled_modules: Record<string, unknown> | null }>();
        if (error) throw error;
        project = data;
      }
      const template = resolveBookingTemplate({ requestedKey: stringField(body, "templateKey"), project });
      if (!template.ok) throw new BookingError("TEMPLATE_UNSUPPORTED", template.message);

      const idempotencyKey = stringField(body, "idempotencyKey");
      if (idempotencyKey && (idempotencyKey.length < 8 || idempotencyKey.length > 128)) {
        throw new BookingError("INVALID_MODULE_VALUE", "idempotencyKey must be 8–128 characters.");
      }
      if (idempotencyKey) {
        const { data: replay, error } = await supabaseAdmin
          .from("booking_deal_memos")
          .select("id")
          .eq("industry_user_id", user.id)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle<{ id: string }>();
        if (error) throw error;
        if (replay) return await memoPayload(replay.id, "industry", { replayed: true });
      }

      const { data: active, error: activeError } = await supabaseAdmin
        .from("booking_deal_memos")
        .select("id,status")
        .eq("availability_check_request_id", availabilityId)
        .not("status", "in", "(declined,cancelled,expired)")
        .maybeSingle<{ id: string; status: string }>();
      if (activeError) throw activeError;
      if (active) {
        throw new BookingError("MEMO_EXISTS", "A deal memo is already open for this availability request.", [], {
          memoId: active.id,
        });
      }
      await cancelStaleIntentsForAvailability(availabilityId);

      memo = await writeMemo({
        memoId: null,
        create: {
          availability_check_request_id: availabilityId,
          industry_user_id: user.id,
          talent_user_id: availability.talent_id,
          project_id: availability.project_id,
          template_key: template.templateKey,
          template_version: BOOKING_TEMPLATE_VERSION,
          soft_kind_snapshot: template.softKind,
          idempotency_key: idempotencyKey,
        },
        patch,
        provisions,
        event: { action: send ? "sent" : "draft_saved", actor_role: "industry", actor_user_id: user.id },
      });
    }

    if (send) await notifyParty({ userId: memo.talent_user_id, memoId: memo.id, action: "sent", actorId: user.id });
    return await memoPayload(memo.id, "industry");
  });
});
