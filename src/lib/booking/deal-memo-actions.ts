"use server";

import { revalidatePath } from "next/cache";

import { callSupabaseFunctionAsUser } from "@/lib/supabaseRest";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ComposeModuleInput,
  DeclineReason,
  FieldError,
  IndustryReplyInput,
  TalentFlagInput,
} from "@/lib/booking/deal-memo";
import type { DealMemoPayload, PayoutStatus } from "@/lib/booking/deal-memo-types";

export type BookingActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; errorCode: string | null; fieldErrors: FieldError[]; memoId?: string };

async function accessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token?.trim() || null;
}

async function invoke<T>(slug: string, body: Record<string, unknown>): Promise<BookingActionResult<T>> {
  const token = await accessToken();
  if (!token) return { ok: false, error: "You need to be signed in.", errorCode: "FORBIDDEN", fieldErrors: [] };
  try {
    const data = await callSupabaseFunctionAsUser<T>(slug, body, token);
    return { ok: true, data };
  } catch (err) {
    const e = err as Error & { errorCode?: string; details?: Record<string, unknown> };
    const fieldErrors = Array.isArray(e.details?.fieldErrors) ? (e.details.fieldErrors as FieldError[]) : [];
    const memoId = typeof e.details?.memoId === "string" ? e.details.memoId : undefined;
    return {
      ok: false,
      error: e.message || "Something went wrong. Please try again.",
      errorCode: e.errorCode ?? null,
      fieldErrors,
      ...(memoId ? { memoId } : {}),
    };
  }
}

function refresh(memoId?: string) {
  revalidatePath("/bookings");
  revalidatePath("/deal-memos");
  if (memoId) {
    revalidatePath(`/bookings/deal-memos/${memoId}`);
    revalidatePath(`/deal-memos/${memoId}`);
  }
}

async function memoAction(slug: string, body: Record<string, unknown>) {
  const result = await invoke<DealMemoPayload>(slug, body);
  if (result.ok) refresh(result.data.memo.id);
  return result;
}

export async function saveDealMemo(input: {
  availabilityRequestId?: string;
  memoId?: string;
  expectedVersion?: number;
  coverNote: string;
  modules: ComposeModuleInput[];
  send: boolean;
  idempotencyKey?: string;
}) {
  return memoAction("booking-deal-memo-create", input);
}

export async function flagDealMemo(input: { memoId: string; expectedVersion: number; flags: TalentFlagInput[] }) {
  return memoAction("booking-deal-memo-flag", { ...input, action: "flag" });
}

export async function requestDealMemoCall(input: { memoId: string; expectedVersion: number; note?: string }) {
  return memoAction("booking-deal-memo-flag", { ...input, action: "request_call" });
}

export async function replyToDealMemo(input: { memoId: string; expectedVersion: number; replies: IndustryReplyInput[] }) {
  return memoAction("booking-deal-memo-industry-reply", input);
}

export async function acceptDealMemo(input: { memoId: string; expectedVersion: number; signatureName: string }) {
  return memoAction("booking-deal-memo-accept", input);
}

export async function declineDealMemo(input: {
  memoId: string;
  expectedVersion: number;
  reason?: DeclineReason | null;
  note?: string;
}) {
  return memoAction("booking-deal-memo-decline", input);
}

export async function startBookingCheckout(input: {
  memoId: string;
  expectedVersion: number;
  signatureName?: string;
  mode?: "payment_intent" | "checkout";
}) {
  return memoAction("booking-checkout-create", {
    ...input,
    action: "create",
    returnPath: `/bookings/deal-memos/${input.memoId}`,
  });
}

export async function syncBookingCheckout(memoId: string) {
  return memoAction("booking-checkout-create", { memoId, action: "sync" });
}

/** For server components after a Stripe redirect; revalidatePath is not allowed during render. */
export async function syncBookingCheckoutOnLoad(memoId: string) {
  return invoke<DealMemoPayload>("booking-checkout-create", { memoId, action: "sync" });
}

type PayoutResponse = { payout: PayoutStatus; url?: string };

function safePath(path: string | undefined) {
  const value = path?.trim() || "/deal-memos/payouts";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) {
    return "/deal-memos/payouts";
  }
  return value;
}

export async function startBookingPayoutSetup(returnPath?: string) {
  return invoke<PayoutResponse>("connect-account-v2-create", { returnPath: safePath(returnPath) });
}

export async function bookingPayoutLink(
  action: "onboarding_link" | "update_link" | "dashboard_link",
  returnPath?: string,
) {
  return invoke<PayoutResponse>("connect-account-v2-onboarding", { action, returnPath: safePath(returnPath) });
}

export async function fetchBookingPayoutStatus() {
  return invoke<PayoutResponse>("connect-account-v2-onboarding", { action: "status" });
}
