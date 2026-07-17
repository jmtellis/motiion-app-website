import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ChildCastingRecord } from "@/lib/talent-buyers/casting-child-payload";
import type { CastingProjectRecord, CastingRoleRecord } from "@/types/casting";

export type ProjectCastingSummary = {
  id: string;
  projectId: string;
  title: string;
  status: string;
  visibility: string;
  roleCount: number;
  updatedAt: string;
  isLegacy?: boolean;
};

function legacyCastingFromProject(project: CastingProjectRecord, roleCount: number): ProjectCastingSummary | null {
  const hasCastingData =
    project.casting_configuration &&
    (project.casting_configuration.casting_kinds?.length ||
      project.casting_configuration.composer_draft === false ||
      roleCount > 0);

  if (!hasCastingData && roleCount === 0) return null;

  return {
    id: `legacy-${project.id}`,
    projectId: project.id,
    title: project.title || "Untitled casting",
    status: project.is_active === false ? "draft" : "open",
    visibility: project.visibility ?? "public",
    roleCount,
    updatedAt: project.updated_at ?? project.created_at ?? new Date().toISOString(),
    isLegacy: true,
  };
}

export async function listProjectCastings(
  projectId: string,
  posterId: string,
): Promise<ProjectCastingSummary[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("poster_id", posterId)
    .maybeSingle();

  if (!project) return [];

  const { data: castings } = await supabase
    .from("castings")
    .select("id, project_id, title, visibility, status, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const castingIds = (castings ?? []).map((row) => row.id as string);
  const { data: castingRoles } = castingIds.length
    ? await supabase.from("casting_roles").select("id, casting_id").in("casting_id", castingIds)
    : { data: [] };

  const summaries: ProjectCastingSummary[] = (castings ?? []).map((row) => ({
    id: row.id as string,
    projectId,
    title: (row.title as string) || "Untitled casting",
    status: (row.status as string) || "draft",
    visibility: (row.visibility as string) || "public",
    roleCount: (castingRoles ?? []).filter((role) => role.casting_id === row.id).length,
    updatedAt: (row.created_at as string) ?? new Date().toISOString(),
  }));

  const { data: legacyRoles } = await supabase
    .from("roles")
    .select("id")
    .eq("project_id", projectId)
    .is("casting_id", null);

  const legacy = legacyCastingFromProject(project as CastingProjectRecord, legacyRoles?.length ?? 0);
  if (legacy && !summaries.length) {
    return [legacy];
  }

  return summaries;
}

export async function fetchChildCastingDetail(castingId: string, projectId: string, posterId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: casting, error } = await supabase
    .from("castings")
    .select("*")
    .eq("id", castingId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error || !casting) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("id, poster_id")
    .eq("id", projectId)
    .eq("poster_id", posterId)
    .maybeSingle();

  if (!project) return null;

  const { data: roles } = await supabase
    .from("casting_roles")
    .select("*")
    .eq("casting_id", castingId);

  const { data: bridgedRoles } = await supabase
    .from("roles")
    .select("id, title, visibility, password_hash, card_color_preset, cover_image_url, agency_required, height_min, height_max")
    .eq("casting_id", castingId);

  return {
    casting: casting as ChildCastingRecord,
    roles: (roles ?? []) as import("@/lib/talent-buyers/casting-child-payload").ChildCastingRoleRecord[],
    bridgedRoles: bridgedRoles ?? [],
  };
}
