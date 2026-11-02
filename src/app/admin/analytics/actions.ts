"use server";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadDashboard } from "@/lib/admin-dashboard/load";
import { goalLabels, metricValues } from "@/lib/admin-dashboard/model";
export async function saveLaunchGoal(form: FormData) {
  await requirePlatformAdmin();
  const metric = String(form.get("metric") ?? "");
  const target = Number(form.get("target"));
  const owner = String(form.get("owner") ?? "").trim();
  const deadline = String(form.get("deadline") ?? "");
  const version = Number(form.get("version"));
  if (
    !(metric in goalLabels) ||
    !Number.isFinite(target) ||
    target < 0 ||
    !owner ||
    owner.length > 200 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(deadline) ||
    !Number.isInteger(version)
  )
    return { error: "Enter a valid target, owner and deadline." };
  const db = await createServerSupabaseClient();
  if (!db) return { error: "Data connection is unavailable." };
  const data = await loadDashboard();
  const current = metricValues(data.sources, new Date(data.fetchedAt))[metric];
  const { error } = await db.rpc("admin_save_launch_goal", {
    p_metric: metric,
    p_target: target,
    p_owner: owner,
    p_deadline: deadline,
    p_version: version,
    p_current: current,
  });
  if (error)
    return {
      error:
        error.code === "PT409"
          ? "Another admin changed this goal. Refresh before saving."
          : "Goal could not be saved. Check migration availability and try again.",
    };
  revalidatePath("/admin/analytics");
  return { error: null };
}
export async function reviewTalent(
  userId: string,
  requestId: string,
  action: string,
  feedback: string,
) {
  await requirePlatformAdmin();
  if (
    !["approve", "decline"].includes(action) ||
    (action === "decline" && !feedback.trim()) ||
    feedback.length > 3000
  )
    return { error: "Add feedback before declining." };
  const db = await createServerSupabaseClient();
  if (!db) return { error: "Review connection is unavailable." };
  const { data, error } = await db.rpc("admin_review_profile_request", {
    p_user_id: userId,
    p_request_id: requestId,
    p_action: action,
    p_feedback: feedback.trim() || null,
  });
  if (error || data?.ok !== true)
    return {
      error:
        error?.code === "PT409"
          ? "This review changed or is no longer pending. Refresh before trying again."
          : "Review unavailable. Check the review migration and retry.",
    };
  revalidatePath("/admin/analytics");
  return { error: null };
}
export async function setAnalyticsExclusion(form: FormData) {
  await requirePlatformAdmin();
  const userId = String(form.get("userId") ?? "");
  const reason = String(form.get("reason") ?? "").trim();
  const excluded = form.get("excluded") === "true";
  if (
    !/^[0-9a-f-]{36}$/i.test(userId) ||
    (excluded && (!reason || reason.length > 500))
  )
    return { error: "Enter an account UUID and a reason." };
  const db = await createServerSupabaseClient();
  if (!db) return { error: "Data connection is unavailable." };
  const { error } = await db.rpc("admin_set_analytics_exclusion", {
    p_user_id: userId,
    p_reason: reason,
    p_excluded: excluded,
  });
  if (error)
    return {
      error: "Could not update exclusion. Check the account and migration.",
    };
  revalidatePath("/admin/analytics");
  return { error: null };
}
