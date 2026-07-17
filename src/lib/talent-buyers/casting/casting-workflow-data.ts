import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  normalizeCandidateStatus,
  submissionStatusToCandidateStatus,
} from "@/lib/talent-buyers/casting/casting-statuses";
import type {
  CastingCandidate,
  CastingCandidateSource,
  CastingEvaluation,
  CastingExternalCandidate,
  CastingInvitation,
  CastingProject,
  CastingProjectStatus,
  CastingReferral,
  CastingRole,
  CastingRoleStatus,
  CastingVisibility,
  CastingWorkflowData,
} from "@/lib/talent-buyers/casting/casting-types";
import { normalizeSubmissionStatus } from "@/lib/talent-buyers/submission-status";
import { resolveCastingRoleMatchAttributes } from "@/lib/talent-buyers/casting/casting-role-match-attributes";
import { fetchCastingSubmissions, type ProjectSubmissionRow } from "@/lib/talent-buyers/casting-projects";
import { fetchChildCastingDetail, listProjectCastings } from "@/lib/talent-buyers/castings";
import {
  fetchTalentProfileBundles,
  isGenericApplicantName,
} from "@/lib/talent-buyers/casting/submission-talent";

function normalizeRoleTitle(title: string): string {
  return title.trim().toLowerCase();
}

/** Keep one casting_roles row per title (leftover sync duplicates inflate dropdowns). */
function dedupeRolesByTitle(roles: CastingRole[]): CastingRole[] {
  const byTitle = new Map<string, CastingRole>();
  for (const role of roles) {
    const key = normalizeRoleTitle(role.name || role.id);
    const existing = byTitle.get(key);
    if (!existing) {
      byTitle.set(key, role);
      continue;
    }
    const preferNew =
      (!existing.bridgedRoleId && Boolean(role.bridgedRoleId)) ||
      ((role.order ?? 0) < (existing.order ?? 0) && Boolean(role.bridgedRoleId) === Boolean(existing.bridgedRoleId));
    if (preferNew) byTitle.set(key, role);
  }
  return [...byTitle.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
}

function mapBridgedRolesByCastingRole(
  castingRoles: Array<{ title: string }>,
  bridgedRoles: Array<{ id: string; title: string }>,
): Map<string, string> {
  const byExactTitle = new Map(
    bridgedRoles.map((role) => [normalizeRoleTitle(role.title), role.id]),
  );
  const byIndex = new Map(
    castingRoles.map((role, index) => [role.title, bridgedRoles[index]?.id]),
  );

  const result = new Map<string, string>();
  for (const role of castingRoles) {
    const bridgedId =
      byExactTitle.get(normalizeRoleTitle(role.title)) ?? byIndex.get(role.title);
    if (bridgedId) result.set(role.title, bridgedId);
  }
  return result;
}

function mapCastingStatus(raw: string | null | undefined): CastingProjectStatus {
  switch (raw) {
    case "open":
    case "published":
      return "published";
    case "paused":
      return "paused";
    case "closed":
      return "closed";
    case "archived":
      return "archived";
    default:
      return "draft";
  }
}

function mapCastingVisibility(raw: string | null | undefined): CastingVisibility {
  switch (raw) {
    case "private":
      return "private";
    case "invitation_only":
    case "invite_only":
      return "invitation_only";
    default:
      return "public";
  }
}

function mapCastingRow(row: Record<string, unknown>, projectId: string): CastingProject {
  const config = (row.configuration as Record<string, unknown> | null) ?? {};
  const meta = (config._composer_meta as Record<string, unknown> | undefined) ?? {};
  return {
    id: row.id as string,
    projectId,
    title: (row.title as string) || "Untitled casting",
    description: (row.description as string | null) ?? undefined,
    submissionDeadline: (row.submission_deadline as string | null) ?? undefined,
    status: mapCastingStatus(row.status as string),
    visibility: mapCastingVisibility(row.visibility as string),
    allowExternalCandidates: (row.allow_external_candidates as boolean | null) ?? true,
    allowMultipleRoleSubmissions: (row.allow_multiple_role_submissions as boolean | null) ?? true,
    location: (meta.location as string | undefined) ?? (config.location as string | undefined),
    locationType: meta.location_type as CastingProject["locationType"],
    companyName: meta.company_name as string | undefined,
    clientName: meta.client_name as string | undefined,
    configuration: config,
    createdBy: (row.created_by as string | null) ?? "",
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? (row.created_at as string) ?? new Date().toISOString(),
  };
}

function mapRoleRow(
  row: Record<string, unknown>,
  castingId: string,
  bridgedRole?: {
    id: string;
    gender?: string | null;
    height_min?: string | null;
    height_max?: string | null;
    special_skills?: string[] | null;
    ethnicity_preferences?: string[] | null;
    client_match_filters?: Record<string, unknown> | null;
    is_casting_finalized?: boolean | null;
    is_active?: boolean | null;
  },
  bridgedRoleIds: string[] = [],
): CastingRole {
  const matchFilters = (row.match_filters as Record<string, unknown> | null) ?? {};
  const clientMatchFilters = bridgedRole?.client_match_filters ?? {};
  const attrs = resolveCastingRoleMatchAttributes({
    gender: row.gender as string | null,
    ethnicity_preferences:
      (row.ethnicity_preferences as string[] | null) ?? bridgedRole?.ethnicity_preferences ?? null,
    union_status: row.union_status as string | null,
    match_filters: matchFilters,
    client_match_filters: clientMatchFilters,
  });

  const locationFromFilters = dedupeLocationRequirements([
    ...attrs.locationRequirements,
    ...(attrs.projectLocation ? [attrs.projectLocation] : []),
  ]);

  const resolvedBridgedIds = [
    ...new Set(
      [bridgedRole?.id, ...bridgedRoleIds].filter((id): id is string => Boolean(id)),
    ),
  ];

  return {
    id: row.id as string,
    castingProjectId: castingId,
    bridgedRoleId: resolvedBridgedIds[0],
    bridgedRoleIds: resolvedBridgedIds,
    name: (row.title as string) || "Role",
    description: (row.description as string | null) ?? undefined,
    quantityNeeded: (row.people_needed as number | null) ?? 1,
    status: ((row.status as CastingRoleStatus | null) ?? "draft") as CastingRoleStatus,
    isCastingFinalized: Boolean(bridgedRole?.is_casting_finalized),
    isActive: bridgedRole?.is_active ?? undefined,
    priority: (row.priority as CastingRole["priority"]) ?? undefined,
    danceStyles: attrs.danceStyles.length ? attrs.danceStyles : undefined,
    gender: attrs.gender,
    genderPresentation: attrs.gender ? [attrs.gender] : undefined,
    specialSkills:
      (row.special_skills as string[] | null) ??
      bridgedRole?.special_skills ??
      (Array.isArray(matchFilters.skills) ? (matchFilters.skills as string[]) : undefined),
    ethnicityPreferences: attrs.ethnicityPreferences.length ? attrs.ethnicityPreferences : undefined,
    ageRange: {
      min: (row.age_min as number | null) ?? undefined,
      max: (row.age_max as number | null) ?? undefined,
    },
    heightRange: {
      min: (row.height_min_cm as number | null) ?? undefined,
      max: (row.height_max_cm as number | null) ?? undefined,
      unit: "cm",
    },
    heightMinDisplay: bridgedRole?.height_min ?? undefined,
    heightMaxDisplay: bridgedRole?.height_max ?? undefined,
    locationRequirements: locationFromFilters.length ? locationFromFilters : undefined,
    unionRequirement: attrs.unionRequirement,
    internalNotes: (row.internal_notes as string | null) ?? undefined,
    order: (row.sort_order as number | null) ?? 0,
  };
}

function dedupeLocationRequirements(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function mapSubmissionToCandidate(
  submission: ProjectSubmissionRow,
  castingId: string,
): CastingCandidate {
  return {
    id: `submission-${submission.id}`,
    castingProjectId: castingId,
    talentProfileId: submission.talentProfileId ?? undefined,
    talentSlug: submission.talentSlug ?? undefined,
    talentUserId: submission.talentId ?? undefined,
    roleIds: [submission.roleId],
    source: "public_submission",
    status: submissionStatusToCandidateStatus(normalizeSubmissionStatus(submission.status)),
    displayName: submission.fullName,
    email: submission.email ?? undefined,
    agency: submission.agency ?? undefined,
    headshotUrl: submission.headshotUrl ?? undefined,
    submissionId: submission.id,
    createdAt: submission.submittedAt ?? new Date().toISOString(),
    updatedAt: submission.submittedAt ?? new Date().toISOString(),
  };
}

function mergeSubmissionCandidates(
  pipelineCandidates: CastingCandidate[],
  submissionCandidates: CastingCandidate[],
): CastingCandidate[] {
  const merged = [...pipelineCandidates];
  const bySubmissionId = new Map(
    merged
      .filter((candidate) => candidate.submissionId)
      .map((candidate) => [candidate.submissionId as string, candidate]),
  );

  for (const submissionCandidate of submissionCandidates) {
    const submissionId = submissionCandidate.submissionId;
    if (!submissionId) {
      merged.push(submissionCandidate);
      continue;
    }

    const existing = bySubmissionId.get(submissionId);
    if (!existing) {
      merged.push(submissionCandidate);
      bySubmissionId.set(submissionId, submissionCandidate);
      continue;
    }

    const index = merged.findIndex((candidate) => candidate.id === existing.id);
    if (index < 0) continue;

    merged[index] = {
      ...existing,
      displayName: isGenericApplicantName(existing.displayName)
        ? submissionCandidate.displayName
        : existing.displayName,
      email: existing.email ?? submissionCandidate.email,
      agency: existing.agency ?? submissionCandidate.agency,
      headshotUrl: existing.headshotUrl ?? submissionCandidate.headshotUrl,
      talentProfileId: existing.talentProfileId ?? submissionCandidate.talentProfileId,
      talentSlug: existing.talentSlug ?? submissionCandidate.talentSlug,
      talentUserId: existing.talentUserId ?? submissionCandidate.talentUserId,
      submissionId: existing.submissionId ?? submissionCandidate.submissionId,
      roleIds: existing.roleIds.length ? existing.roleIds : submissionCandidate.roleIds,
      status:
        existing.status === "discovered" || existing.status === "invited"
          ? submissionCandidate.status
          : existing.status,
    };
  }

  return merged;
}

function enrichCandidatesWithExternalAssets(
  candidates: CastingCandidate[],
  externalCandidates: CastingExternalCandidate[],
): CastingCandidate[] {
  if (!externalCandidates.length) return candidates;

  const externalById = new Map(externalCandidates.map((external) => [external.id, external]));

  return candidates.map((candidate) => {
    if (!candidate.externalCandidateId) return candidate;

    const external = externalById.get(candidate.externalCandidateId);
    if (!external) return candidate;

    return {
      ...candidate,
      headshotUrl: candidate.headshotUrl ?? external.headshotUrl,
      resumeUrl: candidate.resumeUrl ?? external.resumeUrl,
    };
  });
}

async function enrichCandidatesWithTalentProfiles(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  candidates: CastingCandidate[],
): Promise<CastingCandidate[]> {
  const profileIds = [...new Set(candidates.map((c) => c.talentProfileId).filter(Boolean))] as string[];
  const directTalentIds = [
    ...new Set(candidates.map((c) => c.talentUserId).filter(Boolean)),
  ] as string[];

  const profileClient = createAdminSupabaseClient() ?? supabase;
  const { data: profiles } = profileIds.length
    ? await profileClient
        .from("professional_profiles")
        .select("id, slug, user_id")
        .in("id", profileIds)
    : { data: [] };

  const slugByProfile = new Map((profiles ?? []).map((p) => [p.id as string, p.slug as string]));
  const userIdByProfile = new Map((profiles ?? []).map((p) => [p.id as string, p.user_id as string]));
  const talentIds = [
    ...new Set([
      ...directTalentIds,
      ...(profiles ?? []).map((p) => p.user_id as string).filter(Boolean),
    ]),
  ];
  const bundles = await fetchTalentProfileBundles(supabase, talentIds);

  return candidates.map((candidate) => {
    const userId =
      candidate.talentUserId ??
      (candidate.talentProfileId ? userIdByProfile.get(candidate.talentProfileId) : undefined);
    const bundle = userId ? bundles.get(userId) : undefined;
    const slug = candidate.talentProfileId
      ? slugByProfile.get(candidate.talentProfileId)
      : candidate.talentSlug;
    const slugAsName = slug ? slug.replace(/-/g, " ") : "";
    const shouldUpgradeName =
      Boolean(bundle?.fullName) &&
      (isGenericApplicantName(candidate.displayName) ||
        candidate.source === "referral" ||
        (slugAsName &&
          candidate.displayName.trim().toLowerCase() === slugAsName.toLowerCase()) ||
        (slug && candidate.displayName.trim().toLowerCase() === slug.toLowerCase()));

    const preferBundleHeadshot =
      candidate.source === "referral" || shouldUpgradeName || !candidate.headshotUrl;

    return {
      ...candidate,
      displayName: shouldUpgradeName && bundle ? bundle.fullName : candidate.displayName,
      email: candidate.email ?? bundle?.email ?? undefined,
      agency: candidate.agency ?? bundle?.agency ?? undefined,
      headshotUrl: preferBundleHeadshot
        ? (bundle?.headshotUrl ?? candidate.headshotUrl ?? undefined)
        : (candidate.headshotUrl ?? bundle?.headshotUrl ?? undefined),
      resumeUrl: candidate.resumeUrl ?? bundle?.resumeUrl ?? undefined,
      talentSlug: slug ?? candidate.talentSlug ?? bundle?.slug ?? undefined,
      talentProfileId:
        candidate.talentProfileId ?? bundle?.professionalProfileId ?? undefined,
      talentUserId: candidate.talentUserId ?? bundle?.userId ?? undefined,
    };
  });
}

function mapCandidateRow(row: Record<string, unknown>): CastingCandidate {
  return {
    id: row.id as string,
    castingProjectId: row.casting_id as string,
    talentProfileId: (row.talent_profile_id as string | null) ?? undefined,
    externalCandidateId: (row.external_candidate_id as string | null) ?? undefined,
    roleIds: (row.role_ids as string[] | null) ?? [],
    source: (row.source as CastingCandidateSource) ?? "manual",
    status: normalizeCandidateStatus(row.status as string),
    displayName: (row.display_name as string) || "Candidate",
    email: (row.email as string | null) ?? undefined,
    agency: (row.agency as string | null) ?? undefined,
    headshotUrl: (row.headshot_url as string | null) ?? undefined,
    submissionId: (row.submission_id as string | null) ?? undefined,
    invitationId: (row.invitation_id as string | null) ?? undefined,
    availabilityStatus: (row.availability_status as string | null) ?? undefined,
    overallRecommendation: (row.overall_recommendation as CastingCandidate["overallRecommendation"]) ?? undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

/** Resolve primary casting for a casting-type project (first child casting). */
export async function resolvePrimaryCastingId(
  projectId: string,
  posterId: string,
): Promise<string | null> {
  const castings = await listProjectCastings(projectId, posterId);
  const nonLegacy = castings.find((c) => !c.isLegacy);
  return nonLegacy?.id ?? null;
}

export async function fetchCastingWorkflowData(
  projectId: string,
  posterId: string,
): Promise<CastingWorkflowData> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      primaryCasting: null,
      roles: [],
      candidates: [],
      invitations: [],
      referrals: [],
      externalCandidates: [],
      evaluations: [],
    };
  }

  const castingId = await resolvePrimaryCastingId(projectId, posterId);
  if (!castingId) {
    return {
      primaryCasting: null,
      roles: [],
      candidates: [],
      invitations: [],
      referrals: [],
      externalCandidates: [],
      evaluations: [],
    };
  }

  const detail = await fetchChildCastingDetail(castingId, projectId, posterId);
  if (!detail) {
    return {
      primaryCasting: null,
      roles: [],
      candidates: [],
      invitations: [],
      referrals: [],
      externalCandidates: [],
      evaluations: [],
    };
  }

  const primaryCasting = mapCastingRow(detail.casting as unknown as Record<string, unknown>, projectId);

  const { data: bridgedRoles } = await supabase
    .from("roles")
    .select(
      "id, title, gender, height_min, height_max, special_skills, ethnicity_preferences, client_match_filters, is_casting_finalized, is_active",
    )
    .eq("casting_id", castingId);

  const bridgedRoleList = (bridgedRoles ?? []) as Array<{
    id: string;
    title: string;
    height_min?: string | null;
    height_max?: string | null;
    special_skills?: string[] | null;
    ethnicity_preferences?: string[] | null;
    client_match_filters?: Record<string, unknown> | null;
    is_casting_finalized?: boolean | null;
    is_active?: boolean | null;
  }>;
  const bridgedByCastingRole = mapBridgedRolesByCastingRole(
    detail.roles ?? [],
    bridgedRoleList,
  );
  const bridgedIdsByTitle = new Map<string, string[]>();
  for (const role of bridgedRoleList) {
    const key = normalizeRoleTitle(role.title);
    const existing = bridgedIdsByTitle.get(key) ?? [];
    existing.push(role.id);
    bridgedIdsByTitle.set(key, existing);
  }
  const bridgedByTitle = new Map(
    bridgedRoleList.map((role) => [normalizeRoleTitle(role.title), role]),
  );

  const roles = dedupeRolesByTitle(
    (detail.roles ?? []).map((role) => {
      const titleKey = normalizeRoleTitle(role.title);
      const bridgedId = bridgedByCastingRole.get(role.title);
      const bridgedRole =
        bridgedByTitle.get(titleKey) ??
        (bridgedId ? bridgedRoleList.find((item) => item.id === bridgedId) : undefined);
      const bridgedIdsForTitle = bridgedIdsByTitle.get(titleKey) ?? [];
      return mapRoleRow(
        role as unknown as Record<string, unknown>,
        castingId,
        bridgedRole,
        bridgedIdsForTitle,
      );
    }),
  );

  const { data: candidateRows } = await supabase
    .from("casting_candidates")
    .select("*")
    .eq("casting_id", castingId)
    .order("updated_at", { ascending: false })
    .limit(500);

  let candidates = (candidateRows ?? []).map((row) => mapCandidateRow(row as Record<string, unknown>));

  const submissionRoles = roles
    .filter((role) => role.bridgedRoleId)
    .map((role) => ({ id: role.bridgedRoleId!, title: role.name }));
  const submissions = await fetchCastingSubmissions(supabase, castingId, submissionRoles);
  const submissionCandidates = submissions.map((submission) =>
    mapSubmissionToCandidate(submission, castingId),
  );
  candidates = mergeSubmissionCandidates(candidates, submissionCandidates);
  candidates = await enrichCandidatesWithTalentProfiles(supabase, candidates);

  const { data: invitationRows } = await supabase
    .from("invitations")
    .select(
      "id, casting_id, invited_profile_id, status, message, created_at, sent_at, viewed_at, expires_at, role_id, role_ids, professional_profiles ( slug, user_id, styles, location_city, location_region )",
    )
    .eq("casting_id", castingId)
    .order("created_at", { ascending: false })
    .limit(200);

  const invitedUserIds = (invitationRows ?? [])
    .map((row) => {
      const profile = Array.isArray(row.professional_profiles)
        ? row.professional_profiles[0]
        : row.professional_profiles;
      return profile && typeof profile === "object" ? (profile as { user_id?: string }).user_id : null;
    })
    .filter((id): id is string => Boolean(id));
  const invitationBundles = await fetchTalentProfileBundles(supabase, invitedUserIds);

  const invitations: CastingInvitation[] = (invitationRows ?? []).map((row) => {
    const profile = Array.isArray(row.professional_profiles)
      ? row.professional_profiles[0]
      : row.professional_profiles;
    const slug = profile && typeof profile === "object" ? (profile as { slug?: string }).slug : undefined;
    const talentUserId =
      profile && typeof profile === "object" ? (profile as { user_id?: string }).user_id : undefined;
    const bundle = talentUserId ? invitationBundles.get(talentUserId) : undefined;
    const roleIds = (row.role_ids as string[] | null)?.length
      ? (row.role_ids as string[])
      : row.role_id
        ? [row.role_id as string]
        : [];
    return {
      id: row.id as string,
      castingId: row.casting_id as string,
      invitedProfileId: row.invited_profile_id as string,
      roleIds,
      status: (row.status as CastingInvitation["status"]) ?? "sent",
      message: (row.message as string | null) ?? undefined,
      sentAt: (row.sent_at as string | null) ?? (row.created_at as string),
      viewedAt: (row.viewed_at as string | null) ?? undefined,
      expiresAt: (row.expires_at as string | null) ?? undefined,
      talentName: bundle?.fullName ?? (slug ? slug.replace(/-/g, " ") : "Talent"),
      talentSlug: bundle?.slug ?? slug,
      talentUserId,
      headshotUrl: bundle?.headshotUrl ?? undefined,
    };
  });

  const { data: referralRows } = await supabase
    .from("casting_referrals")
    .select(
      "id, casting_id, project_id, role_ids, referred_profile_id, referrer_user_id, referrer_display_name, referral_token_id, source, note, status, created_at",
    )
    .eq("casting_id", castingId)
    .eq("status", "submitted")
    .order("created_at", { ascending: false })
    .limit(200);

  const referredProfileIds = [
    ...new Set(
      (referralRows ?? [])
        .map((row) => row.referred_profile_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const referralProfileClient = createAdminSupabaseClient() ?? supabase;
  const { data: referredProfiles } = referredProfileIds.length
    ? await referralProfileClient
        .from("professional_profiles")
        .select("id, slug, user_id, styles, location_city, location_region")
        .in("id", referredProfileIds)
    : { data: [] };
  const referredProfileById = new Map(
    (referredProfiles ?? []).map((row) => [row.id as string, row]),
  );
  const referredUserIds = (referredProfiles ?? [])
    .map((row) => row.user_id as string | null)
    .filter((id): id is string => Boolean(id));
  const referralBundles = await fetchTalentProfileBundles(supabase, referredUserIds);

  const referrerUserIds = [
    ...new Set(
      (referralRows ?? [])
        .map((row) => row.referrer_user_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const referrerNameByUserId = new Map<string, string>();
  if (referrerUserIds.length) {
    const profileClient = createAdminSupabaseClient() ?? supabase;
    const { data: referrerProfiles } = await profileClient
      .from("profiles")
      .select("user_id, display_name, first_name, last_name")
      .in("user_id", referrerUserIds);
    for (const row of referrerProfiles ?? []) {
      const name =
        (row.display_name as string | null)?.trim() ||
        [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
      if (name) referrerNameByUserId.set(row.user_id as string, name);
    }
  }

  const candidateByProfileId = new Map(
    candidates
      .filter((candidate) => candidate.talentProfileId)
      .map((candidate) => [candidate.talentProfileId as string, candidate]),
  );
  const candidateByUserId = new Map(
    candidates
      .filter((candidate) => candidate.talentUserId)
      .map((candidate) => [candidate.talentUserId as string, candidate]),
  );

  const referrals: CastingReferral[] = (referralRows ?? []).map((row) => {
    const profile = referredProfileById.get(row.referred_profile_id as string);
    const slug = profile?.slug as string | undefined;
    const userId = profile?.user_id as string | undefined;
    const styles = (profile?.styles as string[] | undefined) ?? [];
    const city = profile?.location_city as string | undefined;
    const region = profile?.location_region as string | undefined;
    const bundle = userId ? referralBundles.get(userId) : undefined;
    const candidate =
      candidateByProfileId.get(row.referred_profile_id as string) ??
      (userId ? candidateByUserId.get(userId) : undefined);
    const referrerUserId = (row.referrer_user_id as string | null) ?? undefined;
    const anonymousName = (row.referrer_display_name as string | null) ?? undefined;
    const referrerDisplayName =
      (referrerUserId ? referrerNameByUserId.get(referrerUserId) : undefined) ?? anonymousName;

    const referralRoleIds = (row.role_ids as string[] | null) ?? [];
    const resolvedRoleIds =
      referralRoleIds.length > 0 ? referralRoleIds : (candidate?.roleIds ?? []);

    const candidateName = candidate?.displayName?.trim();
    const bundleName = bundle?.fullName?.trim();
    const slugName = slug ? slug.replace(/-/g, " ") : undefined;
    const talentName =
      (candidateName && !isGenericApplicantName(candidateName) ? candidateName : undefined) ??
      (bundleName && !isGenericApplicantName(bundleName) ? bundleName : undefined) ??
      candidateName ??
      bundleName ??
      slugName ??
      "Talent";

    return {
      id: row.id as string,
      castingId: row.casting_id as string,
      projectId: row.project_id as string,
      roleIds: resolvedRoleIds,
      referredProfileId: row.referred_profile_id as string,
      referrerUserId,
      referrerDisplayName,
      referralTokenId: (row.referral_token_id as string | null) ?? undefined,
      source: ((row.source as CastingReferral["source"] | null) ?? "authenticated") as CastingReferral["source"],
      note: (row.note as string | null) ?? undefined,
      status: (row.status as CastingReferral["status"]) ?? "submitted",
      createdAt: (row.created_at as string) ?? new Date().toISOString(),
      talentName,
      talentSlug: candidate?.talentSlug ?? bundle?.slug ?? slug,
      talentUserId: candidate?.talentUserId ?? userId,
      headshotUrl: candidate?.headshotUrl ?? bundle?.headshotUrl ?? undefined,
      styles,
      location: city ? (region ? `${city}, ${region}` : city) : undefined,
    };
  });

  const { data: externalRows } = await supabase
    .from("casting_external_candidates")
    .select("*")
    .eq("casting_id", castingId)
    .order("created_at", { ascending: false });

  const externalCandidates: CastingExternalCandidate[] = (externalRows ?? []).map((row) => ({
    id: row.id as string,
    castingId: row.casting_id as string,
    fullName: row.full_name as string,
    email: (row.email as string | null) ?? undefined,
    phone: (row.phone as string | null) ?? undefined,
    representation: (row.representation as string | null) ?? undefined,
    source: (row.source as CastingExternalCandidate["source"]) ?? "manual",
    roleIds: (row.role_ids as string[] | null) ?? [],
    headshotUrl: (row.headshot_url as string | null) ?? undefined,
    resumeUrl: (row.resume_url as string | null) ?? undefined,
    mediaUrl: (row.media_url as string | null) ?? undefined,
    internalNotes: (row.internal_notes as string | null) ?? undefined,
    linkedProfileId: (row.linked_profile_id as string | null) ?? undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
  }));

  candidates = enrichCandidatesWithExternalAssets(candidates, externalCandidates);

  const candidateIds = candidates.filter((c) => !c.id.startsWith("submission-")).map((c) => c.id);
  const { data: evalRows } = candidateIds.length
    ? await supabase.from("casting_evaluations").select("*").in("casting_candidate_id", candidateIds)
    : { data: [] };

  const evaluations: CastingEvaluation[] = (evalRows ?? []).map((row) => ({
    id: row.id as string,
    castingCandidateId: row.casting_candidate_id as string,
    evaluatorId: row.evaluator_id as string,
    roleId: (row.role_id as string | null) ?? undefined,
    recommendation: (row.recommendation as CastingEvaluation["recommendation"]) ?? undefined,
    scorecard: (row.scorecard as Record<string, number | boolean | string>) ?? {},
    privateNotes: (row.private_notes as string | null) ?? undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  }));

  return {
    primaryCasting,
    roles,
    candidates,
    invitations,
    referrals,
    externalCandidates,
    evaluations,
  };
}

export async function ensurePrimaryCastingDraft(
  projectId: string,
  posterId: string,
  projectTitle: string,
): Promise<string | null> {
  const existing = await resolvePrimaryCastingId(projectId, posterId);
  if (existing) return existing;

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("castings")
    .insert({
      project_id: projectId,
      title: projectTitle || "Untitled casting",
      status: "draft",
      visibility: "private",
      configuration: {},
      created_by: posterId,
    })
    .select("id")
    .single();

  if (error || !data) return null;
  return data.id as string;
}
