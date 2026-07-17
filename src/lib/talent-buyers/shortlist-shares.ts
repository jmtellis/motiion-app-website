"use server";

import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  return [...new Set(roleIds.map((id) => id.trim()).filter(Boolean))];
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

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { shares: [], error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { shares: [], error: "You must be signed in." };

  const access = await assertRoleAccess(ids[0], user.id);
  if (!access.ok) return { shares: [], error: access.error };

  const { data, error } = await supabase
    .from("casting_shortlist_shares")
    .select("id, role_id, role_ids, token, title, is_active, expires_at, expiration_kind, created_at")
    .eq("is_active", true)
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { shares: [], error: error.message };

  const idSet = new Set(ids);
  const shares = (data ?? [])
    .map((row) => mapShareRow(row as Record<string, unknown>))
    .filter(
      (share) => idSet.has(share.roleId) || share.roleIds.some((roleId) => idSet.has(roleId)),
    );

  return { shares };
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

  const primaryRoleId = roleIds[0];
  const access = await assertRoleAccess(primaryRoleId, user.id);
  if (!access.ok || !access.projectId) return { ok: false, error: access.error };

  for (const roleId of roleIds.slice(1)) {
    const nextAccess = await assertRoleAccess(roleId, user.id);
    if (!nextAccess.ok) return { ok: false, error: nextAccess.error };
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

  await supabase.from("casting_shortlist_share_recipients").insert({
    share_id: share.id,
    display_name: "Client",
    sort_order: 0,
  });

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
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase
    .from("casting_shortlist_shares")
    .update({ is_active: false })
    .eq("id", shareId)
    .eq("owner_user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/library");
  revalidatePath("/projects");
  return { ok: true };
}

export type ShortlistVoteTally = {
  submissionId: string;
  yesCount: number;
  noCount: number;
};

/** Aggregated client yes/no votes for submissions covered by active shares on these roles. */
export async function fetchShortlistVoteTalliesForRoles(roleIds: string[]): Promise<{
  talliesBySubmissionId: Record<string, ShortlistVoteTally>;
  error?: string;
}> {
  const ids = uniqueRoleIds(roleIds);
  if (!ids.length) return { talliesBySubmissionId: {} };

  const listed = await listShortlistSharesForRoles(ids);
  if (listed.error) return { talliesBySubmissionId: {}, error: listed.error };
  if (!listed.shares.length) return { talliesBySubmissionId: {} };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { talliesBySubmissionId: {}, error: "Supabase is not configured." };

  const shareIds = listed.shares.map((share) => share.id);
  const { data, error } = await supabase
    .from("casting_shortlist_share_votes")
    .select("submission_id, vote")
    .in("share_id", shareIds);

  if (error) return { talliesBySubmissionId: {}, error: error.message };

  const talliesBySubmissionId: Record<string, ShortlistVoteTally> = {};
  for (const row of data ?? []) {
    const submissionId = row.submission_id as string;
    if (!submissionId) continue;
    const current =
      talliesBySubmissionId[submissionId] ??
      ({ submissionId, yesCount: 0, noCount: 0 } satisfies ShortlistVoteTally);
    if (row.vote === "yes") current.yesCount += 1;
    if (row.vote === "no") current.noCount += 1;
    talliesBySubmissionId[submissionId] = current;
  }

  return { talliesBySubmissionId };
}
