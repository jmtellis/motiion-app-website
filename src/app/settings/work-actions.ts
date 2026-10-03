"use server";

import { revalidatePath } from "next/cache";

import { isPlatformAdmin } from "@/lib/auth/session";
import {
  isLiveSubscriptionRow,
  userIsPaidFromRows,
  type AccessCodeGrantRow,
  type SubscriptionAccessRow,
} from "@/lib/billing/entitlement";
import { callSupabaseFunctionAsUser } from "@/lib/supabaseRest";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CreditAttributionItem = {
  mentionId: string;
  rawName: string;
  experienceTitle: string | null;
  claimStatus: string;
  claimantDisplayName: string;
};

export type CreditClaimItem = {
  mentionId: string;
  rawName: string;
  experienceTitle: string | null;
  mentioningDisplayName: string;
  corroboratingCount: number;
};

export type ProfileReviewItem = {
  userId: string;
  displayName: string;
  username: string | null;
  headshotUrl: string | null;
  submittedAt: string | null;
};

type FunctionResult<T> = {
  ok: boolean;
  data: T | null;
  error: string | null;
  code: string | null;
};

function siteOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3001";
  return raw.replace(/\/$/, "");
}

async function requireAccessToken(): Promise<
  { ok: true; accessToken: string; userId: string } | { ok: false; error: string }
> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token?.trim();
  const userId = session?.user.id;
  if (!accessToken || !userId) return { ok: false, error: "You need to be signed in." };
  return { ok: true, accessToken, userId };
}

async function callUserFunction<T>(
  slug: string,
  body: Record<string, unknown>,
): Promise<FunctionResult<T>> {
  const auth = await requireAccessToken();
  if (!auth.ok) return { ok: false, data: null, error: auth.error, code: null };
  try {
    const data = await callSupabaseFunctionAsUser<T>(slug, body, auth.accessToken);
    return { ok: true, data, error: null, code: null };
  } catch (error) {
    const err = error as Error & { errorCode?: string };
    return { ok: false, data: null, error: err.message, code: err.errorCode ?? null };
  }
}

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

export async function loadCreditAttributions(): Promise<CreditAttributionItem[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_credit_attribution_inbox", { p_limit: 40 });
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      mentionId: String(item.mention_id ?? ""),
      rawName: text(item.raw_name)?.trim() || "Credit",
      experienceTitle: text(item.experience_title),
      claimStatus: text(item.claim_status) || "provisional",
      claimantDisplayName: text(item.claimant_display_name) || "Claimant",
    };
  }).filter((item) => item.mentionId);
}

export async function loadCreditClaims(): Promise<CreditClaimItem[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_credit_claim_candidates", { p_limit: 40 });
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      mentionId: String(item.mention_id ?? ""),
      rawName: text(item.raw_name)?.trim() || "Credit",
      experienceTitle: text(item.experience_title),
      mentioningDisplayName: text(item.mentioning_display_name) || "Talent",
      corroboratingCount: Number(item.corroborating_count ?? 0),
    };
  }).filter((item) => item.mentionId);
}

export async function respondToCreditAttribution(
  mentionId: string,
  action: "confirm" | "decline" | "revoke",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { error } = await supabase.rpc("respond_to_credit_attribution", {
    p_mention_id: mentionId,
    p_action: action,
  });
  if (error) return { ok: false, error: "Could not update that credit. Please try again." };
  revalidatePath("/settings");
  return { ok: true };
}

export async function claimCreditMentions(
  mentionIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { error } = await supabase.rpc("claim_credit_mentions", { p_mention_ids: mentionIds });
  if (error) return { ok: false, error: "Could not claim those credits. Please try again." };
  revalidatePath("/settings");
  return { ok: true };
}

export async function startTalentIdentityVerification(): Promise<
  { ok: true; url?: string; alreadyVerified?: boolean } | { ok: false; error: string }
> {
  const origin = siteOrigin();
  const returnUrl = `${origin}/settings?section=verification&identity=return`;
  const started = await callUserFunction<{ url?: string }>("identity-verification-start", { returnUrl });
  if (started.ok && started.data?.url) return { ok: true, url: started.data.url };
  if (started.code === "ALREADY_VERIFIED") return { ok: true, alreadyVerified: true };

  const needsFee = started.code === "FEE_REQUIRED";
  const retryStart = started.code === "FEE_ALREADY_ACTIVE" || started.code === "PRO_INCLUDED";
  if (retryStart) {
    const retry = await callUserFunction<{ url?: string }>("identity-verification-start", { returnUrl });
    if (retry.ok && retry.data?.url) return { ok: true, url: retry.data.url };
    if (retry.code === "ALREADY_VERIFIED") return { ok: true, alreadyVerified: true };
    return { ok: false, error: retry.error ?? "Could not start identity verification." };
  }
  if (!needsFee) return { ok: false, error: started.error ?? "Could not start identity verification." };

  const fee = await callUserFunction<{ checkoutUrl?: string }>("identity-verification-fee-create", {
    webSuccessUrl: `${origin}/settings?section=verification&identityFee=success&session_id={CHECKOUT_SESSION_ID}`,
    webCancelUrl: `${origin}/settings?section=verification&identityFee=cancel`,
  });
  if (fee.ok && fee.data?.checkoutUrl) return { ok: true, url: fee.data.checkoutUrl };
  if (fee.code === "FEE_ALREADY_ACTIVE" || fee.code === "PRO_INCLUDED" || fee.code === "ALREADY_VERIFIED") {
    const retry = await callUserFunction<{ url?: string }>("identity-verification-start", { returnUrl });
    if (retry.ok && retry.data?.url) return { ok: true, url: retry.data.url };
    if (retry.code === "ALREADY_VERIFIED" || fee.code === "ALREADY_VERIFIED") {
      return { ok: true, alreadyVerified: true };
    }
    return { ok: false, error: retry.error ?? fee.error ?? "Could not start identity verification." };
  }
  return { ok: false, error: fee.error ?? "Could not start the identity verification fee." };
}

export async function syncTalentIdentityVerification(): Promise<void> {
  await callUserFunction("identity-verification-sync", {});
  revalidatePath("/settings");
}

export async function reconcileIdentityFee(sessionId: string): Promise<void> {
  const id = sessionId.trim();
  if (!id || id.includes("{")) return;
  await callUserFunction("identity-verification-fee-reconcile", { checkoutSessionId: id });
  await callUserFunction("identity-verification-sync", {});
  revalidatePath("/settings");
}

export async function loadTalentPlan(): Promise<{ label: string; canManageBilling: boolean }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { label: "Free Plan", canManageBilling: false };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { label: "Free Plan", canManageBilling: false };

  const [{ data }, grantsQuery] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, tier, provider, customer_id, current_period_end")
      .eq("user_id", user.id),
    supabase
      .from("access_code_grants")
      .select("entitlement, status, expires_at, revoked_at")
      .eq("user_id", user.id),
  ]);

  const rows = (data ?? []) as (SubscriptionAccessRow & {
    provider: string | null;
    customer_id: string | null;
  })[];
  const grants = grantsQuery.error ? [] : ((grantsQuery.data ?? []) as AccessCodeGrantRow[]);
  const now = new Date();
  const canManageBilling = rows.some((row) => row.provider === "stripe" && row.customer_id);
  const paid =
    userIsPaidFromRows({ subscriptions: rows, grants, entitlement: "talent_pro", now }) ||
    userIsPaidFromRows({ subscriptions: rows, grants, entitlement: "community_pro", now });
  if (!paid) return { label: "Free Plan", canManageBilling };
  const liveCount = rows.filter((row) => isLiveSubscriptionRow(row, now)).length;
  return { label: liveCount > 1 ? "Dual Pro" : "Pro", canManageBilling };
}

const announcementAudiences = {
  all: "all",
  talent: "talent",
  community: "community",
  industry: "lookingForTalent",
} as const;

export type AnnouncementAudience = keyof typeof announcementAudiences;

function audiencePayload(audience: AnnouncementAudience) {
  return { account_types: [announcementAudiences[audience]] };
}

export async function previewAdminAnnouncement(
  audience: AnnouncementAudience,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!(await isPlatformAdmin())) return { ok: false, error: "Admins only." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { data, error } = await supabase.rpc("preview_platform_announcement_audience", {
    p_audience: audiencePayload(audience),
  });
  if (error) return { ok: false, error: "Could not preview that audience." };
  const count =
    typeof data === "number"
      ? data
      : data && typeof data === "object" && "count" in data
        ? Number((data as { count: unknown }).count)
        : 0;
  return { ok: true, count: Number.isFinite(count) ? count : 0 };
}

export async function sendAdminAnnouncement(input: {
  body: string;
  audience: AnnouncementAudience;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isPlatformAdmin())) return { ok: false, error: "Admins only." };
  const body = input.body.trim();
  if (!body) return { ok: false, error: "Write a message first." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { error } = await supabase.rpc("send_platform_announcement", {
    p_body: body,
    p_audience: audiencePayload(input.audience),
  });
  if (error) return { ok: false, error: "Could not send that announcement." };
  return { ok: true };
}

export async function loadProfilesToReview(): Promise<
  { ok: true; items: ProfileReviewItem[] } | { ok: false; error: string }
> {
  if (!(await isPlatformAdmin())) return { ok: false, error: "Admins only." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { data, error } = await supabase.rpc("list_profiles_pending_review");
  if (error) return { ok: false, error: "Couldn’t load the review queue." };
  const items = (Array.isArray(data) ? data : []).map((row) => {
    const item = row as Record<string, unknown>;
    return {
      userId: String(item.user_id ?? ""),
      displayName: text(item.display_name) || "Talent",
      username: text(item.username),
      headshotUrl: text(item.headshot_url),
      submittedAt: text(item.submitted_at),
    };
  }).filter((item) => item.userId);
  return { ok: true, items };
}

export async function reviewTalentProfile(input: {
  userId: string;
  action: "approve" | "decline";
  feedback?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isPlatformAdmin())) return { ok: false, error: "Admins only." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { error } = await supabase.rpc("review_profile", {
    p_user_id: input.userId,
    p_action: input.action,
    p_feedback: input.feedback?.trim() || null,
  });
  if (error) return { ok: false, error: "Couldn’t review that profile." };
  revalidatePath("/settings");
  return { ok: true };
}
