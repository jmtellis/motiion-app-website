"use server";

import { revalidatePath } from "next/cache";

import {
  buildBridgedRoleRow,
  buildChildCastingRoleRow,
  buildChildCastingRow,
} from "@/lib/talent-buyers/casting-child-payload";
import {
  isPublicOpenCallForMatchNotify,
  normalizeCastingConfigurationForMobile,
} from "@/lib/talent-buyers/casting/casting-configuration-mobile";
import { buildRolePublicationSnapshot } from "@/lib/talent-buyers/casting/role-publication-snapshot";
import {
  notifyCastingMatchesForRoles,
  syncProjectCastingConfiguration,
} from "@/lib/talent-buyers/casting/sync-project-casting-config";
import {
  parseCastingComposerForm,
  parseCastingDraftForm,
} from "@/lib/talent-buyers/casting-schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublishCastingResult, SaveCastingDraftResult } from "@/types/casting";

async function requirePosterSession() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false as const, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "You must be signed in." };

  return { ok: true as const, supabase, userId: user.id };
}

async function assertProjectAccess(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  projectId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("poster_id", userId)
    .maybeSingle();

  return !error && Boolean(data);
}

async function syncCastingRoles(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  posterId: string,
  projectId: string,
  castingId: string,
  form: NonNullable<ReturnType<typeof parseCastingComposerForm>["data"]>,
  isDraft: boolean,
) {
  const [{ data: existingCastingRoles }, { data: existingBridgedRoles }] = await Promise.all([
    supabase
      .from("casting_roles")
      .select("id, title")
      .eq("casting_id", castingId)
      .order("created_at", { ascending: true }),
    supabase
      .from("roles")
      .select("id, title")
      .eq("casting_id", castingId)
      .order("created_at", { ascending: true }),
  ]);

  const castingRoles = existingCastingRoles ?? [];
  const bridgedRoles = existingBridgedRoles ?? [];
  const bridgedByCastingRoleId = new Map<string, string>();

  for (const castingRole of castingRoles) {
    const castingRoleId = castingRole.id as string;
    const normalizedTitle = castingRole.title?.trim().toLowerCase() ?? "";
    const bridged =
      bridgedRoles.find(
        (role) => (role.title as string)?.trim().toLowerCase() === normalizedTitle,
      ) ?? bridgedRoles[castingRoles.indexOf(castingRole)];
    if (bridged?.id) bridgedByCastingRoleId.set(castingRoleId, bridged.id as string);
  }

  const formRoleIds = new Set(
    form.roles.map((role) => role.id).filter((id): id is string => Boolean(id)),
  );
  const roleIds: string[] = [];

  for (const role of form.roles) {
    const snapshot = buildRolePublicationSnapshot(role, form);
    const roleWithSnapshot = { ...role, clientMatchFilters: snapshot };
    const castingRolePayload = buildChildCastingRoleRow(castingId, roleWithSnapshot, snapshot);
    const bridgedRolePayload = buildBridgedRoleRow(
      posterId,
      projectId,
      castingId,
      form,
      roleWithSnapshot,
      isDraft,
      snapshot,
    );

    const existingCastingRoleId = role.id && formRoleIds.has(role.id) ? role.id : null;

    if (existingCastingRoleId && castingRoles.some((item) => item.id === existingCastingRoleId)) {
      const { error: castingRoleError } = await supabase
        .from("casting_roles")
        .update(castingRolePayload)
        .eq("id", existingCastingRoleId);

      if (castingRoleError) {
        return { ok: false as const, error: castingRoleError.message ?? "Failed to update casting role." };
      }

      const bridgedRoleId = bridgedByCastingRoleId.get(existingCastingRoleId);
      if (bridgedRoleId) {
        const { error: bridgedError } = await supabase
          .from("roles")
          .update(bridgedRolePayload)
          .eq("id", bridgedRoleId);

        if (bridgedError) {
          return { ok: false as const, error: bridgedError.message ?? "Failed to update bridged role." };
        }

        roleIds.push(bridgedRoleId);
      } else {
        const { data: insertedBridged, error: bridgeError } = await supabase
          .from("roles")
          .insert(bridgedRolePayload)
          .select("id")
          .single();

        if (bridgeError || !insertedBridged?.id) {
          return {
            ok: false as const,
            error: bridgeError?.message ?? "Failed to bridge casting role.",
          };
        }

        roleIds.push(insertedBridged.id as string);
      }
    } else {
      const { data: childRole, error: childError } = await supabase
        .from("casting_roles")
        .insert(castingRolePayload)
        .select("id")
        .single();

      if (childError || !childRole?.id) {
        return { ok: false as const, error: childError?.message ?? "Failed to save casting role." };
      }

      const { data: bridgedRole, error: bridgeError } = await supabase
        .from("roles")
        .insert(bridgedRolePayload)
        .select("id")
        .single();

      if (bridgeError || !bridgedRole?.id) {
        return { ok: false as const, error: bridgeError?.message ?? "Failed to bridge casting role." };
      }

      roleIds.push(bridgedRole.id as string);
    }
  }

  const removedCastingRoles = castingRoles.filter((item) => !formRoleIds.has(item.id as string));
  if (removedCastingRoles.length) {
    const bridgedIdsToMaybeDelete = removedCastingRoles
      .map((item) => bridgedByCastingRoleId.get(item.id as string))
      .filter((id): id is string => Boolean(id));

    const submissionCounts =
      bridgedIdsToMaybeDelete.length > 0
        ? await supabase.rpc("list_role_submission_counts", { p_role_ids: bridgedIdsToMaybeDelete })
        : { data: {} as Record<string, { total?: number }> };

    const counts = (submissionCounts.data ?? {}) as Record<string, { total?: number }>;

    for (const castingRole of removedCastingRoles) {
      const castingRoleId = castingRole.id as string;
      const bridgedRoleId = bridgedByCastingRoleId.get(castingRoleId);
      const submissionTotal = bridgedRoleId ? (counts[bridgedRoleId]?.total ?? 0) : 0;

      if (submissionTotal > 0) continue;

      if (bridgedRoleId) {
        await supabase.from("roles").delete().eq("id", bridgedRoleId);
      }
      await supabase.from("casting_roles").delete().eq("id", castingRoleId);
    }
  }

  return { ok: true as const, roleIds };
}

function revalidateCastingModulePaths(projectId: string, castingId?: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/castings`);
  if (castingId) {
    revalidatePath(`/projects/${projectId}/castings/${castingId}/edit`);
  }
}

export async function saveProjectCastingDraft(
  projectId: string,
  payload: unknown,
): Promise<SaveCastingDraftResult> {
  const parsed = parseCastingDraftForm(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check casting details." };
  }

  const session = await requirePosterSession();
  if (!session.ok) return { ok: false, error: session.error };

  const { supabase, userId } = session;
  const form = { ...parsed.data, projectId };

  if (!(await assertProjectAccess(supabase, projectId, userId))) {
    return { ok: false, error: "Project not found." };
  }

  const castingRow = buildChildCastingRow(projectId, form, true);
  const mobileConfiguration = normalizeCastingConfigurationForMobile(form, true);

  if (form.castingId) {
    const { error } = await supabase
      .from("castings")
      .update({ ...castingRow, configuration: { ...castingRow.configuration, ...mobileConfiguration } })
      .eq("id", form.castingId);
    if (error) return { ok: false, error: error.message };

    const rolesResult = await syncCastingRoles(supabase, userId, projectId, form.castingId, form, true);
    if (!rolesResult.ok) return { ok: false, error: rolesResult.error };

    await syncProjectCastingConfiguration(supabase, projectId, mobileConfiguration, true, form);

    revalidateCastingModulePaths(projectId, form.castingId);
    return { ok: true, projectId, roleIds: rolesResult.roleIds, castingId: form.castingId };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("castings")
    .insert({ ...castingRow, configuration: { ...castingRow.configuration, ...mobileConfiguration } })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    return { ok: false, error: insertError?.message ?? "Failed to save casting draft." };
  }

  const castingId = inserted.id as string;
  const rolesResult = await syncCastingRoles(supabase, userId, projectId, castingId, form, true);
  if (!rolesResult.ok) {
    await supabase.from("castings").delete().eq("id", castingId);
    return { ok: false, error: rolesResult.error };
  }

  await syncProjectCastingConfiguration(supabase, projectId, mobileConfiguration, true, form);

  revalidateCastingModulePaths(projectId, castingId);
  return { ok: true, projectId, roleIds: rolesResult.roleIds, castingId };
}

export async function publishProjectCasting(
  projectId: string,
  payload: unknown,
): Promise<PublishCastingResult> {
  const parsed = parseCastingComposerForm(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check casting details." };
  }

  const session = await requirePosterSession();
  if (!session.ok) return { ok: false, error: session.error };

  const { supabase, userId } = session;
  const form = { ...parsed.data, projectId };

  if (!(await assertProjectAccess(supabase, projectId, userId))) {
    return { ok: false, error: "Project not found." };
  }

  const mobileConfiguration = normalizeCastingConfigurationForMobile(form, false);
  const baseCastingRow = buildChildCastingRow(projectId, form, false);
  const castingRow = {
    ...baseCastingRow,
    configuration: {
      ...baseCastingRow.configuration,
      ...mobileConfiguration,
    },
  };
  let castingId = form.castingId ?? null;

  if (castingId) {
    const { error } = await supabase.from("castings").update(castingRow).eq("id", castingId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: inserted, error } = await supabase.from("castings").insert(castingRow).select("id").single();
    if (error || !inserted?.id) return { ok: false, error: error?.message ?? "Failed to publish casting." };
    castingId = inserted.id as string;
  }

  const rolesResult = await syncCastingRoles(supabase, userId, projectId, castingId, form, false);
  if (!rolesResult.ok) return { ok: false, error: rolesResult.error };

  await syncProjectCastingConfiguration(supabase, projectId, mobileConfiguration, false, form);
  await notifyCastingMatchesForRoles(supabase, rolesResult.roleIds, {
    isPublicOpenCall: isPublicOpenCallForMatchNotify(form),
  });

  revalidateCastingModulePaths(projectId, castingId);
  return {
    ok: true,
    projectId,
    roleIds: rolesResult.roleIds,
    publicRoleId: rolesResult.roleIds[0],
    castingId,
  };
}
