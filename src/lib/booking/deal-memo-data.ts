import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  computeTalentDeal,
  defaultProvisions,
  isMemoExpired,
  type MemoParty,
  memoStatusChip,
  openFlagCount,
  type ProvisionRecord,
} from "@/lib/booking/deal-memo";
import type {
  ConfirmedAvailability,
  DealMemoContext,
  DealMemoEvent,
  DealMemoListItem,
  DealMemoPayload,
  DealMemoRow,
  PayoutStatus,
} from "@/lib/booking/deal-memo-types";

const MEMO_COLUMNS =
  "id,availability_check_request_id,project_id,industry_user_id,talent_user_id,template_key,status,awaiting_party,negotiation_round,version,cover_note,currency,talent_deal_cents,platform_fee_bps,platform_fee_cents,charge_amount_cents,agency_clause_enabled,exhibit_a_version,eor_version,talent_signed_name,talent_signed_at,industry_signed_name,industry_signed_at,payment_state,amount_refunded_cents,paid_at,declined_by,decline_reason,decline_note,offered_at,accepted_at,expires_at,declined_at,cancelled_at,created_at,updated_at";

const PROVISION_COLUMNS =
  "module_code,section,sort_order,included,value,previous_included,previous_value,state,talent_flag,talent_proposed_value,talent_note,industry_reply,industry_decline_reason,industry_note";

type Db = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

function nameFromProfile(row: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
} | undefined): string {
  if (!row) return "Motiion member";
  const display = row.display_name?.trim();
  if (display) return display;
  const full = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return full || row.username?.trim() || "Motiion member";
}

async function profileNames(db: Db, ids: string[]) {
  const names = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return names;
  const { data } = await db
    .from("profiles")
    .select("user_id,display_name,first_name,last_name,username")
    .in("user_id", unique);
  for (const row of data ?? []) names.set(row.user_id as string, nameFromProfile(row));
  return names;
}

function payloadFrom(
  memo: DealMemoRow,
  provisions: ProvisionRecord[],
  events: DealMemoEvent[],
  viewer: MemoParty,
  payoutReady: boolean,
): DealMemoPayload {
  return {
    memo,
    provisions,
    events,
    viewer,
    chip: memoStatusChip(memo, viewer),
    expired: isMemoExpired(memo),
    openFlags: openFlagCount(provisions),
    dealLines: computeTalentDeal(provisions).lines,
    fees: {
      talentDealCents: memo.talent_deal_cents,
      platformFeeBps: memo.platform_fee_bps,
      platformFeeCents: memo.platform_fee_cents,
      chargeAmountCents: memo.charge_amount_cents,
      talentReceivesCents: memo.talent_deal_cents,
      currency: memo.currency,
    },
    payoutReady,
  };
}

export async function loadDealMemoDetail(
  memoId: string,
  viewerId: string,
): Promise<{ payload: DealMemoPayload; context: DealMemoContext } | null> {
  const db = await createServerSupabaseClient();
  if (!db) return null;
  const { data: memo } = await db.from("booking_deal_memos").select(MEMO_COLUMNS).eq("id", memoId).maybeSingle<DealMemoRow>();
  if (!memo) return null;
  const viewer: MemoParty | null = memo.industry_user_id === viewerId
    ? "industry"
    : memo.talent_user_id === viewerId
    ? "talent"
    : null;
  if (!viewer) return null;

  const counterpartId = viewer === "industry" ? memo.talent_user_id : memo.industry_user_id;
  const [provisions, events, payoutReady, names, availability, project] = await Promise.all([
    db.from("booking_deal_memo_provisions").select(PROVISION_COLUMNS).eq("memo_id", memoId).order("sort_order"),
    db
      .from("booking_deal_memo_events")
      .select("id,actor_user_id,actor_role,action,payload,created_at")
      .eq("memo_id", memoId)
      .order("created_at")
      .limit(200),
    db.rpc("booking_deal_memo_payout_ready", { p_memo_id: memoId }),
    profileNames(db, [counterpartId]),
    db
      .from("availability_check_requests")
      .select("title,date_ranges,project_name")
      .eq("id", memo.availability_check_request_id)
      .maybeSingle<{ title: string | null; date_ranges: unknown; project_name: string | null }>(),
    memo.project_id
      ? db.from("projects").select("title").eq("id", memo.project_id).maybeSingle<{ title: string | null }>()
      : Promise.resolve({ data: null }),
  ]);

  return {
    payload: payloadFrom(
      memo,
      (provisions.data ?? []) as ProvisionRecord[],
      (events.data ?? []) as DealMemoEvent[],
      viewer,
      payoutReady.data === true,
    ),
    context: {
      counterpartId,
      counterpartName: names.get(counterpartId) ?? "Motiion member",
      availabilityTitle: availability.data?.title?.trim() || null,
      projectTitle: project.data?.title?.trim() || availability.data?.project_name?.trim() || null,
      dateRanges: Array.isArray(availability.data?.date_ranges) ? (availability.data?.date_ranges as DealMemoContext["dateRanges"]) : [],
    },
  };
}

/** Compose context for a new memo; null unless the availability request is confirmed and ours. */
export async function loadComposeContext(availabilityId: string, industryUserId: string) {
  const db = await createServerSupabaseClient();
  if (!db) return null;
  const { data: row } = await db
    .from("availability_check_requests")
    .select("id,requester_id,talent_id,title,status,response_kind,project_id,project_name,date_ranges")
    .eq("id", availabilityId)
    .maybeSingle<{
      id: string;
      requester_id: string;
      talent_id: string;
      title: string | null;
      status: string;
      response_kind: string | null;
      project_id: string | null;
      project_name: string | null;
      date_ranges: unknown;
    }>();
  if (!row || row.requester_id !== industryUserId) return null;
  const [names, project, open] = await Promise.all([
    profileNames(db, [row.talent_id]),
    row.project_id
      ? db.from("projects").select("title").eq("id", row.project_id).maybeSingle<{ title: string | null }>()
      : Promise.resolve({ data: null }),
    db
      .from("booking_deal_memos")
      .select("id")
      .eq("availability_check_request_id", row.id)
      .not("status", "in", "(declined,cancelled,expired)")
      .maybeSingle<{ id: string }>(),
  ]);
  const eligible = row.status === "submitted" &&
    (row.response_kind === "available" || row.response_kind === "available_with_conflict");
  return {
    eligible,
    openMemoId: open.data?.id ?? null,
    provisions: defaultProvisions(),
    context: {
      counterpartId: row.talent_id,
      counterpartName: names.get(row.talent_id) ?? "Motiion member",
      availabilityTitle: row.title?.trim() || null,
      projectTitle: project.data?.title?.trim() || row.project_name?.trim() || null,
      dateRanges: Array.isArray(row.date_ranges) ? (row.date_ranges as DealMemoContext["dateRanges"]) : [],
    } satisfies DealMemoContext,
  };
}

function titleFor(row: { title?: string | null; project_name?: string | null } | undefined) {
  return row?.title?.trim() || row?.project_name?.trim() || "Tour deal memo";
}

/** The deal memo tables ship in a migration applied separately from the web deploy. */
function isMissingRelation(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

export async function loadIndustryDealMemoDesk(industryUserId: string): Promise<{
  confirmed: ConfirmedAvailability[];
  memos: DealMemoListItem[];
  error: boolean;
  unavailable?: boolean;
}> {
  const db = await createServerSupabaseClient();
  if (!db) return { confirmed: [], memos: [], error: true };
  const [availability, memos] = await Promise.all([
    db
      .from("availability_check_requests")
      .select("id,talent_id,title,project_name,project_id,response_kind,responded_at")
      .eq("requester_id", industryUserId)
      .eq("status", "submitted")
      .in("response_kind", ["available", "available_with_conflict"])
      .order("responded_at", { ascending: false })
      .limit(50),
    db
      .from("booking_deal_memos")
      .select("id,availability_check_request_id,talent_user_id,status,awaiting_party,expires_at,charge_amount_cents,talent_deal_cents,updated_at")
      .eq("industry_user_id", industryUserId)
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);
  if (isMissingRelation(memos.error)) return { confirmed: [], memos: [], error: false, unavailable: true };
  if (availability.error || memos.error) return { confirmed: [], memos: [], error: true };
  const availabilityRows = availability.data ?? [];
  const memoRows = memos.data ?? [];
  const names = await profileNames(db, [
    ...availabilityRows.map((r) => r.talent_id as string),
    ...memoRows.map((r) => r.talent_user_id as string),
  ]);
  const byAvailability = new Map(availabilityRows.map((r) => [r.id as string, r]));
  const openByAvailability = new Map<string, string>();
  for (const memo of memoRows) {
    if (!["declined", "cancelled", "expired"].includes(memo.status as string)) {
      openByAvailability.set(memo.availability_check_request_id as string, memo.id as string);
    }
  }
  return {
    error: false,
    confirmed: availabilityRows.map((row) => ({
      id: row.id as string,
      talentId: row.talent_id as string,
      talentName: names.get(row.talent_id as string) ?? "Motiion member",
      title: titleFor(row),
      projectTitle: (row.project_name as string | null) ?? null,
      respondedAt: (row.responded_at as string | null) ?? null,
      responseKind: row.response_kind as string,
      openMemoId: openByAvailability.get(row.id as string) ?? null,
    })),
    memos: memoRows.map((row) => ({
      id: row.id as string,
      status: row.status as string,
      awaiting_party: row.awaiting_party as MemoParty | null,
      expires_at: row.expires_at as string | null,
      charge_amount_cents: Number(row.charge_amount_cents),
      talent_deal_cents: Number(row.talent_deal_cents),
      updated_at: row.updated_at as string,
      counterpartName: names.get(row.talent_user_id as string) ?? "Motiion member",
      title: titleFor(byAvailability.get(row.availability_check_request_id as string)),
    })),
  };
}

async function payoutStatusFor(db: Db, userId: string): Promise<PayoutStatus | null> {
  const { data: p } = await db
    .from("booking_payout_accounts")
    .select("stripe_transfers_status,payouts_status,requirements_currently_due,requirements_past_due,last_synced_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!p) return null;
  return {
    hasAccount: true,
    transfersStatus: p.stripe_transfers_status as string,
    payoutsStatus: (p.payouts_status as string | null) ?? null,
    requirementsCurrentlyDue: Number(p.requirements_currently_due ?? 0),
    requirementsPastDue: Number(p.requirements_past_due ?? 0),
    ready: p.stripe_transfers_status === "active",
    lastSyncedAt: (p.last_synced_at as string | null) ?? null,
  };
}

/** Booking payout status from the RLS-readable cache; Edge refreshes it from Stripe. */
export async function loadTalentPayoutStatus(userId: string): Promise<PayoutStatus | null> {
  const db = await createServerSupabaseClient();
  return db ? payoutStatusFor(db, userId) : null;
}

/** Offers awaiting the talent's response, for the Home banner. */
export async function countTalentDealMemosAwaiting(talentUserId: string): Promise<number> {
  const db = await createServerSupabaseClient();
  if (!db) return 0;
  const { count } = await db
    .from("booking_deal_memos")
    .select("id", { count: "exact", head: true })
    .eq("talent_user_id", talentUserId)
    .in("status", ["offered", "negotiating"])
    .eq("awaiting_party", "talent");
  return count ?? 0;
}

export async function loadTalentDealMemos(talentUserId: string): Promise<{
  memos: DealMemoListItem[];
  payout: PayoutStatus | null;
  error: boolean;
}> {
  const db = await createServerSupabaseClient();
  if (!db) return { memos: [], payout: null, error: true };
  const [memos, payout] = await Promise.all([
    db
      .from("booking_deal_memos")
      .select("id,availability_check_request_id,industry_user_id,status,awaiting_party,expires_at,charge_amount_cents,talent_deal_cents,updated_at")
      .eq("talent_user_id", talentUserId)
      .neq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(100),
    payoutStatusFor(db, talentUserId),
  ]);
  if (memos.error) return { memos: [], payout: null, error: true };
  const rows = memos.data ?? [];
  const [names, availability] = await Promise.all([
    profileNames(db, rows.map((r) => r.industry_user_id as string)),
    rows.length
      ? db
        .from("availability_check_requests")
        .select("id,title,project_name")
        .in("id", rows.map((r) => r.availability_check_request_id as string))
      : Promise.resolve({ data: [] as { id: string; title: string | null; project_name: string | null }[] }),
  ]);
  const titles = new Map((availability.data ?? []).map((r) => [r.id as string, r]));
  return {
    error: false,
    payout,
    memos: rows.map((row) => ({
      id: row.id as string,
      status: row.status as string,
      awaiting_party: row.awaiting_party as MemoParty | null,
      expires_at: row.expires_at as string | null,
      charge_amount_cents: Number(row.charge_amount_cents),
      talent_deal_cents: Number(row.talent_deal_cents),
      updated_at: row.updated_at as string,
      counterpartName: names.get(row.industry_user_id as string) ?? "Motiion member",
      title: titleFor(titles.get(row.availability_check_request_id as string)),
    })),
  };
}
