import {
  fetchTalentProfileBundles,
  isGenericApplicantName,
} from "@/lib/talent-buyers/casting/submission-talent";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isProjectDraft } from "@/lib/talent-buyers/project-payload";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import { normalizeSubmissionStatus, type SubmissionStatus } from "@/lib/talent-buyers/submission-status";
import type {
  CastingProjectDetail,
  CastingProjectRecord,
  CastingRoleRecord,
} from "@/types/casting";
import type { BuyerProjectSummary } from "@/types/talent-buyer-dashboard";

function isDraftProject(project: CastingProjectRecord) {
  return isProjectDraft(project);
}

function projectStatus(project: CastingProjectRecord): BuyerProjectSummary["status"] {
  if (isDraftProject(project)) return "draft";
  if (project.is_active) return "active";
  return "archived";
}

export async function fetchPosterCastingSummaries(posterId: string): Promise<BuyerProjectSummary[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data: projects, error } = await supabase
    .from("projects")
    .select(
      "id, title, is_active, updated_at, created_at, casting_configuration, project_configuration, poster_id, cover_image_url, project_type, enabled_modules",
    )
    .eq("poster_id", posterId)
    .order("updated_at", { ascending: false });

  if (error || !projects?.length) {
    if (error) console.debug("fetchPosterCastingSummaries:", error.message);
    return [];
  }

  const projectIds = projects.map((project) => project.id as string);
  const { data: roles } = await supabase
    .from("roles")
    .select("id, project_id")
    .in("project_id", projectIds);

  const roleIds = (roles ?? []).map((role) => role.id as string);
  const submissionCounts = await fetchSubmissionCounts(roleIds);

  return projects.map((project) => {
    const projectRoles = (roles ?? []).filter((role) => role.project_id === project.id);
    const talentCount = projectRoles.reduce(
      (total, role) => total + (submissionCounts[role.id as string] ?? 0),
      0,
    );

    return {
      id: project.id as string,
      title: (project.title as string) || "Untitled project",
      projectType: getNormalizedProjectType(project.project_type as string | null),
      status: projectStatus(project as unknown as CastingProjectRecord),
      lastUpdated: (project.updated_at as string) ?? (project.created_at as string) ?? new Date().toISOString(),
      talentCount,
      coverImageUrl: (project.cover_image_url as string | null) ?? null,
    };
  });
}

async function fetchSubmissionCounts(roleIds: string[]) {
  if (!roleIds.length) return {} as Record<string, number>;

  const supabase = await createServerSupabaseClient();
  if (!supabase) return {};

  const { data, error } = await supabase.rpc("list_role_submission_counts", {
    p_role_ids: roleIds,
  });

  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    if (error) console.debug("list_role_submission_counts:", error.message);
    return {};
  }

  return Object.fromEntries(
    Object.entries(data as Record<string, { total?: number }>).map(([roleId, counts]) => [
      roleId,
      counts.total ?? 0,
    ]),
  );
}

export async function fetchPosterCastingDetail(
  projectId: string,
  posterId: string,
): Promise<CastingProjectDetail | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("poster_id", posterId)
    .maybeSingle<CastingProjectRecord>();

  if (projectError || !project) {
    if (projectError) console.debug("fetchPosterCastingDetail project:", projectError.message);
    return null;
  }

  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .returns<CastingRoleRecord[]>();

  if (rolesError) {
    console.debug("fetchPosterCastingDetail roles:", rolesError.message);
    return null;
  }

  const roleIds = (roles ?? []).map((role) => role.id);
  const submissionCounts = await fetchSubmissionCounts(roleIds);

  return {
    project,
    roles: roles ?? [],
    submissionCounts,
  };
}

export type ProjectSubmissionRow = {
  id: string;
  roleId: string;
  roleTitle: string;
  talentId: string | null;
  talentProfileId?: string | null;
  talentSlug?: string | null;
  fullName: string;
  email: string | null;
  agency: string | null;
  status: SubmissionStatus;
  submittedAt: string | null;
  headshotUrl: string | null;
  linkUrl: string | null;
};

/** Fetch submissions for a casting, including roles still linked by casting_id. */
export async function fetchCastingSubmissions(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  castingId: string,
  activeRoles: { id: string; title: string }[],
): Promise<ProjectSubmissionRow[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select(
      "id, role_id, talent_id, status, submitted_at, full_name, email, agency, headshot_url, link_url, roles!inner(id, title, casting_id)",
    )
    .eq("roles.casting_id", castingId)
    .order("submitted_at", { ascending: false })
    .limit(200);

  if (error) {
    console.debug("fetchCastingSubmissions:", error.message);
    return fetchProjectSubmissions(activeRoles);
  }

  const roleTitles = new Map(activeRoles.map((role) => [role.id, role.title]));

  const talentIds = (data ?? [])
    .map((row) => row.talent_id as string | null)
    .filter((id): id is string => Boolean(id));
  const talentBundles = await fetchTalentProfileBundles(supabase, talentIds);

  return (data ?? []).map((row) => {
    const roleJoin = Array.isArray(row.roles) ? row.roles[0] : row.roles;
    const roleId = (row.role_id as string) ?? (roleJoin as { id?: string } | null)?.id ?? "";
    const roleTitle =
      roleTitles.get(roleId) ??
      ((roleJoin as { title?: string } | null)?.title ?? "Role");
    const talentId = (row.talent_id as string | null) ?? null;
    const bundle = talentId ? talentBundles.get(talentId) : undefined;
    const rawName = (row.full_name as string | null)?.trim();

    return {
      id: row.id as string,
      roleId,
      roleTitle,
      talentId,
      fullName:
        rawName && !isGenericApplicantName(rawName)
          ? rawName
          : bundle?.fullName ?? rawName ?? "Unnamed applicant",
      email: (row.email as string | null) ?? bundle?.email ?? null,
      agency:
        (row.agency as string | null)?.trim() ||
        bundle?.agency ||
        null,
      status: normalizeSubmissionStatus(row.status as string),
      submittedAt: (row.submitted_at as string | null) ?? null,
      headshotUrl: (row.headshot_url as string | null) ?? bundle?.headshotUrl ?? null,
      linkUrl: (row.link_url as string | null) ?? null,
      talentProfileId: bundle?.professionalProfileId ?? null,
      talentSlug: bundle?.slug ?? null,
    };
  });
}

/** Fetch submissions across all roles in a project (buyer view of the talent board). */
export async function fetchProjectSubmissions(
  roleIdsWithTitles: { id: string; title: string }[],
): Promise<ProjectSubmissionRow[]> {
  if (!roleIdsWithTitles.length) return [];

  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const roleTitles = new Map(roleIdsWithTitles.map((role) => [role.id, role.title]));
  const { data, error } = await supabase
    .from("submissions")
    .select("id, role_id, talent_id, status, submitted_at, full_name, email, agency, headshot_url, link_url")
    .in(
      "role_id",
      roleIdsWithTitles.map((role) => role.id),
    )
    .order("submitted_at", { ascending: false })
    .limit(200);

  if (error) {
    console.debug("fetchProjectSubmissions:", error.message);
    return [];
  }

  const talentIds = (data ?? [])
    .map((row) => row.talent_id as string | null)
    .filter((id): id is string => Boolean(id));
  const talentBundles = await fetchTalentProfileBundles(supabase, talentIds);

  return (data ?? []).map((row) => {
    const talentId = (row.talent_id as string | null) ?? null;
    const bundle = talentId ? talentBundles.get(talentId) : undefined;
    const rawName = (row.full_name as string | null)?.trim();

    return {
      id: row.id as string,
      roleId: row.role_id as string,
      roleTitle: roleTitles.get(row.role_id as string) ?? "Role",
      talentId,
      fullName:
        rawName && !isGenericApplicantName(rawName)
          ? rawName
          : bundle?.fullName ?? rawName ?? "Unnamed applicant",
      email: (row.email as string | null) ?? bundle?.email ?? null,
      agency:
        (row.agency as string | null)?.trim() ||
        bundle?.agency ||
        null,
      status: normalizeSubmissionStatus(row.status as string),
      submittedAt: (row.submitted_at as string | null) ?? null,
      headshotUrl: (row.headshot_url as string | null) ?? bundle?.headshotUrl ?? null,
      linkUrl: (row.link_url as string | null) ?? null,
      talentProfileId: bundle?.professionalProfileId ?? null,
      talentSlug: bundle?.slug ?? null,
    };
  });
}

export function mapCastingDetailToSummary(detail: CastingProjectDetail): BuyerProjectSummary {
  const talentCount = detail.roles.reduce(
    (total, role) => total + (detail.submissionCounts[role.id] ?? 0),
    0,
  );

  return {
    id: detail.project.id,
    title: detail.project.title || "Untitled project",
    projectType: getNormalizedProjectType(detail.project.project_type),
    status: projectStatus(detail.project),
    lastUpdated:
      detail.project.updated_at ?? detail.project.created_at ?? new Date().toISOString(),
    talentCount,
    coverImageUrl: detail.project.cover_image_url ?? null,
  };
}

export function splitCastingSummaries(projects: BuyerProjectSummary[]) {
  const drafts = projects.filter((project) => project.status === "draft");
  const published = projects.filter((project) => project.status !== "draft");
  return { drafts, published };
}
