import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/http.ts";
import { supabaseAdmin } from "../_shared/supabase-admin.ts";
import { handleBookingRequest, requireUser, stringField } from "../_shared/booking-deal-memo-store.ts";
import {
  createRecipientAccount,
  loadPayoutAccountByUser,
  recipientStatus,
  savePayoutStatus,
} from "../_shared/stripe-accounts-v2.ts";
import { onboardingLink, payoutResponse, requireTalentShell } from "../_shared/booking-payout-links.ts";

/**
 * Talent booking payouts: create (or reuse) the Accounts v2 Recipient with the Express dashboard
 * and return a hosted onboarding link. Separate from class instructor Connect — never reads or
 * writes `profiles.stripe_connect_account_id`.
 *
 * Body: { returnPath? }  →  { payout, url }
 */
serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return handleBookingRequest(req, "connect-account-v2-create", async (body) => {
    const user = await requireUser(req, body);
    await requireTalentShell(user.id);

    let row = await loadPayoutAccountByUser(user.id);
    if (!row) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("display_name,first_name,last_name,email")
        .eq("user_id", user.id)
        .maybeSingle<{ display_name: string | null; first_name: string | null; last_name: string | null; email: string | null }>();
      const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
      const account = await createRecipientAccount({
        userId: user.id,
        email: user.email ?? profile?.email ?? null,
        displayName: profile?.display_name?.trim() || fullName || null,
      });
      row = await savePayoutStatus(user.id, account.id, recipientStatus(account));
    }

    const type = row.stripe_transfers_status === "active" ? "account_update" : "account_onboarding";
    const url = await onboardingLink(row.stripe_account_id, type, stringField(body, "returnPath"));
    return payoutResponse(row, { url });
  });
});
