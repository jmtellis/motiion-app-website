import type { IndustryIdentityStatus } from "@/types/talent-buyers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type IndustryIdentityRow = {
  user_id: string;
  stripe_session_id: string;
  status: IndustryIdentityStatus;
  last_error_code: string | null;
  verified_at: string | null;
  updated_at: string;
};

export async function upsertIndustryIdentityVerification(input: {
  userId: string;
  stripeSessionId: string;
  status: IndustryIdentityStatus;
  lastErrorCode?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminSupabaseClient();
  if (!admin) return { ok: false, error: "Supabase admin is not configured." };

  const now = new Date().toISOString();
  const verifiedAt = input.status === "verified" ? now : null;

  const { error } = await admin.from("industry_identity_verifications").upsert(
    {
      user_id: input.userId,
      stripe_session_id: input.stripeSessionId,
      status: input.status,
      last_error_code: input.lastErrorCode ?? null,
      verified_at: verifiedAt,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getIndustryIdentityVerificationByUserId(
  userId: string,
): Promise<IndustryIdentityRow | null> {
  const admin = createAdminSupabaseClient();
  if (!admin) return null;

  const { data } = await admin
    .from("industry_identity_verifications")
    .select("user_id, stripe_session_id, status, last_error_code, verified_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle<IndustryIdentityRow>();

  return data ?? null;
}

export async function getIndustryIdentityVerificationBySessionId(
  sessionId: string,
): Promise<IndustryIdentityRow | null> {
  const admin = createAdminSupabaseClient();
  if (!admin) return null;

  const { data } = await admin
    .from("industry_identity_verifications")
    .select("user_id, stripe_session_id, status, last_error_code, verified_at, updated_at")
    .eq("stripe_session_id", sessionId)
    .maybeSingle<IndustryIdentityRow>();

  return data ?? null;
}

export async function updateIndustryIdentityVerificationBySessionId(input: {
  stripeSessionId: string;
  status: IndustryIdentityStatus;
  lastErrorCode?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminSupabaseClient();
  if (!admin) return { ok: false, error: "Supabase admin is not configured." };

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: input.status,
    last_error_code: input.lastErrorCode ?? null,
    updated_at: now,
  };
  if (input.status === "verified") {
    patch.verified_at = now;
  }

  const { error } = await admin
    .from("industry_identity_verifications")
    .update(patch)
    .eq("stripe_session_id", input.stripeSessionId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
