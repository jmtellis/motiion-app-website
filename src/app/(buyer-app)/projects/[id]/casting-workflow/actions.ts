"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
import { bridgeWebInviteToMobile } from "@/lib/talent-buyers/casting/bridge-mobile-invite";
import { activatePublishedCasting } from "@/lib/talent-buyers/casting/activate-published-casting";
import { closePublishedCasting } from "@/lib/talent-buyers/casting/close-published-casting";
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
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false as const, error: "Supabase is not configured." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, poster_id, title")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { ok: false as const, error: "Project not found." };

  if (project.poster_id !== userId) {
    const { data: member } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) return { ok: false as const, error: "Access denied." };
  }

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
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

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
    .select("id, status, submission_id")
    .eq("id", input.candidateId)
    .eq("project_id", input.projectId)
    .maybeSingle();

  if (!candidate) return { ok: false, error: "Candidate not found." };

  const current = normalizeCandidateStatus(candidate.status as string);
  if (!isCastingStatusTransitionAllowed(current, input.status)) {
    return { ok: false, error: `Cannot move from ${current} to ${input.status}.` };
  }

  const { error } = await supabase
    .from("casting_candidates")
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq("id", input.candidateId);

  if (error) return { ok: false, error: error.message };

  const submissionStatus = candidateStatusToSubmissionStatus(input.status);
  if (submissionStatus && candidate.submission_id) {
    await supabase
      .from("submissions")
      .update({ status: submissionStatus, reviewed_at: new Date().toISOString() })
      .eq("id", candidate.submission_id);
  }

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

    const { error } = await supabase
      .from("casting_candidates")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", existingBySubmission.id);
    if (error) return { ok: false, error: error.message };

    const submissionStatus = candidateStatusToSubmissionStatus(status);
    if (submissionStatus) {
      await supabase
        .from("submissions")
        .update({ status: submissionStatus, reviewed_at: new Date().toISOString() })
        .eq("id", submissionId);
    }

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

  let talentProfileId: string | null = null;
  let profileAgency: string | null = null;
  if (submission.talent_id) {
    const { data: profile } = await supabase
      .from("professional_profiles")
      .select("id")
      .eq("user_id", submission.talent_id as string)
      .maybeSingle();
    talentProfileId = (profile?.id as string | null) ?? null;

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("representation, agent")
      .eq("user_id", submission.talent_id as string)
      .maybeSingle();
    profileAgency =
      (userProfile?.representation as string | null)?.trim() ||
      (userProfile?.agent as string | null)?.trim() ||
      null;
  }

  const agency =
    (submission.agency as string | null)?.trim() || profileAgency || null;

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

      const { error } = await supabase
        .from("casting_candidates")
        .update({
          status,
          submission_id: submissionId,
          email: (submission.email as string | null) ?? undefined,
          agency: agency ?? undefined,
          headshot_url: (submission.headshot_url as string | null) ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingByTalent.id);
      if (error) return { ok: false, error: error.message };

      const submissionStatus = candidateStatusToSubmissionStatus(status);
      if (submissionStatus) {
        await supabase
          .from("submissions")
          .update({ status: submissionStatus, reviewed_at: new Date().toISOString() })
          .eq("id", submissionId);
      }

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
      display_name: ((submission.full_name as string | null)?.trim() || role?.title || "Candidate") as string,
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

  const submissionStatus = candidateStatusToSubmissionStatus(status);
  if (submissionStatus) {
    await supabase
      .from("submissions")
      .update({ status: submissionStatus, reviewed_at: new Date().toISOString() })
      .eq("id", submissionId);
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

  const { error } = await supabase.from("casting_evaluations").upsert(
    {
      casting_candidate_id: input.candidateId,
      evaluator_id: user.id,
      role_id: input.roleId ?? null,
      recommendation: input.recommendation ?? null,
      scorecard: input.scorecard ?? {},
      private_notes: input.privateNotes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "casting_candidate_id,evaluator_id,role_id" },
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

  const { data: profiles } = await supabase
    .from("professional_profiles")
    .select("id, slug")
    .in("id", input.profileIds);

  let count = 0;
  for (const profile of profiles ?? []) {
    const { error } = await supabase.from("casting_candidates").upsert(
      {
        casting_id: castingId,
        project_id: input.projectId,
        talent_profile_id: profile.id,
        role_ids: input.roleIds,
        source: input.source ?? "talent_search",
        status: input.initialStatus ?? "discovered",
        display_name: (profile.slug as string).replace(/-/g, " "),
        created_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "casting_id,talent_profile_id", ignoreDuplicates: false },
    );
    if (!error) count += 1;
  }

  await trackServerEvent("casting_candidate_saved", {
    project_id: input.projectId,
    bulk_action_count: count,
  });

  revalidateProject(input.projectId);
  return { ok: true, count };
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

  await supabase.from("casting_candidates").insert({
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

  revalidateProject(input.projectId);
  return { ok: true, id: external.id as string };
}

export async function createJobFromCasting(
  projectId: string,
): Promise<{ ok: boolean; error?: string; jobProjectId?: string }> {
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

  const { data: jobProject, error: projectError } = await supabase
    .from("projects")
    .insert({
      poster_id: user.id,
      title: `${access.project.title} — Job`,
      project_type: "job",
      enabled_modules: { casting: false, activities: true },
      project_configuration: {
        source_casting_project_id: projectId,
        source_casting_id: castingId,
      },
    })
    .select("id")
    .single();

  if (projectError || !jobProject) {
    return { ok: false, error: projectError?.message ?? "Could not create job project." };
  }

  const { data: confirmedCandidates } = await supabase
    .from("casting_candidates")
    .select("talent_profile_id, role_ids, display_name")
    .eq("casting_id", castingId)
    .eq("status", "confirmed");

  for (const candidate of confirmedCandidates ?? []) {
    if (!candidate.talent_profile_id) continue;
    await supabase.from("project_roster").upsert(
      {
        project_id: jobProject.id,
        profile_id: candidate.talent_profile_id,
        notes: `Transferred from casting (${candidate.display_name})`,
      },
      { onConflict: "project_id,profile_id", ignoreDuplicates: true },
    );
  }

  await trackServerEvent("casting_job_created", {
    project_id: projectId,
    job_project_id: jobProject.id,
  });

  revalidatePath(`/projects/${jobProject.id}`);
  return { ok: true, jobProjectId: jobProject.id as string };
}

const RESENDABLE_INVITATION_STATUSES = new Set(["withdrawn", "declined", "expired"]);

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

  const castingId =
    (await resolvePrimaryCastingId(input.projectId, user.id)) ??
    (await ensurePrimaryCastingDraft(input.projectId, user.id, access.project.title));

  if (!castingId) return { ok: false, error: "Could not resolve casting." };

  let count = 0;
  for (const talentKey of input.profileIds) {
    const profileId = await resolveProfessionalProfileId(supabase, talentKey);
    if (!profileId) continue;

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
          status: "sent",
          message: input.message,
          role_ids: input.roleIds,
          sent_at: sentAt,
          viewed_at: null,
          responded_at: null,
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (updateError || !updated) continue;
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
          status: "sent",
          message: input.message,
          role_ids: input.roleIds,
          sent_at: sentAt,
        })
        .select("id")
        .single();

      if (error || !invitation) continue;
      invitationId = invitation.id as string;
    }

    const { data: profile } = await supabase
      .from("professional_profiles")
      .select("slug")
      .eq("id", profileId)
      .maybeSingle();

    await supabase.from("casting_candidates").upsert(
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
        updated_at: new Date().toISOString(),
      },
      { onConflict: "invitation_id", ignoreDuplicates: false },
    );

    await bridgeWebInviteToMobile(supabase, {
      invitedProfileId: profileId,
      roleIds: input.roleIds,
      castingId,
    });

    count += 1;
  }

  await trackServerEvent("casting_invitation_sent", {
    project_id: input.projectId,
    bulk_action_count: count,
  });

  revalidateProject(input.projectId);
  return { ok: true, count };
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
    .select("id, casting_id, project_id, status")
    .eq("id", input.invitationId)
    .eq("project_id", input.projectId)
    .maybeSingle<{ id: string; casting_id: string | null; project_id: string; status: string }>();

  if (invitationError || !invitation) {
    return { ok: false, error: invitationError?.message ?? "Invitation not found." };
  }

  if (invitation.status === "withdrawn") {
    return { ok: true };
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
  if (!["open", "published"].includes((casting.status as string) ?? "")) {
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

  const roleIds = input.roleIds ?? [];
  const referredUserId = referredProfile.user_id as string | null;
  let displayName =
    (referredProfile.slug as string | null)?.replace(/-/g, " ")?.trim() || "Talent";
  let headshotUrl: string | null = null;

  if (referredUserId) {
    const { data: talentProfile } = await supabase
      .from("profiles")
      .select("display_name, first_name, last_name, headshot_urls")
      .eq("user_id", referredUserId)
      .maybeSingle();
    const fromDisplay = (talentProfile?.display_name as string | null)?.trim();
    const fromParts = [talentProfile?.first_name, talentProfile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (fromDisplay) displayName = fromDisplay;
    else if (fromParts) displayName = fromParts;

    const urls = talentProfile?.headshot_urls;
    if (Array.isArray(urls)) {
      const first = urls.find((value) => typeof value === "string" && value.trim());
      headshotUrl = typeof first === "string" ? first.trim() : null;
    }
  }

  if (!headshotUrl) {
    const { data: media } = await supabase
      .from("media_assets")
      .select("url")
      .eq("profile_id", referredProfileId)
      .eq("kind", "headshot")
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();
    headshotUrl = (media?.url as string | null)?.trim() || null;
  }

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

  await supabase.from("casting_candidates").upsert(
    {
      casting_id: input.castingId,
      project_id: casting.project_id as string,
      talent_profile_id: referredProfileId,
      role_ids: roleIds,
      source: "referral",
      status: "discovered",
      display_name: displayName,
      headshot_url: headshotUrl,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "casting_id,talent_profile_id", ignoreDuplicates: false },
  );

  await trackServerEvent("casting_referral_submitted", {
    casting_id: input.castingId,
    project_id: casting.project_id,
  });

  revalidateProject(casting.project_id as string);
  revalidatePath(`/refer/${input.castingId}`);

  return { ok: true, referralId: referral.id as string };
}

const FINALIZE_CANDIDATE_STATUSES = ["selected", "confirmed", "accepted", "shortlisted"] as const;

export async function finalizeCastingRole(input: {
  projectId: string;
  bridgedRoleId: string;
}): Promise<{ ok: boolean; error?: string; finalizedCount?: number }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const access = await requireProjectAccess(input.projectId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  const { data: role } = await supabase
    .from("roles")
    .select("id, casting_id, project_id, poster_id, is_casting_finalized")
    .eq("id", input.bridgedRoleId)
    .maybeSingle();

  if (!role) return { ok: false, error: "Role not found." };
  if (role.project_id !== input.projectId) return { ok: false, error: "Role does not belong to this project." };
  if (role.is_casting_finalized) return { ok: false, error: "This role has already been finalized." };

  const castingId = role.casting_id as string | null;
  const submissionIds = new Set<string>();

  if (castingId) {
    const { data: pipelineCandidates } = await supabase
      .from("casting_candidates")
      .select("submission_id, status, role_ids")
      .eq("casting_id", castingId);

    for (const candidate of pipelineCandidates ?? []) {
      const roleIds = (candidate.role_ids as string[] | null) ?? [];
      if (!roleIds.includes(input.bridgedRoleId)) continue;
      if (!FINALIZE_CANDIDATE_STATUSES.includes(candidate.status as (typeof FINALIZE_CANDIDATE_STATUSES)[number])) {
        continue;
      }
      if (candidate.submission_id) submissionIds.add(candidate.submission_id as string);
    }
  }

  const { data: submissionRows } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("role_id", input.bridgedRoleId);

  for (const row of submissionRows ?? []) {
    if (["approved", "callback"].includes(row.status as string)) {
      submissionIds.add(row.id as string);
    }
  }

  const finalSelectIds = [...submissionIds];

  const { error } = await supabase
    .from("roles")
    .update({
      is_casting_finalized: true,
      is_review_complete: true,
      is_active: false,
      final_select_ids: finalSelectIds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.bridgedRoleId);

  if (error) return { ok: false, error: error.message };

  await trackServerEvent("casting_role_finalized", {
    project_id: input.projectId,
    role_id: input.bridgedRoleId,
    selected_count: finalSelectIds.length,
  });

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

  if (!casting || !["open", "published"].includes((casting.status as string) ?? "")) {
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
  const { count: recentCount } = await admin
    .from("casting_referrals")
    .select("id", { count: "exact", head: true })
    .eq("referral_token_id", validated.tokenId)
    .gte("created_at", hourAgo);

  if ((recentCount ?? 0) + profileIds.length > ANON_REFERRAL_HOURLY_LIMIT) {
    return { ok: false, error: "Referral limit reached for this link. Try again later." };
  }

  const roleIds = input.roleIds ?? [];
  const displayName = input.referrerDisplayName?.trim() || "Anonymous";
  let created = 0;

  for (const rawId of profileIds) {
    const referredProfileId = await resolveProfessionalProfileId(admin, rawId);
    if (!referredProfileId) continue;

    const { data: referredProfile } = await admin
      .from("professional_profiles")
      .select("id, user_id, slug")
      .eq("id", referredProfileId)
      .maybeSingle();

    if (!referredProfile) continue;

    const referredUserId = referredProfile.user_id as string | null;
    let talentDisplayName =
      (referredProfile.slug as string | null)?.replace(/-/g, " ")?.trim() || "Talent";
    let headshotUrl: string | null = null;

    if (referredUserId) {
      const { data: talentProfile } = await admin
        .from("profiles")
        .select("display_name, first_name, last_name, headshot_urls")
        .eq("user_id", referredUserId)
        .maybeSingle();
      const fromDisplay = (talentProfile?.display_name as string | null)?.trim();
      const fromParts = [talentProfile?.first_name, talentProfile?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (fromDisplay) talentDisplayName = fromDisplay;
      else if (fromParts) talentDisplayName = fromParts;

      const urls = talentProfile?.headshot_urls;
      if (Array.isArray(urls)) {
        const first = urls.find((value) => typeof value === "string" && value.trim());
        headshotUrl = typeof first === "string" ? first.trim() : null;
      }
    }

    if (!headshotUrl) {
      const { data: media } = await admin
        .from("media_assets")
        .select("url")
        .eq("profile_id", referredProfileId)
        .eq("kind", "headshot")
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();
      headshotUrl = (media?.url as string | null)?.trim() || null;
    }

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

    await admin.from("casting_candidates").upsert(
      {
        casting_id: validated.castingId,
        project_id: validated.projectId,
        talent_profile_id: referredProfileId,
        role_ids: roleIds,
        source: "referral",
        status: "discovered",
        display_name: talentDisplayName,
        headshot_url: headshotUrl,
        created_by: validated.tokenCreatedBy ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "casting_id,talent_profile_id", ignoreDuplicates: false },
    );

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
