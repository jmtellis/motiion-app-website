"use server";
import { requireIndustryApproval } from "@/lib/talent-buyers/require-industry-approval";
import { fetchAccessibleProjectRecord } from "@/lib/talent-buyers/projects";

import { createHash, randomBytes } from "crypto";
import { finalSubmissionIds } from "@/lib/talent-buyers/casting/final-selection";
import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { requireCastingOutreachAllowance } from "@/lib/billing/casting-outreach-limit";
import { requireIndustryProFeature } from "@/lib/billing/gate";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchTalentProfileBundles } from "@/lib/talent-buyers/casting/submission-talent";
import { requireIndustryIdentityVerified } from "@/lib/talent-buyers/require-industry-identity";
import {
  candidateStatusToSubmissionStatus,
  isCastingStatusTransitionAllowed,
  normalizeCandidateStatus,
} from "@/lib/talent-buyers/casting/casting-statuses";
import type {
  CastingCandidateSource,
  CastingCandidateStatus,
  CastingRecommendation,
} from "@/lib/talent-buyers/casting/casting-types";
import { saveDiscoveredCastingCandidate } from "@/lib/talent-buyers/casting/save-candidate";
import { bridgeWebInviteToMobile } from "@/lib/talent-buyers/casting/bridge-mobile-invite";
import { activatePublishedCasting } from "@/lib/talent-buyers/casting/activate-published-casting";
import { closePublishedCasting } from "@/lib/talent-buyers/casting/close-published-casting";
import { castingAcceptsOutreach } from "@/lib/talent-buyers/casting/casting-display";
import {
  ensurePrimaryCastingDraft,
  resolvePrimaryCastingId,
} from "@/lib/talent-buyers/casting/casting-workflow-data";
import {
  dedupeReferralRoles,
  type ReferralRoleOption,
} from "@/lib/talent-buyers/casting/referral-role-context";
import { searchTalentProfiles } from "@/lib/search/search-profiles";
import { navigatorFiltersToSearchFilters } from "@/lib/talent-navigator/search-filters";
import { buildNavigatorInitialData } from "@/lib/talent-navigator/profile-adapter";
import { EMPTY_NAVIGATOR_FILTERS, type Talent } from "@/lib/talent-navigator/types";

export type PlatformUserResult = {
  userId: string;
  name: string;
  slug?: string;
  subtitle?: string;
  imageUrl?: string | null;
};

async function requireProjectAccess(projectId: string, userId: string) {
  const approval = await requireIndustryApproval(userId);
  if (!approval.ok) return approval;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false as const, error: "Supabase is not configured." };

  const project = await fetchAccessibleProjectRecord(projectId, userId);
  if (!project) return { ok: false as const, error: "Project not found." };
  const operator = await supabase.rpc("is_project_operator", { p_project_id: projectId, p_user_id: userId });
  if (operator.error || !operator.data) return { ok: false as const, error: "Only the project owner or an approved admin can change casting decisions." };
  return { ok: true as const, supabase, project };
}

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/overview`);
  revalidatePath(`/projects/${projectId}/workspace/breakdown`);
  revalidatePath(`/projects/${projectId}/workspace/review`);
  revalidatePath(`/projects/${projectId}/workspace/cast`);
  revalidatePath(`/projects/${projectId}/workspace/talent-search`);
  revalidatePath(`/projects/${projectId}/workspace/client-review`);
  revalidatePath(`/projects/${projectId}/roster`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/opportunities");
  revalidatePath("/home");
  revalidatePath("/schedule");
  revalidatePath("/events");
  revalidatePath("/inbox");
  revalidatePath("/messages");
}

async function resolveProfessionalProfileId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (...args: any[]) => any },
  talentIdOrSlug: string,
): Promise<string | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(talentIdOrSlug);

  if (isUuid) {
    const { data } = await supabase
      .from("professional_profiles")
      .select("id")
      .or(`user_id.eq.${talentIdOrSlug},id.eq.${talentIdOrSlug}`)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  const { data: bySlug } = await supabase
    .from("professional_profiles")
    .select("id")
    .eq("slug", talentIdOrSlug)
    .maybeSingle();

  return (bySlug?.id as string | undefined) ?? null;
}

export async function publishCastingFromBreakdown(
  projectId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const identity = await requireIndustryIdentityVerified(user.id);
  if (!identity.ok) {
    return { ok: false, error: identity.error };
  }

  const access = await requireProjectAccess(projectId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  const castingId =
    (await resolvePrimaryCastingId(projectId, user.id)) ??
    (await ensurePrimaryCastingDraft(projectId, user.id, access.project.title));

  if (!castingId) return { ok: false, error: "Could not resolve casting." };

  const activated = await activatePublishedCasting(supabase, projectId, castingId);
  if (!activated.ok) return { ok: false, error: activated.error };

  await trackServerEvent("casting_published", { project_id: projectId, casting_id: castingId });
  revalidateProject(projectId);
  return { ok: true };
}

export async function closeCastingFromWorkflow(
  projectId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const access = await requireProjectAccess(projectId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  const castingId = await resolvePrimaryCastingId(projectId, user.id);
  if (!castingId) return { ok: false, error: "Could not resolve casting." };

  const closed = await closePublishedCasting(supabase, castingId);
  if (!closed.ok) return { ok: false, error: closed.error };

  await trackServerEvent("casting_closed", { project_id: projectId, casting_id: castingId });
  revalidateProject(projectId);
  return { ok: true };
}

export async function reopenCastingFromWorkflow(
  projectId: string,
): Promise<{ ok: boolean; error?: string }> {
  return publishCastingFromBreakdown(projectId);
}

export async function updateCastingCandidateStatus(input: {
  projectId: string;
  candidateId: string;
  status: CastingCandidateStatus;
  notifyTalent?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  if (input.status === "availability_requested") return requestCastingAvailability(input);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  if (input.notifyTalent) {
    const pro = await requireIndustryProFeature(user.id, "talent_outreach");
    if (!pro.ok) {
      return { ok: false, error: "Industry Pro is required to reach talent." };
    }
  }

  const access = await requireProjectAccess(input.projectId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  // Virtual submission-only rows must be promoted into casting_candidates so fine-grained
  // statuses like "selected" persist (submissions only store approved/pending/etc.).
  if (input.candidateId.startsWith("submission-")) {
    const submissionId = input.candidateId.replace("submission-", "");
    const promoted = await ensureCandidateFromSubmission({
      supabase,
      projectId: input.projectId,
      submissionId,
      status: input.status,
      userId: user.id,
    });
    if (!promoted.ok) return { ok: false, error: promoted.error };

    const eventMap: Partial<Record<CastingCandidateStatus, string>> = {
      shortlisted: "casting_candidate_shortlisted",
      selected: "casting_candidate_selected",
      offer_sent: "casting_offer_sent",
      accepted: "casting_offer_accepted",
      declined: "casting_offer_declined",
      confirmed: "casting_candidate_confirmed",
    };
    const event = eventMap[input.status];
    if (event) {
      await trackServerEvent(event, {
        project_id: input.projectId,
        candidate_id: promoted.candidateId,
        status: input.status,
        notify_talent: input.notifyTalent ?? false,
      });
    }

    revalidateProject(input.projectId);
    return { ok: true };
  }

  const { data: candidate } = await supabase
    .from("casting_candidates")
    .select("id, status, submission_id, role_ids")
    .eq("id", input.candidateId)
    .eq("project_id", input.projectId)
    .maybeSingle();

  if (!candidate) return { ok: false, error: "Candidate not found." };

  const { data: lockedRoles, error: lockError } = await supabase.from("roles")
    .select("id").in("id", candidate.role_ids ?? []).eq("is_casting_finalized", true);
  if (lockError || lockedRoles?.length) return { ok: false, error: "This selection is finalized. Reopen the role before changing it." };

  const current = normalizeCandidateStatus(candidate.status as string);
  if (!isCastingStatusTransitionAllowed(current, input.status)) {
    return { ok: false, error: `Cannot move from ${current} to ${input.status}.` };
  }

  if (candidate.submission_id) {
    const syncError = await syncSubmissionStatus(supabase, candidate.submission_id, input.status);
    if (syncError) return { ok: false, error: syncError };
  }
  const { error } = await supabase
    .from("casting_candidates")
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq("id", input.candidateId);

  if (error) return { ok: false, error: error.message };


  const eventMap: Partial<Record<CastingCandidateStatus, string>> = {
    shortlisted: "casting_candidate_shortlisted",
    selected: "casting_candidate_selected",
    offer_sent: "casting_offer_sent",
    accepted: "casting_offer_accepted",
    declined: "casting_offer_declined",
    confirmed: "casting_candidate_confirmed",
  };
  const event = eventMap[input.status];
  if (event) {
    await trackServerEvent(event, {
      project_id: input.projectId,
      candidate_id: input.candidateId,
      status: input.status,
      notify_talent: input.notifyTalent ?? false,
    });
  }

  revalidateProject(input.projectId);
  return { ok: true };
}

/** Creates an actual inbox request before moving the casting pipeline. */
async function requestCastingAvailability(input: { projectId: string; candidateId: string }): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  const access = await requireProjectAccess(input.projectId, user.id);
  if (!access.ok) return { ok: false, error: access.error };
  const pro = await requireIndustryProFeature(user.id, "talent_outreach");
  if (!pro.ok) return { ok: false, error: "Industry Pro is required to request availability." };
  let candidateId = input.candidateId;
  if (candidateId.startsWith("submission-")) {
    const promoted = await ensureCandidateFromSubmission({ supabase, projectId: input.projectId, submissionId: candidateId.slice("submission-".length), status: "selected", userId: user.id });
    if (!promoted.ok) return promoted;
    candidateId = promoted.candidateId;
  }
  const { data: candidate, error: candidateError } = await supabase.from("casting_candidates")
    .select("id, status, submission_id, talent_profile_id, updated_at, role_ids")
    .eq("id", candidateId).eq("project_id", input.projectId).maybeSingle();
  if (candidateError || !candidate) return { ok: false, error: "Could not load this candidate. Refresh and try again." };
  if (!["selected", "availability_requested"].includes(candidate.status)) return { ok: false, error: "Select this person before requesting availability." };
  const { data: lockedRoles, error: lockError } = await supabase.from("roles").select("id")
    .in("id", candidate.role_ids ?? []).eq("is_casting_finalized", true);
  if (lockError || lockedRoles?.length) return { ok: false, error: "Reopen the role before sending a new availability request." };

  const [profileResult, projectResult] = await Promise.all([
    candidate.talent_profile_id ? supabase.from("professional_profiles").select("user_id").eq("id", candidate.talent_profile_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("projects").select("title, start_date, end_date").eq("id", input.projectId).single(),
  ]);
  let talentId = profileResult.data?.user_id;
  if (!talentId && candidate.submission_id) {
    const { data: submission } = await supabase.from("submissions").select("talent_id").eq("id", candidate.submission_id).maybeSingle();
    talentId = submission?.talent_id;
  }
  if (!talentId) return { ok: false, error: "This person does not have a connected Motiion account. Use Contact to coordinate directly." };
  if (projectResult.error || !projectResult.data) return { ok: false, error: "Could not load the project dates. Try again." };
  const project = projectResult.data;
  const { data: existing, error: existingError } = await supabase.from("availability_check_requests")
    .select("id").eq("project_id", input.projectId).eq("requester_id", user.id).eq("talent_id", talentId)
    .eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existingError) return { ok: false, error: "Could not check existing availability requests. Try again." };
  if (!existing) {
    const { error } = await supabase.from("availability_check_requests").insert({
      requester_id: user.id, talent_id: talentId, project_id: input.projectId,
      title: `Availability for ${project.title}`, project_name: project.title,
      message: "Please confirm your availability and note any scheduling conflicts.",
      date_ranges: project.start_date ? [{ start: project.start_date, end: project.end_date || project.start_date }] : [],
      status: "pending", idempotency_key: `web:casting:${candidate.id}:${candidate.updated_at}`,
    });
    if (error && error.code !== "23505") return { ok: false, error: "Could not send the availability request. Please try again." };
  }
  const { error } = await supabase.from("casting_candidates").update({ status: "availability_requested", updated_at: new Date().toISOString() })
    .eq("id", candidate.id).eq("project_id", input.projectId);
  revalidateProject(input.projectId);
  if (error) return { ok: false, error: "The availability request was sent, but the casting list could not refresh. Reload to see the latest status." };
  return { ok: true };
}

/** Save review eligibility before updating pipeline presentation. A failed review
 * write must never display a successful final selection. Withdrawals stay final. */
async function syncSubmissionStatus(db: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>, submissionId: string, status: CastingCandidateStatus): Promise<string | null> {
  const next = candidateStatusToSubmissionStatus(status);
  if (!next) return null;
  const result = await db.from("submissions").update({ status: next, reviewed_at: new Date().toISOString() }).eq("id", submissionId).neq("status", "withdrawn").select("id").maybeSingle();
  return result.error || !result.data ? "This application changed or its review could not be saved. Refresh before trying again." : null;
}

type EnsureCandidateFromSubmissionResult =
  | { ok: true; candidateId: string }
  | { ok: false; error: string };

async function ensureCandidateFromSubmission(input: {
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;
  projectId: string;
  submissionId: string;
  status: CastingCandidateStatus;
  userId: string;
}): Promise<EnsureCandidateFromSubmissionResult> {
  const { supabase, projectId, submissionId, status, userId } = input;
  const { data: source, error: sourceError } = await supabase.from("submissions")
    .select("id, roles!inner(project_id, is_casting_finalized)").eq("id", submissionId).maybeSingle();
  const joined = source?.roles;
  const sourceRole = (Array.isArray(joined) ? joined[0] : joined) as { project_id?: string; is_casting_finalized?: boolean } | null;
  if (sourceError || !sourceRole || sourceRole.project_id !== projectId) return { ok: false, error: "Submission not found in this project." };
  if (sourceRole.is_casting_finalized) return { ok: false, error: "This selection is finalized. Reopen the role before changing it." };


  const { data: existingBySubmission } = await supabase
    .from("casting_candidates")
    .select("id, status")
    .eq("submission_id", submissionId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (existingBySubmission) {
    const current = normalizeCandidateStatus(existingBySubmission.status as string);
    if (current !== status && !isCastingStatusTransitionAllowed(current, status)) {
      return { ok: false, error: `Cannot move from ${current} to ${status}.` };
    }

    const syncError = await syncSubmissionStatus(supabase, submissionId, status);
    if (syncError) return { ok: false, error: syncError };
    const { error } = await supabase
      .from("casting_candidates")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", existingBySubmission.id);
    if (error) return { ok: false, error: error.message };


    return { ok: true, candidateId: existingBySubmission.id as string };
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select(
      "id, role_id, talent_id, status, full_name, email, agency, headshot_url, roles!inner(id, casting_id, project_id, title)",
    )
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError || !submission) {
    return { ok: false, error: submissionError?.message ?? "Submission not found." };
  }

  const roleJoin = Array.isArray(submission.roles) ? submission.roles[0] : submission.roles;
  const role = roleJoin as
    | { id?: string; casting_id?: string; project_id?: string; title?: string }
    | null
    | undefined;
  const castingId = role?.casting_id ?? null;
  if (!castingId) {
    return { ok: false, error: "Submission is not linked to a casting." };
  }
  if (role?.project_id && role.project_id !== projectId) {
    return { ok: false, error: "Submission does not belong to this project." };
  }

  let profile: Awaited<ReturnType<typeof fetchTalentProfileBundles>> extends Map<string, infer T> ? T | undefined : never;
  if (submission.talent_id) {
    try {
      profile = (await fetchTalentProfileBundles(supabase, [submission.talent_id as string])).get(submission.talent_id as string);
    } catch { return { ok: false, error: "Could not load this applicant's profile. Please retry." }; }
  }
  const talentProfileId = profile?.professionalProfileId ?? null;
  const agency = (submission.agency as string | null)?.trim() || profile?.agency || null;
  const displayName = (submission.full_name as string | null)?.trim() || profile?.fullName || "Applicant";

  if (talentProfileId) {
    const { data: existingByTalent } = await supabase
      .from("casting_candidates")
      .select("id, status")
      .eq("casting_id", castingId)
      .eq("talent_profile_id", talentProfileId)
      .maybeSingle();

    if (existingByTalent) {
      const current = normalizeCandidateStatus(existingByTalent.status as string);
      if (current !== status && !isCastingStatusTransitionAllowed(current, status)) {
        return { ok: false, error: `Cannot move from ${current} to ${status}.` };
      }

      const syncError = await syncSubmissionStatus(supabase, submissionId, status);
      if (syncError) return { ok: false, error: syncError };
      const { error } = await supabase
        .from("casting_candidates")
        .update({
          status,
          submission_id: submissionId,
          display_name: displayName,
          email: (submission.email as string | null) ?? undefined,
          agency: agency ?? undefined,
          headshot_url: (submission.headshot_url as string | null) ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingByTalent.id);
      if (error) return { ok: false, error: error.message };


      return { ok: true, candidateId: existingByTalent.id as string };
    }
  }

  const bridgedRoleId = (submission.role_id as string | null) ?? role?.id ?? null;
  const roleIds = bridgedRoleId ? [bridgedRoleId] : [];
  const currentFromSubmission = normalizeCandidateStatus(submission.status as string);
  if (currentFromSubmission !== status && !isCastingStatusTransitionAllowed(currentFromSubmission, status)) {
    return {
      ok: false,
      error: `Cannot move from ${currentFromSubmission} to ${status}.`,
    };
  }

  const syncError = await syncSubmissionStatus(supabase, submissionId, status);
  if (syncError) return { ok: false, error: syncError };
  const { data: inserted, error: insertError } = await supabase
    .from("casting_candidates")
    .insert({
      casting_id: castingId,
      project_id: projectId,
      talent_profile_id: talentProfileId,
      submission_id: submissionId,
      role_ids: roleIds,
      source: "public_submission",
      status,
      display_name: displayName,
      email: (submission.email as string | null) ?? null,
      agency,
      headshot_url: (submission.headshot_url as string | null) ?? null,
      created_by: userId,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: insertError?.message ?? "Could not save candidate." };
  }


  return { ok: true, candidateId: inserted.id as string };
}

export async function bulkUpdateCastingCandidateStatus(input: {
  projectId: string;
  candidateIds: string[];
  status: CastingCandidateStatus;
  notifyTalent?: boolean;
}): Promise<{ ok: boolean; error?: string; count?: number }> {
  let count = 0;
  for (const candidateId of input.candidateIds) {
    const result = await updateCastingCandidateStatus({
      projectId: input.projectId,
      candidateId,
      status: input.status,
      notifyTalent: input.notifyTalent,
    });
    if (result.ok) count += 1;
  }
  return { ok: true, count };
}

export async function upsertCastingEvaluation(input: {
  projectId: string;
  candidateId: string;
  roleId?: string;
  recommendation?: CastingRecommendation;
  scorecard?: Record<string, number | boolean | string>;
  privateNotes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const access = await requireProjectAccess(input.projectId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  if (input.candidateId.startsWith("submission-")) {
    return { ok: false, error: "Save candidate to pipeline before evaluating." };
  }

  const candidate = await supabase.from("casting_candidates").select("id").eq("id", input.candidateId).eq("project_id", input.projectId).maybeSingle();
  if (candidate.error || !candidate.data) return { ok: false, error: "Candidate not found in this project." };
  if (input.roleId) {
    const role = await supabase.from("roles").select("id").eq("id", input.roleId).eq("project_id", input.projectId).maybeSingle();
    if (role.error || !role.data) return { ok: false, error: "Role not found in this project." };
  }
  const existingQuery = supabase.from("casting_evaluations").select("id")
    .eq("casting_candidate_id", input.candidateId).eq("evaluator_id", user.id)
    .order("updated_at", { ascending: false }).limit(1);
  const existing = await (input.roleId ? existingQuery.eq("role_id", input.roleId) : existingQuery.is("role_id", null)).maybeSingle();
  if (existing.error) return { ok: false, error: "Could not load your previous review. Please retry." };
  // PostgreSQL's nullable role_id unique key does not deduplicate general notes.
  // A stable primary ID also makes concurrent first-save retries converge.
  const hex = createHash("sha256").update(`motiion:casting-evaluation:${input.candidateId}:${user.id}:${input.roleId || "general"}`).digest("hex").slice(0, 32);
  const evaluationId = existing.data?.id ?? `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;

  const { error } = await supabase.from("casting_evaluations").upsert(
    {
      id: evaluationId,
      casting_candidate_id: input.candidateId,
      evaluator_id: user.id,
      role_id: input.roleId ?? null,
      recommendation: input.recommendation ?? null,
      scorecard: input.scorecard ?? {},
      private_notes: input.privateNotes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) return { ok: false, error: error.message };

  await trackServerEvent("casting_candidate_reviewed", {
    project_id: input.projectId,
    candidate_id: input.candidateId,
  });

  revalidateProject(input.projectId);
  return { ok: true };
}

export async function addDiscoveredCandidates(input: {
  projectId: string;
  profileIds: string[];
  roleIds: string[];
  source?: CastingCandidateSource;
  initialStatus?: CastingCandidateStatus;
}): Promise<{ ok: boolean; error?: string; count?: number }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const access = await requireProjectAccess(input.projectId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  const castingId =
    (await resolvePrimaryCastingId(input.projectId, user.id)) ??
    (await ensurePrimaryCastingDraft(input.projectId, user.id, access.project.title));

  if (!castingId) return { ok: false, error: "Could not resolve casting." };

  const { data: profiles, error: profilesError } = await supabase
    .from("professional_profiles")
    .select("id, slug")
    .in("id", input.profileIds);

  if (profilesError) return { ok: false, error: "Could not load talent. Please retry." };
  const roles = await supabase.from("roles").select("id").eq("project_id", input.projectId).eq("casting_id", castingId).in("id", input.roleIds);
  if (roles.error || roles.data.length !== new Set(input.roleIds).size) return { ok: false, error: "Choose roles from this casting." };
  let count = 0;
  for (const profile of profiles ?? []) {
    const saved = await saveDiscoveredCastingCandidate(supabase,
      {
        casting_id: castingId,
        project_id: input.projectId,
        talent_profile_id: profile.id,
        role_ids: input.roleIds,
        source: input.source ?? "talent_search",
        status: input.initialStatus ?? "discovered",
        display_name: (profile.slug as string).replace(/-/g, " "),
        created_by: user.id,
      },
    );
    if (saved.ok) count += 1;
  }

  await trackServerEvent("casting_candidate_saved", {
    project_id: input.projectId,
    bulk_action_count: count,
  });

  revalidateProject(input.projectId);
  return count === new Set(input.profileIds).size ? { ok: true, count } : { ok: false, count, error: `${count} candidates saved. Some could not be saved; refresh and retry.` };
}

export async function addExternalCandidate(input: {
  projectId: string;
  fullName: string;
  email?: string;
  phone?: string;
  representation?: string;
  source: CastingCandidateSource;
  roleIds: string[];
  headshotUrl?: string;
  resumeUrl?: string;
  mediaUrl?: string;
  internalNotes?: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const access = await requireProjectAccess(input.projectId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  const castingId =
    (await resolvePrimaryCastingId(input.projectId, user.id)) ??
    (await ensurePrimaryCastingDraft(input.projectId, user.id, access.project.title));

  if (!castingId) return { ok: false, error: "Could not resolve casting." };

  const { data: external, error: extError } = await supabase
    .from("casting_external_candidates")
    .insert({
      casting_id: castingId,
      project_id: input.projectId,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      representation: input.representation,
      source: input.source,
      role_ids: input.roleIds,
      headshot_url: input.headshotUrl,
      resume_url: input.resumeUrl,
      media_url: input.mediaUrl,
      internal_notes: input.internalNotes,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (extError || !external) return { ok: false, error: extError?.message ?? "Insert failed." };

  const pipeline = await supabase.from("casting_candidates").insert({
    casting_id: castingId,
    project_id: input.projectId,
    external_candidate_id: external.id,
    role_ids: input.roleIds,
    source: input.source,
    status: "submitted",
    display_name: input.fullName,
    email: input.email,
    headshot_url: input.headshotUrl,
    created_by: user.id,
  });
  if (pipeline.error) {
    const rollback = await supabase.from("casting_external_candidates").delete().eq("id", external.id).eq("project_id", input.projectId);
    return { ok: false, error: rollback.error
      ? "The contact was saved, but its review card could not be created. Refresh before trying again."
      : "Could not save this candidate. Please retry." };
  }

  revalidateProject(input.projectId);
  return { ok: true, id: external.id as string };
}

export async function createJobFromCasting(
  projectId: string,
  options?: { existingJobId?: string | null },
): Promise<{ ok: boolean; error?: string; jobId?: string; jobProjectId?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const access = await requireProjectAccess(projectId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  const castingId = await resolvePrimaryCastingId(projectId, user.id);
  if (!castingId) return { ok: false, error: "No casting found." };

  const { data: casting } = await supabase.from("castings").select("*").eq("id", castingId).maybeSingle();
  if (!casting) return { ok: false, error: "Casting not found." };

  const { data: confirmedCandidates } = await supabase
    .from("casting_candidates")
    .select("talent_profile_id, role_ids, display_name")
    .eq("casting_id", castingId)
    .eq("status", "confirmed");

  const profileIds = (confirmedCandidates ?? [])
    .map((c) => c.talent_profile_id as string | null)
    .filter((id): id is string => Boolean(id));

  const dancerUserIds: string[] = [];
  if (profileIds.length) {
    const { data: profiles } = await supabase
      .from("professional_profiles")
      .select("id, user_id")
      .in("id", profileIds);
    for (const profile of profiles ?? []) {
      if (profile.user_id) dancerUserIds.push(profile.user_id as string);
    }
  }

  const { data, error } = await supabase.rpc("create_or_attach_production_job_from_casting", {
    p_title: `${access.project.title} — Job`,
    p_dancer_user_ids: dancerUserIds,
    p_existing_job_id: options?.existingJobId || null,
    p_role_id: null,
    p_project_id: projectId,
    p_start_date: null,
    p_end_date: null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const result = data as {
    ok?: boolean;
    error?: string;
    job_id?: string;
  } | null;

  if (!result?.ok || !result.job_id) {
    return { ok: false, error: result?.error ?? "Could not create production job." };
  }

  await trackServerEvent("casting_job_created", {
    project_id: projectId,
    job_id: result.job_id,
  });

  revalidatePath(`/jobs/${result.job_id}`);
  revalidatePath("/projects");
  return { ok: true, jobId: result.job_id, jobProjectId: result.job_id };
}

const RESENDABLE_INVITATION_STATUSES = new Set(["pending", "withdrawn", "declined", "expired"]);

export async function inviteCandidatesFromSearch(input: {
  projectId: string;
  profileIds: string[];
  roleIds: string[];
  message?: string;
}): Promise<{ ok: boolean; error?: string; count?: number }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const access = await requireProjectAccess(input.projectId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  const identity = await requireIndustryIdentityVerified(user.id);
  if (!identity.ok) return { ok: false, error: identity.error };
  const castingId = await resolvePrimaryCastingId(input.projectId, user.id);
  if (!castingId) {
    return { ok: false, error: "Publish the casting before inviting talent." };
  }

  const { data: casting } = await supabase
    .from("castings")
    .select("status")
    .eq("id", castingId)
    .maybeSingle<{ status: string | null }>();

  if (!castingAcceptsOutreach(casting?.status)) {
    return { ok: false, error: "Publish the casting before inviting talent." };
  }

  const allowance = await requireCastingOutreachAllowance(user.id, castingId, input.profileIds.length);
  if (!allowance.ok) {
    return { ok: false, error: allowance.error };
  }

  const validRoles = await supabase.from("roles").select("id").eq("project_id", input.projectId).eq("casting_id", castingId).in("id", input.roleIds);
  if (validRoles.error || validRoles.data.length !== new Set(input.roleIds).size || !input.roleIds.length) return { ok: false, error: "Choose roles from this casting." };
  let count = 0;
  let failures = 0;
  for (const talentKey of input.profileIds) {
    const profileId = await resolveProfessionalProfileId(supabase, talentKey);
    if (!profileId) { failures++; continue; }

    const sentAt = new Date().toISOString();
    const { data: existing } = await supabase
      .from("invitations")
      .select("id, status")
      .eq("casting_id", castingId)
      .eq("invited_profile_id", profileId)
      .maybeSingle<{ id: string; status: string }>();

    let invitationId: string | null = null;

    if (existing) {
      if (!RESENDABLE_INVITATION_STATUSES.has(existing.status)) {
        continue;
      }

      const { data: updated, error: updateError } = await supabase
        .from("invitations")
        .update({
          status: "pending",
          message: input.message,
          role_ids: input.roleIds,
          sent_at: null,
          viewed_at: null,
          responded_at: null,
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (updateError || !updated) { failures++; continue; }
      invitationId = updated.id as string;
    } else {
      const { data: invitation, error } = await supabase
        .from("invitations")
        .insert({
          project_id: input.projectId,
          casting_id: castingId,
          invited_profile_id: profileId,
          invited_by: user.id,
          kind: "casting",
          status: "pending",
          message: input.message,
          role_ids: input.roleIds,
          sent_at: null,
        })
        .select("id")
        .single();

      if (error || !invitation) { failures++; continue; }
      invitationId = invitation.id as string;
    }

    const bridge = await bridgeWebInviteToMobile(supabase, { invitedProfileId: profileId, roleIds: input.roleIds, castingId });
    if (bridge.errors.length || bridge.bridged === 0) { failures++; continue; }
    const { data: profile } = await supabase
      .from("professional_profiles")
      .select("slug")
      .eq("id", profileId)
      .maybeSingle();

    const saved = await saveDiscoveredCastingCandidate(supabase,
      {
        casting_id: castingId,
        project_id: input.projectId,
        talent_profile_id: profileId,
        invitation_id: invitationId,
        role_ids: input.roleIds,
        source: "invitation",
        status: "invited",
        display_name: profile?.slug?.replace(/-/g, " ") ?? "Talent",
        created_by: user.id,
      },
    );

    if (!saved.ok) { failures++; continue; }
    const sent = await supabase.from("invitations").update({ status: "sent", sent_at: sentAt }).eq("id", invitationId);
    if (sent.error) { failures++; continue; }
    count += 1;
  }

  if (count > 0) await trackServerEvent("casting_invitation_sent", {
    project_id: input.projectId,
    bulk_action_count: count,
  });

  revalidateProject(input.projectId);
  return failures ? { ok: false, count, error: `${count} invitations sent; ${failures} could not be completed. Retry the pending invitations safely.` } : { ok: true, count };
}

export async function withdrawInvitationFromSearch(input: {
  projectId: string;
  invitationId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const access = await requireProjectAccess(input.projectId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  const { data: invitation, error: invitationError } = await supabase
    .from("invitations")
    .select("id, casting_id, project_id, status, role_ids, role_id, invited_profile_id")
    .eq("id", input.invitationId)
    .eq("project_id", input.projectId)
    .maybeSingle<{ id: string; casting_id: string | null; project_id: string; status: string; role_ids: string[] | null; role_id: string | null; invited_profile_id: string }>();

  if (invitationError || !invitation) {
    return { ok: false, error: invitationError?.message ?? "Invitation not found." };
  }

  if (invitation.status === "withdrawn") {
    return { ok: true };
  }

  if (access.project.poster_id !== user.id) return { ok: false, error: "Only the project owner can withdraw a talent invitation." };
  const talent = await supabase.from("professional_profiles").select("user_id").eq("id", invitation.invited_profile_id).maybeSingle();
  if (talent.error || !talent.data?.user_id) return { ok: false, error: "Could not resolve this invitation’s talent account." };
  let roleIds = invitation.role_ids?.length ? invitation.role_ids : invitation.role_id ? [invitation.role_id] : [];
  if (!roleIds.length && invitation.casting_id) {
    const roles = await supabase.from("roles").select("id").eq("project_id", input.projectId).eq("casting_id", invitation.casting_id);
    if (roles.error) return { ok: false, error: "Could not load the invited roles." };
    roleIds = roles.data.map((role) => role.id);
  }
  if (roleIds.length) {
    const revoked = await supabase.from("role_access").delete().eq("talent_id", talent.data.user_id).in("role_id", roleIds);
    if (revoked.error) return { ok: false, error: "Could not withdraw casting access. Please retry." };
  }
  const { error: updateError } = await supabase
    .from("invitations")
    .update({ status: "withdrawn" })
    .eq("id", invitation.id);

  if (updateError) return { ok: false, error: updateError.message };

  await supabase
    .from("casting_candidates")
    .update({
      status: "withdrawn",
      updated_at: new Date().toISOString(),
    })
    .eq("invitation_id", invitation.id);

  await trackServerEvent("casting_invitation_withdrawn", {
    project_id: input.projectId,
    invitation_id: invitation.id,
  });

  revalidateProject(input.projectId);
  return { ok: true };
}

export async function createCastingReferral(input: {
  castingId: string;
  referredProfileId: string;
  roleIds?: string[];
  note?: string;
}): Promise<{ ok: boolean; error?: string; referralId?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const allowance = await requireCastingOutreachAllowance(user.id, input.castingId, 1);
  if (!allowance.ok) return { ok: false, error: allowance.error };

  const referredProfileId = await resolveProfessionalProfileId(supabase, input.referredProfileId);
  if (!referredProfileId) {
    return { ok: false, error: "This profile isn't available for referrals yet." };
  }

  const { data: casting } = await supabase
    .from("castings")
    .select("id, project_id, title, status")
    .eq("id", input.castingId)
    .maybeSingle();

  if (!casting) return { ok: false, error: "Casting not found." };
  if (!castingAcceptsOutreach(casting.status as string | null)) {
    return { ok: false, error: "This casting is not accepting referrals." };
  }

  const { data: referredProfile } = await supabase
    .from("professional_profiles")
    .select("id, user_id, slug")
    .eq("id", referredProfileId)
    .maybeSingle();

  if (!referredProfile) return { ok: false, error: "Profile not found." };
  if (referredProfile.user_id === user.id) {
    return { ok: false, error: "You cannot refer yourself." };
  }

  const roleIds = [...new Set(input.roleIds ?? [])];
  const validRoles = await supabase.from("roles").select("id").eq("casting_id", input.castingId).in("id", roleIds);
  if (validRoles.error || validRoles.data.length !== roleIds.length) return { ok: false, error: "Choose roles from this casting." };
  const { data: referral, error } = await supabase
    .from("casting_referrals")
    .insert({
      casting_id: input.castingId,
      project_id: casting.project_id as string,
      referred_profile_id: referredProfileId,
      referrer_user_id: user.id,
      role_ids: roleIds,
      note: input.note?.trim() || null,
      status: "submitted",
      source: "authenticated",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "This dancer has already been referred to this casting." };
    }
    return { ok: false, error: error.message };
  }

  await trackServerEvent("casting_referral_submitted", {
    casting_id: input.castingId,
    project_id: casting.project_id,
  });

  revalidateProject(casting.project_id as string);
  revalidatePath(`/refer/${input.castingId}`);

  return { ok: true, referralId: referral.id as string };
}

/** Mirrors current iOS RoleService.reopenCasting: preserve final IDs, People and coordination. */
export async function reopenFinalizedCastingRole(input: {
  projectId: string;
  bridgedRoleId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Casting is unavailable right now." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to reopen casting." };
  const access = await requireProjectAccess(input.projectId, user.id);
  if (!access.ok) return { ok: false, error: access.error };
  const identity = await requireIndustryIdentityVerified(user.id);
  if (!identity.ok) return { ok: false, error: identity.error };
  const { data: role, error } = await supabase.from("roles").select("id, casting_id")
    .eq("id", input.bridgedRoleId).eq("project_id", input.projectId).maybeSingle();
  if (error || !role) return { ok: false, error: "Could not load the role to reopen. Please retry." };
  if (role.casting_id) {
    const casting = await supabase.from("castings").update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", role.casting_id).eq("project_id", input.projectId);
    if (casting.error) return { ok: false, error: "Could not reopen casting. Please retry." };
  }
  const reopened = await supabase.from("roles").update({ is_active: true, is_casting_finalized: false, updated_at: new Date().toISOString() })
    .eq("id", role.id).eq("project_id", input.projectId).select("id").maybeSingle();
  if (reopened.error || !reopened.data) return { ok: false, error: "Could not reopen this role. Existing selections are preserved; please retry." };
  revalidateProject(input.projectId);
  return { ok: true };
}

export async function finalizeCastingRole(input: {
  projectId: string;
  bridgedRoleId: string;
}): Promise<{ ok: boolean; error?: string; finalizedCount?: number }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  const access = await requireProjectAccess(input.projectId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  const { data: role, error: roleError } = await supabase.from("roles")
    .select("id, casting_id, project_id, is_casting_finalized, final_select_ids")
    .eq("id", input.bridgedRoleId).eq("project_id", input.projectId).maybeSingle();
  if (roleError || !role) return { ok: false, error: "Could not load this role. Refresh and try again." };

  const [pipelineResult, submissionResult] = await Promise.all([
    supabase.from("casting_candidates").select("submission_id, status, role_ids")
      .eq("project_id", input.projectId),
    supabase.from("submissions").select("id, talent_id, status").eq("role_id", input.bridgedRoleId),
  ]);
  if (pipelineResult.error || submissionResult.error) return { ok: false, error: "Could not load the latest selections. Nothing has been finalized. Try again." };
  const submissions = submissionResult.data ?? [];
  const finalSelectIds = finalSubmissionIds({ roleId: input.bridgedRoleId, submissions, candidates: pipelineResult.data ?? [], savedIds: role.final_select_ids });
  if (!finalSelectIds.length) return { ok: false, error: "Select at least one submitted candidate before finalizing this role." };

  const { data: finalized, error } = await supabase.rpc("finalize_casting_role_selections", {
    p_project_id: input.projectId,
    p_role_id: input.bridgedRoleId,
    p_expected_submission_ids: finalSelectIds,
  });
  if (error || !finalized?.ok) {
    const missing = error?.code === "PGRST202" || error?.code === "42883";
    return { ok: false, error: missing
      ? "Casting finalization is awaiting a server update. Your selections are saved; please try again after the update."
      : error?.code === "PT409"
        ? "Selections changed while you were reviewing. Refresh and try again."
        : "Could not finalize this role. No selections or project people were changed. Please try again." };
  }

  await trackServerEvent("casting_role_finalized", { project_id: input.projectId, role_id: input.bridgedRoleId, selected_count: finalSelectIds.length });
  revalidateProject(input.projectId);
  return { ok: true, finalizedCount: finalSelectIds.length };
}

function generateReferralToken(): string {
  return randomBytes(18).toString("base64url");
}

export async function getOrCreateCastingReferralToken(
  castingId: string,
): Promise<{ ok: boolean; token?: string; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { data: casting } = await supabase
    .from("castings")
    .select("id, project_id, status")
    .eq("id", castingId)
    .maybeSingle();

  if (!casting) return { ok: false, error: "Casting not found." };
  if (!castingAcceptsOutreach(casting.status as string | null)) {
    return { ok: false, error: "Publish the casting before sharing referral links." };
  }

  const access = await requireProjectAccess(casting.project_id as string, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  const { data: existing } = await supabase
    .from("casting_referral_tokens")
    .select("token, expires_at, revoked_at")
    .eq("casting_id", castingId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.token) {
    const expired =
      existing.expires_at && new Date(existing.expires_at as string).getTime() < Date.now();
    if (!expired) return { ok: true, token: existing.token as string };
  }

  const token = generateReferralToken();
  const { data: created, error } = await supabase
    .from("casting_referral_tokens")
    .insert({
      casting_id: castingId,
      project_id: casting.project_id as string,
      token,
      created_by: user.id,
    })
    .select("token")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, token: (created.token as string) ?? token };
}

export async function getCastingReferralShareUrls(castingId: string): Promise<{
  ok: boolean;
  motiionUrl?: string;
  externalUrl?: string;
  error?: string;
}> {
  const tokenResult = await getOrCreateCastingReferralToken(castingId);
  if (!tokenResult.ok || !tokenResult.token) {
    return { ok: false, error: tokenResult.error ?? "Could not create referral link." };
  }

  // Motiion referral links must use the canonical app host so iOS Associated Domains
  // + DeepLinkRouter open in-app. External/anonymous links keep the current site origin.
  const canonicalOrigin =
    process.env.NEXT_PUBLIC_CANONICAL_APP_URL?.replace(/\/$/, "") || "https://www.motiion.app";
  const siteOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "";

  const motiionPath = `/refer/${castingId}`;
  const externalPath = `/r/${tokenResult.token}`;

  return {
    ok: true,
    motiionUrl: `${canonicalOrigin}${motiionPath}`,
    externalUrl: siteOrigin ? `${siteOrigin}${externalPath}` : externalPath,
  };
}

export async function searchPlatformUsers(
  query: string,
): Promise<{ users: PlatformUserResult[]; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { users: [], error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { users: [], error: "You must be signed in." };

  const needle = query.trim();
  if (needle.length < 2) return { users: [] };

  const like = `%${needle.replace(/[%_]/g, "")}%`;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, first_name, last_name, headshot_urls, account_type")
    .or(
      `display_name.ilike.${like},first_name.ilike.${like},last_name.ilike.${like},username.ilike.${like}`,
    )
    .neq("user_id", user.id)
    .limit(20);

  if (error) return { users: [], error: error.message };

  const { data: proRows } = await supabase
    .from("professional_profiles")
    .select("user_id, slug")
    .ilike("slug", like)
    .neq("user_id", user.id)
    .limit(20);

  const userIds = new Set<string>();
  for (const row of profiles ?? []) {
    if (row.user_id) userIds.add(row.user_id as string);
  }
  for (const row of proRows ?? []) {
    if (row.user_id) userIds.add(row.user_id as string);
  }

  if (!userIds.size) return { users: [] };

  const ids = [...userIds].slice(0, 20);
  const [{ data: allProfiles }, { data: allPros }] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, display_name, first_name, last_name, headshot_urls, account_type")
      .in("user_id", ids),
    supabase.from("professional_profiles").select("user_id, slug").in("user_id", ids),
  ]);

  const proByUser = new Map((allPros ?? []).map((row) => [row.user_id as string, row]));
  const { getProfileAvatarUrl } = await import("@/lib/auth/avatar");

  const users: PlatformUserResult[] = (allProfiles ?? []).map((row) => {
    const name =
      (row.display_name as string | null)?.trim() ||
      [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
      "User";
    const pro = proByUser.get(row.user_id as string);
    const accountType = (row.account_type as string | null) ?? undefined;
    return {
      userId: row.user_id as string,
      name,
      slug: (pro?.slug as string | undefined) ?? undefined,
      subtitle: accountType ? accountType.replaceAll("_", " ") : undefined,
      imageUrl: getProfileAvatarUrl(row.headshot_urls as string[] | null),
    };
  });

  return { users };
}

const ANON_REFERRAL_HOURLY_LIMIT = 25;

export async function validateReferralToken(token: string): Promise<{
  ok: boolean;
  castingId?: string;
  castingTitle?: string;
  castingDescription?: string;
  projectId?: string;
  tokenId?: string;
  tokenCreatedBy?: string;
  roles?: ReferralRoleOption[];
  error?: string;
}> {
  const admin = createAdminSupabaseClient();
  if (!admin) return { ok: false, error: "Supabase is not configured." };

  const trimmed = token.trim();
  if (!trimmed) return { ok: false, error: "Invalid referral link." };

  const { data: tokenRow } = await admin
    .from("casting_referral_tokens")
    .select("id, casting_id, project_id, expires_at, revoked_at, created_by")
    .eq("token", trimmed)
    .maybeSingle();

  if (!tokenRow || tokenRow.revoked_at) {
    return { ok: false, error: "This referral link is no longer valid." };
  }
  if (tokenRow.expires_at && new Date(tokenRow.expires_at as string).getTime() < Date.now()) {
    return { ok: false, error: "This referral link has expired." };
  }

  const { data: casting } = await admin
    .from("castings")
    .select("id, title, description, status")
    .eq("id", tokenRow.casting_id as string)
    .maybeSingle();

  if (!casting || !castingAcceptsOutreach(casting.status as string | null)) {
    return { ok: false, error: "This casting is not accepting referrals." };
  }

  const [{ data: castingRoles }, { data: bridgedRoles }] = await Promise.all([
    admin
      .from("casting_roles")
      .select(
        "id, title, description, gender, age_min, age_max, ethnicity_preferences, special_skills, height_min_cm, height_max_cm, union_status, people_needed, sort_order",
      )
      .eq("casting_id", casting.id as string)
      .order("sort_order", { ascending: true }),
    admin
      .from("roles")
      .select("id, title")
      .eq("casting_id", casting.id as string)
      .order("created_at", { ascending: true }),
  ]);

  const bridgedByTitle = new Map(
    (bridgedRoles ?? []).map((role) => [
      ((role.title as string) || "").trim().toLowerCase(),
      role.id as string,
    ]),
  );

  const roles = dedupeReferralRoles(
    (castingRoles ?? []).map((role) => {
      const title = (role.title as string) || "Role";
      return {
        id: role.id as string,
        name: title,
        bridgedRoleId: bridgedByTitle.get(title.trim().toLowerCase()),
        description: (role.description as string | null) ?? undefined,
        gender: (role.gender as string | null) ?? undefined,
        ageMin: (role.age_min as number | null) ?? null,
        ageMax: (role.age_max as number | null) ?? null,
        ethnicityPreferences: (role.ethnicity_preferences as string[] | null) ?? [],
        specialSkills: (role.special_skills as string[] | null) ?? [],
        heightMinCm: (role.height_min_cm as number | null) ?? null,
        heightMaxCm: (role.height_max_cm as number | null) ?? null,
        unionStatus: (role.union_status as string | null) ?? undefined,
        peopleNeeded: (role.people_needed as number | null) ?? null,
      };
    }),
  );

  return {
    ok: true,
    castingId: casting.id as string,
    castingTitle: (casting.title as string) || "this casting",
    castingDescription: (casting.description as string | null) ?? undefined,
    projectId: tokenRow.project_id as string,
    tokenId: tokenRow.id as string,
    tokenCreatedBy: (tokenRow.created_by as string | null) ?? undefined,
    roles,
  };
}

export async function searchTalentForReferralToken(
  token: string,
  keyword: string,
): Promise<{ talent: Talent[]; error?: string }> {
  const validated = await validateReferralToken(token);
  if (!validated.ok) return { talent: [], error: validated.error };

  const needle = keyword.trim();
  if (!needle) return { talent: [] };

  const result = await searchTalentProfiles(
    navigatorFiltersToSearchFilters({
      ...EMPTY_NAVIGATOR_FILTERS,
      keyword: needle,
    }),
  );
  const data = buildNavigatorInitialData(result, {
    ...EMPTY_NAVIGATOR_FILTERS,
    keyword: needle,
  });
  return { talent: data.talent.slice(0, 12) };
}

export async function createAnonymousCastingReferral(input: {
  token: string;
  referredProfileIds: string[];
  roleIds?: string[];
  note?: string;
  referrerDisplayName?: string;
}): Promise<{ ok: boolean; count?: number; error?: string }> {
  const admin = createAdminSupabaseClient();
  if (!admin) return { ok: false, error: "Supabase is not configured." };

  const validated = await validateReferralToken(input.token);
  if (!validated.ok || !validated.castingId || !validated.projectId || !validated.tokenId) {
    return { ok: false, error: validated.error ?? "Invalid referral link." };
  }

  const profileIds = [...new Set(input.referredProfileIds.filter(Boolean))];
  if (!profileIds.length) return { ok: false, error: "Select at least one dancer to refer." };
  if (profileIds.length > 10) return { ok: false, error: "You can refer up to 10 dancers at a time." };

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount, error: countError } = await admin
    .from("casting_referrals")
    .select("id", { count: "exact", head: true })
    .eq("referral_token_id", validated.tokenId)
    .gte("created_at", hourAgo);

  if (countError) return { ok: false, error: "Could not check this referral link. Please retry." };

  if ((recentCount ?? 0) + profileIds.length > ANON_REFERRAL_HOURLY_LIMIT) {
    return { ok: false, error: "Referral limit reached for this link. Try again later." };
  }

  const roleIds = [...new Set(input.roleIds ?? [])];
  const validRoles = await admin.from("roles").select("id").eq("casting_id", validated.castingId).eq("project_id", validated.projectId).in("id", roleIds);
  if (validRoles.error || validRoles.data.length !== roleIds.length) return { ok: false, error: "Choose roles from this casting." };
  const displayName = input.referrerDisplayName?.trim() || "Anonymous";
  let created = 0;

  for (const rawId of profileIds) {
    const referredProfileId = await resolveProfessionalProfileId(admin, rawId);
    if (!referredProfileId) continue;

    const { data: referredProfile } = await admin
      .from("professional_profiles")
      .select("id, user_id, slug")
      .eq("id", referredProfileId)
      .eq("is_verified", true)
      .maybeSingle();

    if (!referredProfile) continue;
    // A public referral token grants permission to recommend discoverable talent,
    // not to disclose a private profile through the service client.
    const publicProfile = await admin.from("profiles").select("user_id")
      .eq("user_id", referredProfile.user_id)
      .or("is_private.is.null,is_private.eq.false")
      .or("moderation_status.is.null,moderation_status.eq.active")
      .maybeSingle();
    if (publicProfile.error || !publicProfile.data) continue;

    const { error } = await admin.from("casting_referrals").insert({
      casting_id: validated.castingId,
      project_id: validated.projectId,
      referred_profile_id: referredProfileId,
      referrer_user_id: null,
      referral_token_id: validated.tokenId,
      referrer_display_name: displayName,
      role_ids: roleIds,
      note: input.note?.trim() || null,
      status: "submitted",
      source: "anonymous",
    });

    if (error) {
      if (error.code === "23505") continue;
      return { ok: false, error: error.message };
    }

    created += 1;
  }

  if (!created) {
    return { ok: false, error: "Those dancers were already referred or unavailable." };
  }

  await trackServerEvent("casting_referral_submitted", {
    casting_id: validated.castingId,
    project_id: validated.projectId,
    source: "anonymous",
    count: created,
  });

  revalidateProject(validated.projectId);
  revalidatePath(`/r/${input.token}`);
  revalidatePath(`/refer/${validated.castingId}`);

  return { ok: true, count: created };
}
