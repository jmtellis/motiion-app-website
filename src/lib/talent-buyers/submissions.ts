"use server";

import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isValidSubmissionStatus,
  type SubmissionStatus,
} from "@/lib/talent-buyers/submission-status";

async function assertPosterOwnsSubmission(
  submissionId: string,
  userId: string,
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { data: submission, error } = await supabase
    .from("submissions")
    .select("id, role_id")
    .eq("id", submissionId)
    .maybeSingle<{ id: string; role_id: string }>();

  if (error || !submission) {
    return { ok: false, error: "Submission not found." };
  }

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id, project_id, poster_id")
    .eq("id", submission.role_id)
    .maybeSingle<{ id: string; project_id: string; poster_id: string }>();

  if (roleError || !role) {
    return { ok: false, error: "Role not found." };
  }

  if (role.poster_id !== userId) {
    const { data: member } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", role.project_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) return { ok: false, error: "You do not have access to review this submission." };
  }

  return { ok: true, projectId: role.project_id };
}

export async function updateSubmissionStatus(
  submissionId: string,
  status: SubmissionStatus,
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidSubmissionStatus(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const access = await assertPosterOwnsSubmission(submissionId, user.id);
  if (!access.ok) return { ok: false, error: access.error };

  const { error } = await supabase
    .from("submissions")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", submissionId);

  if (error) return { ok: false, error: error.message };

  await trackServerEvent("submission_status_updated", {
    submission_id: submissionId,
    status,
    project_id: access.projectId,
  });

  revalidatePath(`/projects/${access.projectId}`);
  return { ok: true };
}

export async function approveSubmission(submissionId: string) {
  return updateSubmissionStatus(submissionId, "approved");
}

export async function rejectSubmission(submissionId: string) {
  return updateSubmissionStatus(submissionId, "rejected");
}

export async function callbackSubmission(submissionId: string) {
  return updateSubmissionStatus(submissionId, "callback");
}

export async function resetSubmissionToPending(submissionId: string) {
  return updateSubmissionStatus(submissionId, "pending");
}
