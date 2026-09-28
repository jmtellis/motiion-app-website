"use server";

import { revalidatePath } from "next/cache";

import { fetchSignedInCasting } from "@/lib/app/talent-casting-detail";
import { resolveTalentCastingOutcome, submissionIsClosed, type TalentCastingOutcome } from "@/lib/app/talent-casting-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicCasting } from "@/types/public";

export type CastingQuestion = {
  id: string;
  prompt: string;
  required: boolean;
};

export type TalentRoleSubmission = {
  id: string;
  submittedAt: string | null;
  outcome: TalentCastingOutcome;
  closed: boolean;
};

export type TalentCastingDetail = {
  casting: PublicCasting;
  questions: CastingQuestion[];
  submissionsByRoleId: Record<string, TalentRoleSubmission>;
  inviteByRoleId: Record<string, string>;
  passedRoleIds: string[];
  hasAgency: boolean;
  deadlinePassed: boolean;
  agencyRequiredByRoleId: Record<string, boolean>;
  submitterPolicy: string | null;
  visibilityPresentation: string | null;
};

export async function loadTalentCastingDetail(
  roleId: string,
): Promise<{ detail: TalentCastingDetail | null; error: string | null }> {
  const trimmed = roleId.trim();
  if (!trimmed) return { detail: null, error: "Casting not found." };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { detail: null, error: "Casting details are unavailable right now." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { detail: null, error: "Sign in to view this casting." };

  const loaded = await fetchSignedInCasting(trimmed);
  if (!loaded) return { detail: null, error: "This casting is no longer available." };
  const { casting, configuration } = loaded;

  const ids = loaded.roles.map((role) => role.id);
  const roleRecords = new Map(loaded.roles.map((role) => [role.id, role]));

  const [submissions, invites, passes, profile] = await Promise.all([
    supabase
      .from("submissions")
      .select("id, role_id, submitted_at")
      .eq("talent_id", user.id)
      .in("role_id", ids),
    supabase
      .from("role_access")
      .select("id, role_id")
      .eq("talent_id", user.id)
      .eq("status", "pending")
      .in("role_id", ids),
    supabase.from("casting_role_passes").select("role_id").eq("talent_id", user.id).in("role_id", ids),
    supabase.from("profiles").select("representation, agent").eq("user_id", user.id).maybeSingle(),
  ]);

  const submissionsByRoleId: Record<string, TalentRoleSubmission> = {};
  const now = Date.now();
  const deadlinePassed = Boolean(casting.deadline) && new Date(casting.deadline ?? "").getTime() < now;
  for (const row of submissions.data ?? []) {
    const record = asRecord(row);
    const id = text(record?.id);
    const submissionRoleId = text(record?.role_id);
    if (!record || !id || !submissionRoleId) continue;
    const role = roleRecords.get(submissionRoleId);
    const finalized = role?.isCastingFinalized === true || casting.roles.find((item) => item.id === submissionRoleId)?.isCastingFinalized === true;
    const active = role ? role.isActive : casting.roles.find((item) => item.id === submissionRoleId)?.isActive !== false;
    submissionsByRoleId[submissionRoleId] = {
      id,
      submittedAt: text(record.submitted_at),
      outcome: resolveTalentCastingOutcome({
        isCastingFinalized: finalized,
        isActive: active,
        deadlinePassed,
        submissionId: id,
        finalSelectIds: role?.finalSelectIds ?? [],
      }),
      closed: submissionIsClosed(finalized),
    };
  }

  const inviteByRoleId: Record<string, string> = {};
  for (const row of invites.data ?? []) {
    const id = text(asRecord(row)?.id);
    const invitedRoleId = text(asRecord(row)?.role_id);
    if (id && invitedRoleId) inviteByRoleId[invitedRoleId] = id;
  }

  const agencyRequiredByRoleId: Record<string, boolean> = {};
  for (const role of loaded.roles) {
    agencyRequiredByRoleId[role.id] = role.agencyRequired;
  }

  const representation = text(asRecord(profile.data)?.representation);
  const agent = text(asRecord(profile.data)?.agent);

  return {
    detail: {
      casting,
      questions: questionsFrom(configuration),
      submissionsByRoleId,
      inviteByRoleId,
      passedRoleIds: (passes.data ?? []).flatMap((row) => {
        const id = text(asRecord(row)?.role_id);
        return id ? [id] : [];
      }),
      hasAgency: Boolean(representation || agent),
      deadlinePassed,
      agencyRequiredByRoleId,
      submitterPolicy: text(configuration?.submitter_policy_raw),
      visibilityPresentation: text(configuration?.visibility_presentation_raw),
    },
    error: null,
  };
}

export async function respondToCastingRequest(
  sourceId: string,
  action: "primary" | "negative",
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Could not update this invitation." };

  const { error } = await supabase.rpc("respond_to_request", {
    p_request_kind: "casting",
    p_source_id: sourceId,
    p_action: action,
  });
  if (error) return { ok: false, error: error.message || "Could not update this invitation." };

  revalidatePath("/opportunities");
  revalidatePath("/home");
  return { ok: true };
}

export async function passCastingRole(roleId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Could not pass on this casting." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const { error } = await supabase.from("casting_role_passes").upsert(
    { talent_id: user.id, role_id: roleId },
    { onConflict: "talent_id,role_id" },
  );
  if (error) return { ok: false, error: "Could not pass on this casting." };

  revalidatePath("/opportunities");
  revalidatePath("/home");
  return { ok: true };
}

function questionsFrom(configuration: Record<string, unknown> | null): CastingQuestion[] {
  const raw = configuration?.additional_submission_questions;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item, index) => {
    const record = asRecord(item);
    const prompt = text(record?.prompt);
    if (!prompt) return [];
    return [{
      id: text(record?.id_key) ?? `question-${index}`,
      prompt,
      required: record?.requires_answer === true,
    }];
  });
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
