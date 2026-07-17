import { createClientSupabaseClient } from "@/lib/supabase/client";

export type CastingSubmissionResult =
  | { ok: true; submissionId?: string }
  | { ok: false; message: string };

type CreateCastingSubmissionRpcResult = {
  ok?: boolean;
  code?: string;
  message?: string;
  submission_id?: string;
};

const ERROR_MESSAGES: Record<string, string> = {
  invite_only: "This casting is invite-only. You need an invitation to submit.",
  deadline_passed: "The submission deadline has passed.",
  external_link_only: "Use the external submission link for this casting.",
  role_inactive: "This casting is not accepting submissions.",
  role_finalized: "Casting has been finalized.",
  role_not_found: "Casting role not found.",
  not_authenticated: "Sign in to submit to this casting.",
  free_casting_quota_exhausted: "You've reached the free plan casting submission limit.",
  subscription_required_for_castings: "Upgrade to submit to more castings.",
  starter_casting_quota: "You've reached your monthly casting submission limit.",
};

function mapSubmissionError(result: CreateCastingSubmissionRpcResult): string {
  if (result.code && ERROR_MESSAGES[result.code]) {
    return ERROR_MESSAGES[result.code];
  }
  return result.message?.trim() || "Could not submit. Please try again.";
}

export async function submitToCastingRole(input: {
  roleId: string;
  note?: string;
}): Promise<CastingSubmissionResult> {
  const supabase = createClientSupabaseClient();
  if (!supabase) {
    return { ok: false, message: "Submission is unavailable right now." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: ERROR_MESSAGES.not_authenticated };
  }

  const params: Record<string, string> = {
    p_role_id: input.roleId,
    p_application_source: "native",
    p_talent_id: user.id,
  };

  const trimmedNote = input.note?.trim();
  if (trimmedNote) {
    params.p_note = trimmedNote;
  }

  const { data, error } = await supabase.rpc("create_casting_submission", params);

  if (error) {
    return { ok: false, message: error.message || "Could not submit. Please try again." };
  }

  const result = (data ?? {}) as CreateCastingSubmissionRpcResult;
  if (!result.ok) {
    return { ok: false, message: mapSubmissionError(result) };
  }

  return { ok: true, submissionId: result.submission_id };
}
