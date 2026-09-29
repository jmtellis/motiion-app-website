import type { User } from "npm:@supabase/supabase-js@2.49.8";
import { getAuthenticatedUser } from "./auth.ts";
import { jsonResponse } from "./http.ts";
import { supabaseAdmin } from "./supabase-admin.ts";
import {
  type BookingErrorCode,
  computeBookingFees,
  computeTalentDeal,
  type FieldError,
  isMemoExpired,
  type MemoParty,
  memoStatusChip,
  openFlagCount,
  type ProvisionRecord,
} from "./booking-deal-memo-template.ts";

export type MemoRow = {
  id: string;
  availability_check_request_id: string;
  project_id: string | null;
  industry_user_id: string;
  talent_user_id: string;
  template_key: string;
  template_version: number;
  soft_kind_snapshot: Record<string, unknown>;
  status: string;
  awaiting_party: MemoParty | null;
  negotiation_round: number;
  version: number;
  cover_note: string | null;
  currency: string;
  talent_deal_cents: number;
  platform_fee_bps: number;
  platform_fee_cents: number;
  charge_amount_cents: number;
  agency_clause_enabled: boolean;
  exhibit_a_version: string;
  eor_version: string;
  talent_signed_name: string | null;
  talent_signed_at: string | null;
  industry_signed_name: string | null;
  industry_signed_at: string | null;
  stripe_destination_account_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_charge_id: string | null;
  payment_state: string;
  amount_refunded_cents: number;
  paid_at: string | null;
  declined_by: MemoParty | null;
  decline_reason: string | null;
  decline_note: string | null;
  offered_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  declined_at: string | null;
  cancelled_at: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
};

export type ProvisionRow = ProvisionRecord & { id?: string; memo_id?: string; updated_at?: string };

export type EventRow = {
  id: string;
  actor_user_id: string | null;
  actor_role: string;
  action: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type MemoEvent = {
  action: string;
  actor_role: "industry" | "talent" | "system" | "stripe";
  actor_user_id?: string | null;
  payload?: Record<string, unknown>;
  stripe_event_id?: string | null;
};

const PROVISION_COLUMNS =
  "module_code,section,sort_order,included,value,previous_included,previous_value,state,talent_flag,talent_proposed_value,talent_note,industry_reply,industry_decline_reason,industry_note,updated_at";

const HTTP_STATUS: Record<BookingErrorCode, number> = {
  AVAILABILITY_NOT_ELIGIBLE: 409,
  TEMPLATE_UNSUPPORTED: 422,
  COMMUNITY_NOT_ALLOWED: 403,
  MEMO_EXISTS: 409,
  REQUIRED_MODULES_MISSING: 422,
  RELEASE_NOT_APPROVED: 422,
  INVALID_MODULE_VALUE: 400,
  INVALID_FLAG: 400,
  INVALID_REPLY: 400,
  NOT_YOUR_TURN: 409,
  MEMO_NOT_READY: 409,
  MEMO_EXPIRED: 409,
  MEMO_CONFLICT: 409,
  SIGNATURE_REQUIRED: 400,
  CONNECT_ONBOARDING_REQUIRED: 409,
  ALREADY_PAID: 409,
  FEE_MISMATCH: 409,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
};

export class BookingError extends Error {
  constructor(
    readonly code: BookingErrorCode,
    message: string,
    readonly fieldErrors: FieldError[] = [],
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export function bookingErrorResponse(err: BookingError): Response {
  return jsonResponse(
    {
      error: err.message,
      errorCode: err.code,
      ...(err.fieldErrors.length ? { fieldErrors: err.fieldErrors } : {}),
      ...err.extra,
    },
    HTTP_STATUS[err.code] ?? 400,
  );
}

/** Shared wrapper: OPTIONS/POST handling, JSON body, typed error responses. */
export async function handleBookingRequest(
  req: Request,
  label: string,
  handler: (body: Record<string, unknown>) => Promise<Response>,
): Promise<Response> {
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
  } catch {
    body = {};
  }
  try {
    return await handler(body);
  } catch (err) {
    if (err instanceof BookingError) return bookingErrorResponse(err);
    console.error(`${label} failed`, err);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
}

export async function requireUser(req: Request, body: Record<string, unknown>): Promise<User> {
  const token = typeof body.accessToken === "string" ? body.accessToken : null;
  const user = await getAuthenticatedUser(req, token);
  if (!user) throw new BookingError("FORBIDDEN", "Sign in to continue.");
  return user;
}

export function stringField(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function intField(body: Record<string, unknown>, key: string): number | null {
  const value = body[key];
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidField(body: Record<string, unknown>, key: string): string | null {
  const value = stringField(body, key);
  return value && UUID.test(value) ? value.toLowerCase() : null;
}

export async function loadShells(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("enabled_shells")
    .eq("user_id", userId)
    .maybeSingle<{ enabled_shells: string[] | null }>();
  if (error) throw error;
  return data?.enabled_shells ?? [];
}

export async function requireIndustryAccount(userId: string): Promise<void> {
  const shells = await loadShells(userId);
  if (shells.includes("community") || !shells.includes("lookingForTalent")) {
    throw new BookingError("COMMUNITY_NOT_ALLOWED", "Booking is available to Industry accounts.");
  }
}

export async function loadMemo(memoId: string): Promise<{ memo: MemoRow; provisions: ProvisionRow[] } | null> {
  const { data: memo, error } = await supabaseAdmin
    .from("booking_deal_memos")
    .select("*")
    .eq("id", memoId)
    .maybeSingle<MemoRow>();
  if (error) throw error;
  if (!memo) return null;
  const { data: provisions, error: provisionsError } = await supabaseAdmin
    .from("booking_deal_memo_provisions")
    .select(PROVISION_COLUMNS)
    .eq("memo_id", memoId)
    .order("sort_order", { ascending: true });
  if (provisionsError) throw provisionsError;
  return { memo, provisions: (provisions ?? []) as ProvisionRow[] };
}

/** Loads a memo the caller is a party to. Talent never sees drafts (matches RLS). */
export async function loadMemoForParty(memoId: string | null, userId: string) {
  if (!memoId) throw new BookingError("NOT_FOUND", "Deal memo not found.");
  const loaded = await loadMemo(memoId);
  if (!loaded) throw new BookingError("NOT_FOUND", "Deal memo not found.");
  const { memo } = loaded;
  let viewer: MemoParty | null = null;
  if (memo.industry_user_id === userId) viewer = "industry";
  else if (memo.talent_user_id === userId && memo.status !== "draft") viewer = "talent";
  if (!viewer) throw new BookingError("NOT_FOUND", "Deal memo not found.");
  return { ...loaded, viewer };
}

export function assertVersion(memo: MemoRow, expected: number | null) {
  if (expected != null && expected !== memo.version) {
    throw new BookingError("MEMO_CONFLICT", "This deal memo changed. Refresh to see the latest version.", [], {
      version: memo.version,
    });
  }
}

function toProvisionPayload(p: ProvisionRecord) {
  return {
    module_code: p.module_code,
    section: p.section,
    sort_order: p.sort_order,
    included: p.included,
    value: p.value,
    previous_included: p.previous_included,
    previous_value: p.previous_value,
    state: p.state,
    talent_flag: p.talent_flag,
    talent_proposed_value: p.talent_proposed_value,
    talent_note: p.talent_note,
    industry_reply: p.industry_reply,
    industry_decline_reason: p.industry_decline_reason,
    industry_note: p.industry_note,
  };
}

function mapDbError(error: { message?: string; code?: string; details?: string }): never {
  const message = `${error.message ?? ""} ${error.details ?? ""}`;
  if (message.includes("MEMO_CONFLICT")) {
    throw new BookingError("MEMO_CONFLICT", "This deal memo changed. Refresh to see the latest version.");
  }
  if (message.includes("NOT_FOUND")) throw new BookingError("NOT_FOUND", "Deal memo not found.");
  if (message.includes("AVAILABILITY_NOT_ELIGIBLE")) {
    throw new BookingError("AVAILABILITY_NOT_ELIGIBLE", "Booking starts from a confirmed availability request.");
  }
  if (message.includes("COMMUNITY_NOT_ALLOWED")) {
    throw new BookingError("COMMUNITY_NOT_ALLOWED", "Booking is available to Industry accounts.");
  }
  if (message.includes("booking_deal_memos_active_availability_uidx")) {
    throw new BookingError("MEMO_EXISTS", "A deal memo is already open for this availability request.");
  }
  if (message.includes("booking_deal_memo_terms_locked") || message.includes("booking_deal_memo_terminal")) {
    throw new BookingError("MEMO_NOT_READY", "This deal memo can no longer be changed.");
  }
  if (message.includes("booking_deal_memo_payment_locked")) {
    throw new BookingError("ALREADY_PAID", "This booking is already paid.");
  }
  if (message.includes("booking_deal_memo_invalid_transition")) {
    throw new BookingError("NOT_YOUR_TURN", "That action isn't available right now.");
  }
  throw Object.assign(new Error(error.message ?? "booking_deal_memo_write failed"), { cause: error });
}

export async function writeMemo(input: {
  memoId: string | null;
  expectedVersion?: number | null;
  create?: Record<string, unknown> | null;
  patch?: Record<string, unknown> | null;
  provisions?: ProvisionRecord[] | null;
  event?: MemoEvent | null;
}): Promise<MemoRow> {
  const { data, error } = await supabaseAdmin.rpc("booking_deal_memo_write", {
    p_memo_id: input.memoId,
    p_expected_version: input.expectedVersion ?? null,
    p_create: input.create ?? null,
    p_patch: input.patch ?? null,
    p_provisions: input.provisions ? input.provisions.map(toProvisionPayload) : null,
    p_event: input.event ?? null,
  });
  if (error) mapDbError(error);
  return data as MemoRow;
}

/** Live money preview; the snapshot on the memo row is authoritative once Ready for payment. */
export function moneyPatch(provisions: ProvisionRecord[], platformFeeBps: number) {
  const deal = computeTalentDeal(provisions);
  const fees = computeBookingFees(deal.talentDealCents, platformFeeBps);
  return {
    talent_deal_cents: fees.talentDealCents,
    platform_fee_bps: fees.platformFeeBps,
    platform_fee_cents: fees.platformFeeCents,
    charge_amount_cents: fees.chargeAmountCents,
  };
}

export async function loadEvents(memoId: string): Promise<EventRow[]> {
  const { data, error } = await supabaseAdmin
    .from("booking_deal_memo_events")
    .select("id,actor_user_id,actor_role,action,payload,created_at")
    .eq("memo_id", memoId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function talentPayoutReady(talentUserId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("booking_payout_accounts")
    .select("stripe_transfers_status")
    .eq("user_id", talentUserId)
    .maybeSingle<{ stripe_transfers_status: string }>();
  if (error) throw error;
  return data?.stripe_transfers_status === "active";
}

const CLIENT_MEMO_OMIT = new Set(["idempotency_key", "stripe_destination_account_id", "stripe_charge_id"]);

/** Response contract shared by every booking-deal-memo-* function (web + iOS). */
export async function memoPayload(memoId: string, viewer: MemoParty, extra: Record<string, unknown> = {}) {
  const loaded = await loadMemo(memoId);
  if (!loaded) throw new BookingError("NOT_FOUND", "Deal memo not found.");
  const { memo, provisions } = loaded;
  const [events, payoutReady] = await Promise.all([loadEvents(memoId), talentPayoutReady(memo.talent_user_id)]);
  const deal = computeTalentDeal(provisions);
  const clientMemo = Object.fromEntries(Object.entries(memo).filter(([key]) => !CLIENT_MEMO_OMIT.has(key)));
  return jsonResponse({
    memo: clientMemo,
    provisions,
    events,
    viewer,
    chip: memoStatusChip(memo, viewer),
    expired: isMemoExpired(memo),
    openFlags: openFlagCount(provisions),
    dealLines: deal.lines,
    fees: {
      talentDealCents: memo.talent_deal_cents,
      platformFeeBps: memo.platform_fee_bps,
      platformFeeCents: memo.platform_fee_cents,
      chargeAmountCents: memo.charge_amount_cents,
      talentReceivesCents: memo.talent_deal_cents,
      currency: memo.currency,
    },
    payoutReady,
    ...extra,
  });
}

const NOTIFY_COPY: Record<string, { title: string; body: string }> = {
  sent: { title: "New deal memo", body: "You have a booking offer to review." },
  talent_flagged: { title: "Changes requested", body: "Talent requested changes to your deal memo." },
  industry_replied: { title: "Deal memo updated", body: "Industry responded to your requested changes." },
  talent_accepted: { title: "Ready for payment", body: "Talent accepted your deal memo. Pay to book." },
  declined: { title: "Deal memo declined", body: "Talent declined the deal memo." },
  cancelled: { title: "Deal memo canceled", body: "Industry canceled the deal memo." },
  payment_succeeded: { title: "Booked", body: "Payment is complete. You're booked." },
  call_requested: { title: "Call requested", body: "A call was requested about a deal memo." },
};

/**
 * Best-effort in-app + push notification; never fails the request.
 * `data.recipient_role` lets clients route to the talent or industry view of the memo.
 */
export async function notifyParty(input: {
  memo: Pick<MemoRow, "id" | "talent_user_id" | "industry_user_id">;
  to: MemoParty;
  action: string;
  actorId: string | null;
}) {
  const copy = NOTIFY_COPY[input.action];
  if (!copy) return;
  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: input.to === "talent" ? input.memo.talent_user_id : input.memo.industry_user_id,
    type: "booking_deal_memo",
    title: copy.title,
    body: copy.body,
    data: { memo_id: input.memo.id, action: input.action, actor_id: input.actorId, recipient_role: input.to },
  });
  if (error) console.warn("booking notification insert failed", { memoId: input.memo.id, error });
}

export function otherRole(viewer: MemoParty): MemoParty {
  return viewer === "industry" ? "talent" : "industry";
}
