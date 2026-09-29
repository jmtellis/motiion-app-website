import Stripe from "npm:stripe";
import { supabaseAdmin } from "./supabase-admin.ts";

/**
 * Apply Stripe VerificationSession state to `profiles` (shared by stripe-webhook and identity-verification-sync).
 */
export async function syncIdentityVerificationFromStripeSession(
  session: Stripe.Identity.VerificationSession,
  options?: { expectUserId?: string },
): Promise<{ ok: boolean; userId?: string; error?: string }> {
  let userId: string | null = session.metadata?.supabase_user_id?.trim() || null;
  if (!userId) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("stripe_identity_verification_session_id", session.id)
      .maybeSingle<{ user_id: string }>();
    if (error) {
      console.error("identity sync profile lookup failed", error);
      return { ok: false, error: "profile_lookup_failed" };
    }
    userId = data?.user_id ?? null;
  }
  if (!userId) {
    console.error("identity sync: missing user id for session", session.id);
    return { ok: false, error: "missing_user_id" };
  }

  if (options?.expectUserId && options.expectUserId !== userId) {
    return { ok: false, error: "session_user_mismatch" };
  }

  let status: string;
  switch (session.status) {
    case "verified":
      status = "verified";
      break;
    case "canceled":
      status = "canceled";
      break;
    case "requires_input":
      status = "requires_input";
      break;
    case "processing":
      status = "processing";
      break;
    default:
      status = "processing";
  }
  if (session.last_error?.code && session.status !== "verified") {
    status = "failed";
  }

  const patch: Record<string, unknown> = {
    stripe_identity_verification_session_id: session.id,
    identity_verification_status: status,
  };

  if (session.status === "verified") {
    patch.identity_verified_at = new Date().toISOString();
  }

  const { error: upErr } = await supabaseAdmin.from("profiles").update(patch).eq("user_id", userId);
  if (upErr) {
    console.error("identity sync profile update failed", upErr);
    return { ok: false, error: "profile_update_failed" };
  }

  return { ok: true, userId };
}
