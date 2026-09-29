import type { DealLine, MemoParty, ProvisionRecord, StatusChip } from "@/lib/booking/deal-memo";

export type DealMemoRow = {
  id: string;
  availability_check_request_id: string;
  project_id: string | null;
  industry_user_id: string;
  talent_user_id: string;
  template_key: string;
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
  created_at: string;
  updated_at: string;
};

export type DealMemoEvent = {
  id: string;
  actor_user_id: string | null;
  actor_role: string;
  action: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type DealMemoFees = {
  talentDealCents: number;
  platformFeeBps: number;
  platformFeeCents: number;
  chargeAmountCents: number;
  talentReceivesCents: number;
  currency: string;
};

export type BookingCheckoutInfo = {
  mode: "payment_intent" | "checkout";
  status: string;
  clientSecret?: string | null;
  url?: string | null;
  paymentIntentId?: string;
};

/** Edge response contract (booking-deal-memo-* / booking-checkout-create). */
export type DealMemoPayload = {
  memo: DealMemoRow;
  provisions: ProvisionRecord[];
  events: DealMemoEvent[];
  viewer: MemoParty;
  chip: StatusChip;
  expired: boolean;
  openFlags: number;
  dealLines: DealLine[];
  fees: DealMemoFees;
  payoutReady: boolean;
  checkout?: BookingCheckoutInfo;
  replayed?: boolean;
};

export type DealMemoContext = {
  counterpartName: string;
  counterpartId: string;
  availabilityTitle: string | null;
  projectTitle: string | null;
  dateRanges: { start?: string; end?: string; start_date?: string; end_date?: string }[];
};

export type PayoutStatus = {
  hasAccount: boolean;
  transfersStatus: string | null;
  payoutsStatus: string | null;
  requirementsCurrentlyDue: number;
  requirementsPastDue: number;
  ready: boolean;
  lastSyncedAt: string | null;
};

export type DealMemoListItem = {
  id: string;
  status: string;
  awaiting_party: MemoParty | null;
  expires_at: string | null;
  charge_amount_cents: number;
  talent_deal_cents: number;
  updated_at: string;
  counterpartName: string;
  title: string;
};

export type ConfirmedAvailability = {
  id: string;
  talentId: string;
  talentName: string;
  title: string;
  projectTitle: string | null;
  respondedAt: string | null;
  responseKind: string;
  openMemoId: string | null;
};
