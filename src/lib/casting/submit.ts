import { createClientSupabaseClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CastingSubmissionResult =
  | { ok: true; submissionId?: string }
  | { ok: false; message: string; code?: string; upgrade?: boolean };

type CreateCastingSubmissionRpcResult = {
  ok?: boolean;
  code?: string;
  message?: string;
  submission_id?: string;
};

const UPGRADE_CODES = new Set([
  "free_casting_quota_exhausted",
  "subscription_required_for_castings",
  "starter_casting_quota",
]);

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

export type CastingSubmissionInput = {
  roleId: string;
  note?: string;
  supplementalAnswers?: Record<string, string>;
  slateUrl?: string | null;
  submissionLinks?: string[];
};

export async function submitToCastingRole(input: CastingSubmissionInput): Promise<CastingSubmissionResult> {
  const supabase = createClientSupabaseClient();
  if (!supabase) {
    return { ok: false, message: "Submission is unavailable right now." };
  }
  return submitCastingRoleWithClient(supabase, input);
}

/** Shared by the browser and real-session integration checks; all authorization
 * and material requirements remain enforced by the canonical RPC. */
export async function submitCastingRoleWithClient(supabase: SupabaseClient, input: CastingSubmissionInput): Promise<CastingSubmissionResult> {

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: ERROR_MESSAGES.not_authenticated };
  }

  const params: Record<string, string | string[] | Record<string, string>> = {
    p_role_id: input.roleId,
    p_application_source: "native",
    p_talent_id: user.id,
  };

  const trimmedNote = input.note?.trim();
  if (trimmedNote) {
    params.p_note = trimmedNote;
  }

  const answers = Object.fromEntries(
    Object.entries(input.supplementalAnswers ?? {})
      .map(([key, value]) => [key, value.trim()] as const)
      .filter(([, value]) => value),
  );
  if (Object.keys(answers).length) {
    params.p_supplemental_answers = answers;
  }
  if (input.slateUrl?.trim()) {
    params.p_slate_url = input.slateUrl.trim();
    params.p_slate_source = "link";
  }
  if (input.submissionLinks?.length) params.p_submission_links = input.submissionLinks;

  const { data, error } = await supabase.rpc("create_casting_submission", params);

  if (error) {
    return { ok: false, message: error.message || "Could not submit. Please try again." };
  }

  const result = (data ?? {}) as CreateCastingSubmissionRpcResult;
  if (!result.ok) {
    // A lost success response must not force a second submission or discard a
    // saved draft. Confirm the existing row belongs to this exact actor/role.
    if (result.code === "duplicate_submission") {
      const existing = await supabase.from("submissions").select("id").eq("role_id", input.roleId).eq("talent_id", user.id).maybeSingle();
      if (!existing.error && existing.data?.id) return { ok: true, submissionId: existing.data.id };
    }
    return {
      ok: false,
      message: mapSubmissionError(result),
      code: result.code,
      upgrade: Boolean(result.code && UPGRADE_CODES.has(result.code)),
    };
  }

  return { ok: true, submissionId: result.submission_id };
}
