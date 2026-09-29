import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/http.ts";
import { stripe } from "../_shared/stripe.ts";
import { BookingError, handleBookingRequest, requireUser, stringField } from "../_shared/booking-deal-memo-store.ts";
import {
  loadPayoutAccountByUser,
  recipientStatus,
  retrieveAccount,
  savePayoutStatus,
} from "../_shared/stripe-accounts-v2.ts";
import { onboardingLink, payoutResponse, requireTalentShell } from "../_shared/booking-payout-links.ts";

/**
 * Talent booking payouts after creation.
 *
 * Body: { action: "status" | "onboarding_link" | "update_link" | "dashboard_link", returnPath? }
 *   status          → re-syncs from Stripe, returns { payout }
 *   onboarding_link → { payout, url } (continue requirements)
 *   update_link     → { payout, url } (edit details once active)
 *   dashboard_link  → { payout, url } Express dashboard login link
 */
serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return handleBookingRequest(req, "connect-account-v2-onboarding", async (body) => {
    const user = await requireUser(req, body);
    await requireTalentShell(user.id);
    const action = stringField(body, "action") ?? "status";

    let row = await loadPayoutAccountByUser(user.id);
    if (!row) {
      if (action === "status") return payoutResponse(null);
      throw new BookingError("CONNECT_ONBOARDING_REQUIRED", "Set up booking payouts first.");
    }
    try {
      row = await savePayoutStatus(user.id, row.stripe_account_id, recipientStatus(await retrieveAccount(row.stripe_account_id)));
    } catch (err) {
      console.warn("connect-account-v2-onboarding sync failed", { userId: user.id, err });
      if (action === "status") return payoutResponse(row, { stale: true });
    }

    const returnPath = stringField(body, "returnPath");
    switch (action) {
      case "status":
        return payoutResponse(row);
      case "onboarding_link":
        return payoutResponse(row, { url: await onboardingLink(row.stripe_account_id, "account_onboarding", returnPath) });
      case "update_link":
        return payoutResponse(row, { url: await onboardingLink(row.stripe_account_id, "account_update", returnPath) });
      case "dashboard_link": {
        if (row.stripe_transfers_status !== "active") {
          throw new BookingError("CONNECT_ONBOARDING_REQUIRED", "Finish payout setup to open your payout dashboard.");
        }
        const link = await stripe.accounts.createLoginLink(row.stripe_account_id);
        return payoutResponse(row, { url: link.url });
      }
      default:
        throw new BookingError("FORBIDDEN", "Unknown action.");
    }
  });
});
