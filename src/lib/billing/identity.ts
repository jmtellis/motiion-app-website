import type { IndustryIdentityStatus } from "@/types/talent-buyers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStripeClient, mapStripeIdentityStatus } from "./stripe";
import { identitySessionBelongsTo, shouldApplyIdentitySession } from "./identity-model";

export type IndustryIdentityRow = { user_id: string; stripe_session_id: string; status: IndustryIdentityStatus; last_error_code: string | null; verified_at: string | null; updated_at: string };
const SELECT = "user_id,stripe_session_id,status,last_error_code,verified_at,updated_at";

/** Called only with a real retrieved Stripe result. Shared profiles let iOS see
 * web verification; the service-owned row preserves older web compatibility. */
export async function upsertIndustryIdentityVerification(input: { userId: string; stripeSessionId: string; status: IndustryIdentityStatus; lastErrorCode?: string | null; replaceSession?: boolean }): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminSupabaseClient();
  if (!admin) return { ok: false, error: "Identity verification is temporarily unavailable." };
  const now = new Date().toISOString();
  const prior = await admin.from("industry_identity_verifications").select("status,stripe_session_id").eq("user_id", input.userId).maybeSingle();
  if (prior.error) return { ok: false, error: "Could not read verification status. Please retry." };
  if (prior.data?.stripe_session_id && prior.data.stripe_session_id !== input.stripeSessionId && !input.replaceSession) return { ok: true };
  // A previously verified identity must not be downgraded by a late failure.
  if (prior.data?.status === "verified" && input.status !== "verified") return { ok: true };
  const { error } = await admin.from("industry_identity_verifications").upsert({ user_id: input.userId, stripe_session_id: input.stripeSessionId, status: input.status, last_error_code: input.lastErrorCode ?? null, verified_at: input.status === "verified" ? now : null, updated_at: now }, { onConflict: "user_id" });
  if (error) return { ok: false, error: "Could not save verification status. Please retry." };
  const canonicalStatus = input.status === "redacted" || input.status === "expired" ? "canceled" : input.status;
  const canonical = await admin.from("profiles").update({ stripe_identity_verification_session_id: input.stripeSessionId, identity_verification_status: canonicalStatus, ...(input.status === "verified" ? { identity_verified_at: now } : {}) }).eq("user_id", input.userId);
  return canonical.error ? { ok: false, error: "Verification was received, but profile sync failed. Please refresh to retry." } : { ok: true };
}

export async function getIndustryIdentityVerificationByUserId(userId: string): Promise<IndustryIdentityRow | null> {
  const admin = createAdminSupabaseClient();
  if (!admin) return null;
  const [legacy, profile] = await Promise.all([
    admin.from("industry_identity_verifications").select(SELECT).eq("user_id", userId).maybeSingle<IndustryIdentityRow>(),
    admin.from("profiles").select("stripe_identity_verification_session_id,identity_verification_status").eq("user_id", userId).maybeSingle(),
  ]);
  if (legacy.error || profile.error) throw new Error("Could not check identity verification. Please retry.");
  if (legacy.data?.status === "verified") {
    if (profile.data?.identity_verification_status !== "verified" || profile.data?.stripe_identity_verification_session_id !== legacy.data.stripe_session_id) {
      const synced = await upsertIndustryIdentityVerification({ userId, stripeSessionId: legacy.data.stripe_session_id, status: "verified" });
      if (!synced.ok) throw new Error(synced.error);
    }
    return legacy.data;
  }
  const sessionId = profile.data?.stripe_identity_verification_session_id;
  if (!sessionId || (sessionId === legacy.data?.stripe_session_id && profile.data?.identity_verification_status === legacy.data?.status)) return legacy.data;
  // Historical canonical profile fields were editable by account owners. Never
  // grant access from a claimed status: validate the real provider result and owner.
  const stripe = getStripeClient();
  if (!stripe) return legacy.data;
  try {
    const session = await stripe.identity.verificationSessions.retrieve(sessionId);
    if (!identitySessionBelongsTo(session.metadata, userId)) return legacy.data;
    const result = await upsertIndustryIdentityVerification({ userId, stripeSessionId: session.id, status: mapStripeIdentityStatus(session.status), lastErrorCode: session.last_error?.code, replaceSession: true });
    if (!result.ok) throw new Error(result.error);
    const imported = await admin.from("industry_identity_verifications").select(SELECT).eq("user_id", userId).maybeSingle<IndustryIdentityRow>();
    if (imported.error) throw new Error("Could not read identity verification.");
    return imported.data;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "resource_missing") return legacy.data;
    throw new Error("Identity verification could not be checked. Your existing session is saved; please retry.");
  }
}

export async function getIndustryIdentityVerificationBySessionId(sessionId: string): Promise<IndustryIdentityRow | null> {
  const admin = createAdminSupabaseClient();
  if (!admin) return null;
  const legacy = await admin.from("industry_identity_verifications").select(SELECT).eq("stripe_session_id", sessionId).maybeSingle<IndustryIdentityRow>();
  if (legacy.error) throw new Error("Could not check identity session.");
  if (legacy.data) return legacy.data;
  const canonical = await admin.from("profiles").select("user_id").eq("stripe_identity_verification_session_id", sessionId).maybeSingle();
  if (canonical.error) throw new Error("Could not check the linked identity session. Please retry.");
  if (!canonical.data) return null;
  const validated = await getIndustryIdentityVerificationByUserId(canonical.data.user_id);
  return validated?.stripe_session_id === sessionId ? validated : null;
}

export async function updateIndustryIdentityVerificationBySessionId(input: { stripeSessionId: string; status: IndustryIdentityStatus; lastErrorCode?: string | null }): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await getIndustryIdentityVerificationBySessionId(input.stripeSessionId);
  if (!existing) return { ok: false, error: "Identity session not found." };
  if (!shouldApplyIdentitySession(existing.stripe_session_id, input.stripeSessionId, existing.status, input.status)) return { ok: true };
  return upsertIndustryIdentityVerification({ ...input, userId: existing.user_id });
}
