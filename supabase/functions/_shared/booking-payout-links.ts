import { env } from "./env.ts";
import { jsonResponse } from "./http.ts";
import { BookingError, loadShells } from "./booking-deal-memo-store.ts";
import { createAccountLink, type PayoutAccountRow } from "./stripe-accounts-v2.ts";

export const PAYOUT_SETUP_PATH = "/deal-memos/payouts";

export async function requireTalentShell(userId: string) {
  const shells = await loadShells(userId);
  if (!shells.includes("talent")) throw new BookingError("FORBIDDEN", "Booking payouts are for Talent accounts.");
}

/** Only same-origin relative paths; iOS passes a universal-link path on the web origin. */
export function payoutUrls(returnPath: string | null) {
  const base = env.appUrl.replace(/\/$/, "");
  const clean = returnPath && returnPath.startsWith("/") && !returnPath.startsWith("//") ? returnPath : PAYOUT_SETUP_PATH;
  const join = clean.includes("?") ? "&" : "?";
  return {
    returnUrl: `${base}${clean}${join}payouts=return`,
    refreshUrl: `${base}${clean}${join}payouts=refresh`,
  };
}

export async function onboardingLink(accountId: string, type: "account_onboarding" | "account_update", returnPath: string | null) {
  const urls = payoutUrls(returnPath);
  const link = await createAccountLink({ accountId, type, ...urls });
  return link.url;
}

export function payoutStatusBody(row: PayoutAccountRow | null) {
  return {
    hasAccount: Boolean(row),
    transfersStatus: row?.stripe_transfers_status ?? null,
    payoutsStatus: row?.payouts_status ?? null,
    requirementsCurrentlyDue: row?.requirements_currently_due ?? 0,
    requirementsPastDue: row?.requirements_past_due ?? 0,
    ready: row?.stripe_transfers_status === "active",
    lastSyncedAt: row?.last_synced_at ?? null,
  };
}

export function payoutResponse(row: PayoutAccountRow | null, extra: Record<string, unknown> = {}) {
  return jsonResponse({ payout: payoutStatusBody(row), ...extra });
}
