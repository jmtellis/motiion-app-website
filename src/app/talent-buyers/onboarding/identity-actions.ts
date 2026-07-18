"use server";

import {
  getIndustryIdentityVerificationByUserId,
  upsertIndustryIdentityVerification,
} from "@/lib/billing/identity";
import {
  createIdentityVerificationSession,
  retrieveIdentityVerificationSession,
} from "@/lib/billing/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { IndustryIdentityStatus } from "@/types/talent-buyers";

export type IdentityStatusResult =
  | {
      ok: true;
      status: IndustryIdentityStatus | null;
      lastErrorCode: string | null;
      verified: boolean;
    }
  | { ok: false; error: string };

export type StartIdentityResult =
  | { ok: true; clientSecret: string; status: IndustryIdentityStatus }
  | { ok: false; error: string };

async function requireUser(): Promise<
  | { ok: true; user: { id: string; email?: string | null } }
  | { ok: false; error: string }
> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  return { ok: true, user };
}

export async function getIndustryIdentityStatus(): Promise<IdentityStatusResult> {
  const auth = await requireUser();
  if (!auth.ok) return { ok: false, error: auth.error };

  const row = await getIndustryIdentityVerificationByUserId(auth.user.id);
  return {
    ok: true,
    status: row?.status ?? null,
    lastErrorCode: row?.last_error_code ?? null,
    verified: row?.status === "verified",
  };
}

export async function startIndustryIdentityVerification(): Promise<StartIdentityResult> {
  const auth = await requireUser();
  if (!auth.ok) return { ok: false, error: auth.error };

  const existing = await getIndustryIdentityVerificationByUserId(auth.user.id);
  if (existing?.status === "verified") {
    return { ok: false, error: "Identity is already verified." };
  }

  // Reuse an unfinished session when Stripe still exposes a client secret.
  if (
    existing?.stripe_session_id &&
    (existing.status === "requires_input" || existing.status === "processing")
  ) {
    const refreshed = await retrieveIdentityVerificationSession(existing.stripe_session_id);
    if (refreshed.ok) {
      await upsertIndustryIdentityVerification({
        userId: auth.user.id,
        stripeSessionId: refreshed.sessionId,
        status: refreshed.status,
        lastErrorCode: refreshed.lastErrorCode,
      });
      if (refreshed.status === "verified") {
        return { ok: false, error: "Identity is already verified." };
      }
      if (refreshed.clientSecret && refreshed.status === "requires_input") {
        return {
          ok: true,
          clientSecret: refreshed.clientSecret,
          status: refreshed.status,
        };
      }
    }
  }

  const created = await createIdentityVerificationSession({
    userId: auth.user.id,
    email: auth.user.email,
  });

  if (!created.ok) return created;

  const persisted = await upsertIndustryIdentityVerification({
    userId: auth.user.id,
    stripeSessionId: created.sessionId,
    status: created.status,
  });
  if (!persisted.ok) return { ok: false, error: persisted.error };

  return {
    ok: true,
    clientSecret: created.clientSecret,
    status: created.status,
  };
}

export async function refreshIndustryIdentityVerification(): Promise<IdentityStatusResult> {
  const auth = await requireUser();
  if (!auth.ok) return { ok: false, error: auth.error };

  const existing = await getIndustryIdentityVerificationByUserId(auth.user.id);
  if (!existing) {
    return { ok: true, status: null, lastErrorCode: null, verified: false };
  }

  const refreshed = await retrieveIdentityVerificationSession(existing.stripe_session_id);
  if (!refreshed.ok) return { ok: false, error: refreshed.error };

  const persisted = await upsertIndustryIdentityVerification({
    userId: auth.user.id,
    stripeSessionId: refreshed.sessionId,
    status: refreshed.status,
    lastErrorCode: refreshed.lastErrorCode,
  });
  if (!persisted.ok) return { ok: false, error: persisted.error };

  return {
    ok: true,
    status: refreshed.status,
    lastErrorCode: refreshed.lastErrorCode,
    verified: refreshed.status === "verified",
  };
}
