"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CreateProductionJobInput = {
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  talentListId?: string | null;
};

export async function createProductionJobAction(input: CreateProductionJobInput) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false as const, error: "not_authenticated" };
  }

  const title = input.title.trim();
  if (!title) {
    return { ok: false as const, error: "title_required" };
  }

  const { data, error } = await supabase.rpc("create_production_job", {
    p_title: title,
    p_start_date: input.startDate || null,
    p_end_date: input.endDate || null,
    p_choreographer_ids: [],
    p_assistant_ids: [],
    p_talent_list_id: input.talentListId || null,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  const result = data as {
    ok?: boolean;
    error?: string;
    job_id?: string;
    token?: string;
    url?: string;
  } | null;

  if (!result?.ok || !result.job_id) {
    return { ok: false as const, error: result?.error ?? "create_failed" };
  }

  revalidatePath("/projects");
  redirect(`/jobs/${result.job_id}`);
}

export async function createJobJoinTokenAction(jobId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false as const, error: "not_authenticated" };

  const { data, error } = await supabase.rpc("create_job_join_token", {
    p_job_id: jobId,
  });
  if (error) return { ok: false as const, error: error.message };

  const result = data as { ok?: boolean; error?: string; token?: string; url?: string } | null;
  if (!result?.ok) return { ok: false as const, error: result?.error ?? "token_failed" };
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const, token: result.token, url: result.url };
}

export async function completeProductionJobAction(jobId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false as const, error: "not_authenticated" };

  const { data, error } = await supabase.rpc("complete_production_job", {
    p_job_id: jobId,
  });
  if (error) return { ok: false as const, error: error.message };

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) return { ok: false as const, error: result?.error ?? "complete_failed" };
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/projects");
  return { ok: true as const };
}

export async function respondToJobResumeCreditAction(
  jobId: string,
  status: "accepted" | "edited" | "hidden",
) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false as const, error: "not_authenticated" };

  const { data, error } = await supabase.rpc("respond_to_job_resume_credit", {
    p_job_id: jobId,
    p_status: status,
  });
  if (error) return { ok: false as const, error: error.message };

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) return { ok: false as const, error: result?.error ?? "respond_failed" };
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true as const };
}
