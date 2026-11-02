import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { castingComposerFormSchema } from "@/lib/talent-buyers/casting-schema";
import { childCastingToComposerForm } from "@/lib/talent-buyers/casting-child-payload";
import { isPublicOpenCallForMatchNotify } from "@/lib/talent-buyers/casting/casting-configuration-mobile";
import {
  notifyCastingMatchesForRoles,
  syncProjectCastingConfigurationFromCastingId,
} from "@/lib/talent-buyers/casting/sync-project-casting-config";

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

/** Activate a child casting for talent discovery/submit without re-running the full composer publish. */
export async function activatePublishedCasting(
  supabase: SupabaseClient,
  projectId: string,
  castingId: string,
): Promise<{ ok: true; roleIds: string[] } | { ok: false; error: string }> {
  const { data: casting, error: castingError } = await supabase
    .from("castings")
    .select("*")
    .eq("id", castingId)
    .maybeSingle();

  if (castingError || !casting) {
    return { ok: false, error: castingError?.message ?? "Casting not found." };
  }

  const { data: castingRoles, error: castingRolesError } = await supabase
    .from("casting_roles")
    .select("*")
    .eq("casting_id", castingId);

  const { data: bridgedRoles, error: bridgedRolesError } = await supabase
    .from("roles")
    .select("id, title, visibility, password_hash, card_color_preset, cover_image_url, agency_required, slate_required, max_submission_links, submission_limit, talent_pays_travel, height_min, height_max, is_casting_finalized")
    .eq("casting_id", castingId);

  if (castingRolesError || bridgedRolesError) return { ok: false, error: "Could not load roles before publication. Please retry." };
  if (!bridgedRoles?.some((role) => !role.is_casting_finalized)) return { ok: false, error: "Add an open role before publishing this casting." };
  const form = childCastingToComposerForm(
    casting as Parameters<typeof childCastingToComposerForm>[0],
    (castingRoles ?? []) as Parameters<typeof childCastingToComposerForm>[1],
    projectId,
    bridgedRoles ?? [],
  );

  const valid = castingComposerFormSchema.safeParse(form);
  if (!valid.success) return { ok: false, error: valid.error.issues[0]?.message || "Complete the casting breakdown before publishing." };

  const { error: statusError } = await supabase
    .from("castings")
    .update({ status: "open", updated_at: new Date().toISOString() })
    .eq("id", castingId);

  if (statusError) return { ok: false, error: statusError.message };

  const { data: activatedRoles, error: rolesError } = await supabase
    .from("roles")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("casting_id", castingId)
    .or("is_casting_finalized.is.null,is_casting_finalized.eq.false")
    .select("id");

  if (rolesError) return { ok: false, error: rolesError.message };

  const roleIds = (activatedRoles ?? []).map((row) => row.id as string);
  await syncProjectCastingConfigurationFromCastingId(supabase, projectId, castingId, false, {
    ...form,
    projectId,
    castingId,
  });
  await notifyCastingMatchesForRoles(supabase, roleIds, {
    isPublicOpenCall: isPublicOpenCallForMatchNotify(form),
  });

  return { ok: true, roleIds };
}
