"use server";

import { z } from "zod";
import { requireIndustryApproval } from "./require-industry-approval";
import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readPagedRows } from "@/lib/supabase/read-pages";
import { groupClientFeedback, tallyClientFeedback, type ClientFeedbackRow, type ClientReviewFeedback } from "./casting/client-feedback";

export type ShortlistLinkDuration =
  | "two_hours"
  | "twenty_four_hours"
  | "one_week"
  | "until_casting_closes";

export type ShortlistShareSummary = {
  id: string;
  roleId: string;
  roleIds: string[];
  token: string;
  title: string | null;
  isActive: boolean;
  expiresAt: string | null;
  expirationKind: string | null;
  createdAt: string;
  publicUrl: string;
};

function durationExpiresAt(duration: ShortlistLinkDuration): string | null {
  const now = Date.now();
  switch (duration) {
    case "two_hours":
      return new Date(now + 2 * 60 * 60 * 1000).toISOString();
    case "twenty_four_hours":
      return new Date(now + 24 * 60 * 60 * 1000).toISOString();
    case "one_week":
      return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    case "until_casting_closes":
      return null;
    default:
      return null;
  }
}

function publicShortlistUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app";
  return `${base.replace(/\/$/, "")}/shortlist/${token}`;
}

function uniqueRoleIds(roleIds: string[]): string[] {
  if (!Array.isArray(roleIds)) return [];
  return [...new Set(roleIds.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean))];
}

function mapShareRow(row: Record<string, unknown>): ShortlistShareSummary {
  const roleId = row.role_id as string;
  const roleIdsRaw = row.role_ids as string[] | null;
  const roleIds = uniqueRoleIds(roleIdsRaw?.length ? roleIdsRaw : [roleId]);
  return {
    id: row.id as string,
    roleId,
    roleIds,
    token: row.token as string,
    title: (row.title as string | null) ?? null,
    isActive: Boolean(row.is_active),
    expiresAt: (row.expires_at as string | null) ?? null,
    expirationKind: (row.expiration_kind as string | null) ?? null,
    createdAt: row.created_at as string,
    publicUrl: publicShortlistUrl(row.token as string),
  };
}

async function assertRoleAccess(
  roleId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string; projectId?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { data: role, error } = await supabase
    .from("roles")
    .select("id, title, project_id, poster_id")
    .eq("id", roleId)
    .maybeSingle<{ id: string; title: string; project_id: string; poster_id: string }>();

  if (error || !role) return { ok: false, error: "Role not found." };

  if (role.poster_id !== userId) {
    const { data: member } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", role.project_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) return { ok: false, error: "You do not have access to this role." };
  }

  return { ok: true, projectId: role.project_id };
}

export async function listShortlistSharesForRoles(roleIds: string[]): Promise<{
  shares: ShortlistShareSummary[];
  error?: string;
}> {
  const ids = uniqueRoleIds(roleIds);
  if (!ids.length) return { shares: [] };
  if (!z.array(z.string().uuid()).max(100).safeParse(ids).success) return { shares: [], error: "Choose valid casting roles." };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { shares: [], error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { shares: [], error: "You must be signed in." };

  const access = await assertRoleAccess(ids[0], user.id);
  if (!access.ok) return { shares: [], error: access.error };

  const now = new Date().toISOString();
  const { data, error } = await readPagedRows((from, to) => supabase
    .from("casting_shortlist_shares")
    .select("id, role_id, role_ids, token, title, is_active, expires_at, expiration_kind, created_at")
    .eq("is_active", true)
    .eq("owner_user_id", user.id)
    .or(`role_id.in.(${ids.join(",")}),role_ids.ov.{${ids.join(",")}}`)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false }).order("id")
    .range(from, to));
  if (error) return { shares: [], error: error.message };
  return { shares: (data ?? []).map((row) => mapShareRow(row as Record<string, unknown>)) };
}

/** @deprecated Prefer listShortlistSharesForRoles */
export async function listRoleShortlistShares(roleId: string): Promise<{
  shares: ShortlistShareSummary[];
  error?: string;
}> {
  return listShortlistSharesForRoles([roleId]);
}

export async function createRoleShortlistShare(input: {
  roleId?: string;
  roleIds?: string[];
  roleTitle: string;
  duration: ShortlistLinkDuration;
}): Promise<{ ok: boolean; share?: ShortlistShareSummary; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const roleIds = uniqueRoleIds([
    ...(input.roleIds ?? []),
    ...(input.roleId ? [input.roleId] : []),
  ]);
  if (!roleIds.length) return { ok: false, error: "Select at least one role." };

  if (!z.array(z.string().uuid()).max(100).safeParse(roleIds).success || !["two_hours", "twenty_four_hours", "one_week", "until_casting_closes"].includes(input.duration)) return { ok: false, error: "Choose valid roles and a link duration." };
  const approval = await requireIndustryApproval(user.id);
  if (!approval.ok) return { ok: false, error: approval.error };
  const primaryRoleId = roleIds[0];
  const access = await assertRoleAccess(primaryRoleId, user.id);
  if (!access.ok || !access.projectId) return { ok: false, error: access.error };

  const operator = await supabase.rpc("is_project_operator", { p_project_id: access.projectId, p_user_id: user.id });
  if (operator.error || !operator.data) return { ok: false, error: "Only the project owner or an approved admin can share casting reviews." };
  for (const roleId of roleIds.slice(1)) {
    const nextAccess = await assertRoleAccess(roleId, user.id);
    if (!nextAccess.ok || nextAccess.projectId !== access.projectId) return { ok: false, error: "Every role must belong to this project." };
  }

  const { data: share, error } = await supabase
    .from("casting_shortlist_shares")
    .insert({
      role_id: primaryRoleId,
      role_ids: roleIds,
      owner_user_id: user.id,
      title: input.roleTitle,
      is_active: true,
      expires_at: durationExpiresAt(input.duration),
      expiration_kind: input.duration,
    })
    .select("id, role_id, role_ids, token, title, is_active, expires_at, expiration_kind, created_at")
    .single();

  if (error || !share) return { ok: false, error: error?.message ?? "Could not create share link." };

  const recipient = await supabase.from("casting_shortlist_share_recipients").insert({
    share_id: share.id,
    display_name: "Client",
    sort_order: 0,
  });
  if (recipient.error) {
    await supabase.from("casting_shortlist_shares").update({ is_active: false }).eq("id", share.id).eq("owner_user_id", user.id);
    return { ok: false, error: "Could not prepare client review. Please retry creating the link." };
  }

  await trackServerEvent("shortlist_share_created", {
    role_id: primaryRoleId,
    role_ids: roleIds,
    project_id: access.projectId,
    share_id: share.id,
  });

  revalidatePath(`/projects/${access.projectId}`);
  revalidatePath("/library");

  return { ok: true, share: mapShareRow(share as Record<string, unknown>) };
}

export async function deactivateShortlistShare(shareId: string): Promise<{ ok: boolean; error?: string }> {
  if (!z.string().uuid().safeParse(shareId).success) return { ok: false, error: "Invalid review link." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { data, error } = await supabase
    .from("casting_shortlist_shares")
    .update({ is_active: false })
    .eq("id", shareId)
    .eq("owner_user_id", user.id)
    .select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "This link is unavailable or you do not own it." };

  revalidatePath("/library");
  revalidatePath("/projects");
  return { ok: true };
}

export type ShortlistVoteTally = {
  submissionId: string;
  yesCount: number;
  noCount: number;
};

/** Saved feedback includes expired and revoked links, matching the current iOS history. */
export async function fetchClientFeedbackForRoles(roleIds: string[]): Promise<{ feedback: ClientReviewFeedback[]; error?: string }> {
  const ids = uniqueRoleIds(roleIds);
  if (!ids.length) return { feedback: [] };
  if (!z.array(z.string().uuid()).max(100).safeParse(ids).success) return { feedback: [], error: "Choose valid casting roles." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { feedback: [], error: "Supabase is not configured." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { feedback: [], error: "You must be signed in." };
  const access = await assertRoleAccess(ids[0], user.id);
  if (!access.ok) return { feedback: [], error: access.error };
  const { data, error } = await readPagedRows((from, to) => supabase
    .from("casting_shortlist_share_votes")
    .select("id,recipient_id,submission_id,vote,updated_at,submission:submissions!inner(role_id,talent(full_name)),reviewer:casting_shortlist_share_recipients(display_name)")
    .in("submission.role_id", ids)
    .order("id").range(from, to));
  if (error) return { feedback: [], error: error.message };
  return { feedback: groupClientFeedback((data ?? []) as unknown as ClientFeedbackRow[], ids) };
}

export async function fetchShortlistVoteTalliesForRoles(roleIds: string[]): Promise<{
  talliesBySubmissionId: Record<string, ShortlistVoteTally>;
  error?: string;
}> {
  const result = await fetchClientFeedbackForRoles(roleIds);
  if (result.error) return { talliesBySubmissionId: {}, error: result.error };
  return { talliesBySubmissionId: tallyClientFeedback(result.feedback) };
}
