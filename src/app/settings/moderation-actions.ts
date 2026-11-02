"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { contentReportSchema, type ContentReportInput } from "@/lib/settings/content-report";

export type BlockedUser = { user_id: string; display_name: string; avatar_url: string | null };
export type BlockedUsersResult = { ok: true; users: BlockedUser[] } | { ok: false; error: string };

export async function loadBlockedUsers(): Promise<BlockedUsersResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Blocked users are temporarily unavailable." };
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, error: "Sign in again to manage blocked users." };
  const { data, error } = await supabase.rpc("list_blocked_users");
  if (error) return { ok: false, error: "Couldn’t load blocked users. Please try again." };
  return { ok: true, users: (data ?? []) as BlockedUser[] };
}

export async function unblockUser(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return { ok: false, error: "Choose a blocked user to unblock." };
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Blocked users are temporarily unavailable." };
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, error: "Sign in again to manage blocked users." };
  const { error } = await supabase.rpc("unblock_user", { p_user_id: userId });
  if (error) return { ok: false, error: "Couldn’t unblock this person. Please try again." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function blockUser(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return { ok: false, error: "Choose a person to block." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Blocking is temporarily unavailable." };
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, error: "Sign in again to block this person." };
  if (user.id === userId) return { ok: false, error: "You can’t block your own account." };
  const { error } = await supabase.rpc("block_user", { p_user_id: userId });
  if (error) return { ok: false, error: "Couldn’t block this person. Please try again." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function reportContent(input: ContentReportInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = contentReportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your report." };
  const db = await createServerSupabaseClient();
  if (!db) return { ok: false, error: "Reporting is temporarily unavailable." };
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to report content." };
  if (user.id === parsed.data.reportedUserId) return { ok: false, error: "Choose another person’s profile or content to report." };
  const { contentType, contentId, reportedUserId, reason, details } = parsed.data;
  const { error } = await db.rpc("report_content", { p_content_type: contentType, p_content_id: contentId, p_reported_user_id: reportedUserId, p_reason: reason, p_details: details || null });
  if (error) return { ok: false, error: "Couldn’t send this report. Please try again." };
  return { ok: true };
}
