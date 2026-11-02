import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/http.ts";
import { supabaseAdmin } from "../_shared/supabase-admin.ts";
import {
  agreementCounselGate,
  type AvailabilityForMemo,
  BOOKING_NOTE_MAX,
  BOOKING_PLATFORM_FEE_BPS,
  BOOKING_TEMPLATE_VERSION,
  type BookingForMemo,
  type BookingTemplateKey,
  type ComposeModuleInput,
  composeProvisions,
  decideDealMemoCreate,
  isBookingTemplateKey,
  isOpenAgreementStatus,
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
 * Body: { availabilityRequestId? , bookingId? , memoId + expectedVersion (edit draft),
 *         templateKey?, coverNote?, modules: [{ moduleCode, included?, value? }], send?, idempotencyKey? }
 *
 * Tour still requires a confirmed availability request. Other templates may be created from
 * bookingId alone. Draft counsel templates cannot be created or sent. An active executed-contract
 * upload blocks a new memo and does not change participation or payment.
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

    const memoId = uuidField(body, "memoId");
    let existing: { memo: MemoRow; viewer: "industry" | "talent" } | null = null;
    if (memoId) {
      const loaded = await loadMemoForParty(memoId, user.id);
      if (loaded.viewer !== "industry") throw new BookingError("NOT_FOUND", "Deal memo not found.");
      if (loaded.memo.status !== "draft") throw new BookingError("NOT_YOUR_TURN", "Only drafts can be edited.");
      assertVersion(loaded.memo, intField(body, "expectedVersion"));
      existing = loaded;
    }

    const bookingId = uuidField(body, "bookingId");
    const booking = bookingId ? await loadOwnedBooking(bookingId, user.id) : null;
    if (bookingId && !booking) throw new BookingError("NOT_FOUND", "Booking not found.");
    const availabilityId = uuidField(body, "availabilityRequestId") ?? booking?.availability_check_request_id ?? null;

    let templateKey: BookingTemplateKey;
    let project: { id: string; enabled_modules: Record<string, unknown> | null } | null = null;
    if (existing) {
      if (!isBookingTemplateKey(existing.memo.template_key)) {
        throw new BookingError("TEMPLATE_UNSUPPORTED", "That agreement type is not available.");
      }
      templateKey = existing.memo.template_key;
    } else {
      if (availabilityId) {
        const availability = await loadAvailability(availabilityId);
        if (availability?.project_id) project = await loadProject(availability.project_id);
      } else if (booking?.project_id) {
        project = await loadProject(booking.project_id);
      }
      const template = resolveBookingTemplate({ requestedKey: stringField(body, "templateKey"), project });
      if (!template.ok) throw new BookingError("TEMPLATE_UNSUPPORTED", template.message);
      templateKey = template.templateKey;
    }

    const { provisions, errors } = composeProvisions(body.modules as ComposeModuleInput[] | undefined, templateKey);
    if (errors.length) throw new BookingError("INVALID_MODULE_VALUE", "Fix the highlighted fields.", errors);

    if (send) {
      const gate = validateForSend(provisions, templateKey);
      if (!gate.ok) {
        const message = gate.code === "RELEASE_NOT_APPROVED"
          ? "Talent release must be approved before you send."
          : "Complete the required modules before you send.";
        throw new BookingError(gate.code ?? "REQUIRED_MODULES_MISSING", message, gate.errors);
      }
    }

    const legalStatus = await loadLegalStatus(templateKey);
    if (send || !existing) {
      const counsel = agreementCounselGate(legalStatus);
      if (!counsel.ok) throw new BookingError(counsel.code, counsel.message);
    }

    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = {
      cover_note: rawNote || null,
      agency_clause_enabled: provisions.some((p) => p.module_code === "agency_commission" && p.included),
      ...moneyPatch(provisions, BOOKING_PLATFORM_FEE_BPS),
    };
    if (send) Object.assign(patch, { status: "offered", awaiting_party: "talent", offered_at: nowIso, negotiation_round: 0 });

    let memo: MemoRow;
    if (existing) {
      memo = await writeMemo({
        memoId,
        expectedVersion: existing.memo.version,
        patch,
        provisions,
        event: send ? { action: "sent", actor_role: "industry", actor_user_id: user.id } : null,
      });
    } else {
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

      const availability = availabilityId ? await loadAvailability(availabilityId) : null;
      const openMemoId = await openMemoIdFor({
        availabilityId: availability?.id ?? null,
        booking,
      });
      const decision = decideDealMemoCreate({
        requesterId: user.id,
        templateKey,
        legalStatus,
        availability,
        booking,
        activeExecutedContract: booking ? await hasActiveExecutedContract(booking.id) : false,
        openMemoId,
      });
      if (!decision.ok) throw new BookingError(decision.code, decision.message, [], decision.extra);
      if (decision.availabilityRequestId) await cancelStaleIntentsForAvailability(decision.availabilityRequestId);

      const template = resolveBookingTemplate({
        requestedKey: templateKey,
        project: project ?? (booking?.project_id ? await loadProject(booking.project_id) : null),
      });
      if (!template.ok) throw new BookingError("TEMPLATE_UNSUPPORTED", template.message);

      memo = await writeMemo({
        memoId: null,
        create: {
          availability_check_request_id: decision.availabilityRequestId,
          booking_id: decision.bookingId,
          industry_user_id: user.id,
          talent_user_id: decision.talentUserId,
          project_id: decision.projectId,
          template_key: decision.templateKey,
          template_version: BOOKING_TEMPLATE_VERSION,
          soft_kind_snapshot: template.softKind,
          idempotency_key: idempotencyKey,
        },
        patch,
        provisions,
        event: { action: send ? "sent" : "draft_saved", actor_role: "industry", actor_user_id: user.id },
      });
    }

    if (send) await notifyParty({ memo, to: "talent", action: "sent", actorId: user.id });
    return await memoPayload(memo.id, "industry");
  });
});

async function loadLegalStatus(templateKey: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("booking_contract_templates")
    .select("legal_status")
    .eq("template_key", templateKey)
    .maybeSingle<{ legal_status: string }>();
  if (error) throw error;
  return data?.legal_status ?? null;
}

async function loadAvailability(id: string): Promise<AvailabilityForMemo | null> {
  const { data, error } = await supabaseAdmin
    .from("availability_check_requests")
    .select("id,requester_id,talent_id,status,response_kind,project_id")
    .eq("id", id)
    .maybeSingle<AvailabilityForMemo>();
  if (error) throw error;
  return data;
}

async function loadOwnedBooking(id: string, industryUserId: string): Promise<BookingForMemo | null> {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id,industry_user_id,talent_user_id,project_id,availability_check_request_id,deal_memo_id")
    .eq("id", id)
    .maybeSingle<BookingForMemo>();
  if (error) throw error;
  if (!data || data.industry_user_id !== industryUserId) return null;
  return data;
}

async function loadProject(id: string) {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id,enabled_modules")
    .eq("id", id)
    .maybeSingle<{ id: string; enabled_modules: Record<string, unknown> | null }>();
  if (error) throw error;
  return data;
}

async function hasActiveExecutedContract(bookingId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("booking_executed_contracts")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("status", "active")
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

async function openMemoIdFor(input: {
  availabilityId: string | null;
  booking: BookingForMemo | null;
}): Promise<string | null> {
  if (input.availabilityId) {
    const { data, error } = await supabaseAdmin
      .from("booking_deal_memos")
      .select("id,status")
      .eq("availability_check_request_id", input.availabilityId)
      .not("status", "in", "(declined,cancelled,expired)")
      .limit(1);
    if (error) throw error;
    const row = (data ?? [])[0] as { id: string } | undefined;
    if (row) return row.id;
  }
  if (!input.booking) return null;
  const { data, error } = await supabaseAdmin
    .from("booking_deal_memos")
    .select("id,status")
    .eq("booking_id", input.booking.id)
    .not("status", "in", "(declined,cancelled,expired)")
    .limit(1);
  if (error) throw error;
  const byBooking = (data ?? [])[0] as { id: string } | undefined;
  if (byBooking) return byBooking.id;
  if (!input.booking.deal_memo_id) return null;
  const { data: linked, error: linkedError } = await supabaseAdmin
    .from("booking_deal_memos")
    .select("id,status")
    .eq("id", input.booking.deal_memo_id)
    .maybeSingle<{ id: string; status: string }>();
  if (linkedError) throw linkedError;
  return linked && isOpenAgreementStatus(linked.status) ? linked.id : null;
}
