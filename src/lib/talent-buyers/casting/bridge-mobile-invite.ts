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
  const { data, error } = await supabase
    .from("professional_profiles")
    .select("user_id")
    .eq("id", profileId)
    .maybeSingle<{ user_id: string }>();

  if (error) throw new Error("Could not check this talent profile. Please retry.");
  if (data?.user_id) return data.user_id;
  // Private talent may be visible through their own submitted application even
  // when the public profile table is correctly hidden by RLS. This RPC checks
  // that relationship; it does not elevate the caller's permissions.
  const hydrated = await supabase.rpc("hydrate_library_member_cards", { p_profile_ids: [profileId] });
  if (hydrated.error) throw new Error("Could not check access to this talent profile. Please retry.");
  const cards = (hydrated.data ?? []) as { profile_id: string; user_id: string }[];
  return cards.find((card) => card.profile_id === profileId)?.user_id ?? null;
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
    const { data: roles, error } = await supabase.from("roles").select("id").eq("casting_id", input.castingId);
    if (error) throw new Error("Could not load the casting roles. Please retry.");
    for (const row of roles ?? []) {
      if (row.id) resolved.add(row.id as string);
    }
  }

  return [...resolved];
}

async function bridgeOneRoleInvite(
  supabase: SupabaseClient,
  roleId: string,
  talentUserId: string,
): Promise<{ ok: boolean; error?: string }> {
  const existing = await supabase.from("role_access").select("status").eq("role_id", roleId).eq("talent_id", talentUserId).maybeSingle();
  if (existing.error) return { ok: false, error: "Could not check the current invitation. Please retry." };
  if (existing.data && ["pending", "accepted"].includes(existing.data.status)) return { ok: true };
  const { data, error } = await supabase.rpc("create_casting_swipe_invite", {
    p_role_id: roleId,
    p_talent_id: talentUserId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const result = (data ?? {}) as SwipeInviteRpcResult;
  if (result.ok) return { ok: true };

  return { ok: false, error: result.error ?? "invite_failed" };
}

/** Mirror a web casting invitation into iOS-native role_access + notifications. */
export async function bridgeWebInviteToMobile(
  supabase: SupabaseClient,
  input: BridgeMobileInviteInput,
): Promise<BridgeMobileInviteResult> {
  try {
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
  } catch (error) {
    return { bridged: 0, skipped: 1, errors: [error instanceof Error ? error.message : "Could not send this invitation. Please retry."] };
  }
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
