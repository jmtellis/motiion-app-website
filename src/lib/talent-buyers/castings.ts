import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readPagedRows } from "@/lib/supabase/read-pages";
import { fetchAccessibleProjectRecord } from "./projects";
import type { ChildCastingRecord } from "@/lib/talent-buyers/casting-child-payload";
import type { CastingProjectRecord } from "@/types/casting";

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

  const project = await fetchAccessibleProjectRecord(projectId, posterId);
  if (!project) return [];

  const { data: castings, error: castingsError } = await readPagedRows((from, to) => supabase
    .from("castings")
    .select("id, project_id, title, visibility, status, created_at, updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false }).order("id").range(from, to));
  if (castingsError) throw new Error("Could not load casting details. Please retry.");

  const castingIds = (castings ?? []).map((row) => row.id as string);
  const { data: castingRoles, error: roleError } = castingIds.length
    ? await readPagedRows((from, to) => supabase.from("casting_roles").select("id, casting_id").in("casting_id", castingIds).order("id").range(from, to))
    : { data: [], error: null };
  if (roleError) throw new Error("Could not load casting roles. Please retry.");

  const summaries: ProjectCastingSummary[] = (castings ?? []).map((row) => ({
    id: row.id as string,
    projectId,
    title: (row.title as string) || "Untitled casting",
    status: (row.status as string) || "draft",
    visibility: (row.visibility as string) || "public",
    roleCount: (castingRoles ?? []).filter((role) => role.casting_id === row.id).length,
    updatedAt: (row.updated_at as string) ?? (row.created_at as string) ?? new Date().toISOString(),
  }));

  const { data: legacyRoles, error: legacyError } = await readPagedRows((from, to) => supabase
    .from("roles")
    .select("id")
    .eq("project_id", projectId)
    .is("casting_id", null).order("id").range(from, to));
  if (legacyError) throw new Error("Could not load legacy casting roles. Please retry.");

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

  if (error) throw new Error("Could not load this casting. Please retry.");
  if (!casting) return null;

  const project = await fetchAccessibleProjectRecord(projectId, posterId);
  if (!project) return null;

  const { data: roles, error: rolesError } = await readPagedRows((from, to) => supabase
    .from("casting_roles")
    .select("*")
    .eq("casting_id", castingId).order("id").range(from, to));

  const { data: bridgedRoles, error: bridgeError } = await readPagedRows((from, to) => supabase
    .from("roles")
    .select("id, title, visibility, password_hash, card_color_preset, cover_image_url, agency_required, slate_required, max_submission_links, submission_limit, talent_pays_travel, height_min, height_max")
    .eq("casting_id", castingId).order("id").range(from, to));
  if (rolesError || bridgeError) throw new Error("Could not load this casting's roles. Please retry.");

  return {
    casting: casting as ChildCastingRecord,
    roles: (roles ?? []) as import("@/lib/talent-buyers/casting-child-payload").ChildCastingRoleRecord[],
    bridgedRoles: bridgedRoles ?? [],
  };
}
