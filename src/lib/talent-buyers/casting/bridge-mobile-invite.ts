import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { createServerSupabaseClient } from "@/lib/supabase/server";

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

export type BridgeMobileInviteInput = {
  invitedProfileId: string;
  roleIds?: string[];
  castingId?: string | null;
  /** When set, used as the sole bridged role id (navigator / roster paths). */
  roleId?: string | null;
};

export type BridgeMobileInviteResult = {
  bridged: number;
  skipped: number;
  errors: string[];
};

type SwipeInviteRpcResult = {
  ok?: boolean;
  error?: string;
};

async function resolveTalentUserId(
  supabase: SupabaseClient,
  profileId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("professional_profiles")
    .select("user_id")
    .eq("id", profileId)
    .maybeSingle<{ user_id: string }>();

  return data?.user_id ?? null;
}

async function resolveBridgedRoleIds(
  supabase: SupabaseClient,
  input: BridgeMobileInviteInput,
): Promise<string[]> {
  const resolved = new Set<string>();

  if (input.roleId) {
    resolved.add(input.roleId);
  }

  for (const id of input.roleIds ?? []) {
    if (id) resolved.add(id);
  }

  if (resolved.size === 0 && input.castingId) {
    const { data: roles } = await supabase.from("roles").select("id").eq("casting_id", input.castingId);
    for (const row of roles ?? []) {
      if (row.id) resolved.add(row.id as string);
    }
  }

  return [...resolved];
}

async function adminInsertPendingRoleAccess(roleId: string, talentUserId: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  if (!admin) return false;

  const { error: insertError } = await admin.from("role_access").insert({
    role_id: roleId,
    talent_id: talentUserId,
    status: "pending",
  });

  if (!insertError) return true;

  if (insertError.code !== "23505") return false;

  const { error: updateError } = await admin
    .from("role_access")
    .update({ status: "pending" })
    .eq("role_id", roleId)
    .eq("talent_id", talentUserId)
    .neq("status", "accepted");

  return !updateError;
}

async function bridgeOneRoleInvite(
  supabase: SupabaseClient,
  roleId: string,
  talentUserId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("create_casting_swipe_invite", {
    p_role_id: roleId,
    p_talent_id: talentUserId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const result = (data ?? {}) as SwipeInviteRpcResult;
  if (result.ok) return { ok: true };

  if (result.error === "forbidden") {
    const inserted = await adminInsertPendingRoleAccess(roleId, talentUserId);
    return inserted ? { ok: true } : { ok: false, error: "forbidden" };
  }

  return { ok: false, error: result.error ?? "invite_failed" };
}

/** Mirror a web casting invitation into iOS-native role_access + notifications. */
export async function bridgeWebInviteToMobile(
  supabase: SupabaseClient,
  input: BridgeMobileInviteInput,
): Promise<BridgeMobileInviteResult> {
  const talentUserId = await resolveTalentUserId(supabase, input.invitedProfileId);
  if (!talentUserId) {
    return { bridged: 0, skipped: 1, errors: ["Talent account not linked to profile"] };
  }

  const roleIds = await resolveBridgedRoleIds(supabase, input);
  if (!roleIds.length) {
    return { bridged: 0, skipped: 1, errors: ["No bridged casting roles to invite"] };
  }

  let bridged = 0;
  const errors: string[] = [];

  for (const roleId of roleIds) {
    const outcome = await bridgeOneRoleInvite(supabase, roleId, talentUserId);
    if (outcome.ok) {
      bridged += 1;
    } else if (outcome.error) {
      errors.push(`${roleId}: ${outcome.error}`);
    }
  }

  return { bridged, skipped: roleIds.length - bridged, errors };
}

/** Resolve child castings.id from a bridged roles.id when possible. */
export async function resolveCastingIdFromRoleId(
  supabase: SupabaseClient,
  roleId: string | null,
): Promise<string | null> {
  if (!roleId) return null;

  const { data } = await supabase
    .from("roles")
    .select("casting_id")
    .eq("id", roleId)
    .maybeSingle<{ casting_id: string | null }>();

  return data?.casting_id ?? null;
}
