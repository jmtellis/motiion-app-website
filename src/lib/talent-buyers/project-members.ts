"use server";

import { revalidatePath } from "next/cache";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ProjectMemberRow = {
  id: string;
  userId: string;
  role: string;
  displayName: string;
  email: string | null;
};

export async function listProjectMembers(projectId: string): Promise<{
  members: ProjectMemberRow[];
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { members: [], error: "Supabase is not configured." };

  const { data, error } = await supabase
    .from("project_members")
    .select("id, user_id, role")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return { members: [], error: error.message };

  const profileClient = createAdminSupabaseClient() ?? supabase;
  const userIds = [...new Set((data ?? []).map((row) => row.user_id as string))];
  const { data: profiles, error: profileError } = userIds.length
    ? await profileClient.from("profiles").select("user_id, display_name, first_name, last_name, email").in("user_id", userIds)
    : { data: [], error: null };
  const byUser = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  const members: ProjectMemberRow[] = (data ?? []).map((row) => {
    const profile = byUser.get(row.user_id);
    return {
      id: row.id as string, userId: row.user_id as string, role: row.role as string,
      displayName: profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Collaborator",
      email: profile?.email ?? null,
    };
  });
  if (profileError) return { members, error: "Some collaborator details could not be loaded. Please refresh to try again." };

  return { members };
}

export async function addProjectMemberByEmail(input: {
  projectId: string;
  email: string;
  role?: "collaborator" | "viewer";
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  const { data: canManage, error: accessError } = await supabase.rpc("is_project_operator", { p_project_id: input.projectId, p_user_id: user.id });
  if (accessError || !canManage) return { ok: false, error: "Only the project owner or an approved admin can manage collaborators." };


  const admin = createAdminSupabaseClient();
  if (!admin) return { ok: false, error: "Admin client not configured." };

  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, error: "Enter an email address." };

  const { data: profile } = await admin
    .from("profiles")
    .select("user_id")
    .ilike("email", email)
    .maybeSingle<{ user_id: string }>();

  if (!profile?.user_id) {
    return { ok: false, error: "No Motiion account found for that email." };
  }

  if (profile.user_id === user.id) {
    return { ok: false, error: "You are already the project owner." };
  }

  const { error } = await supabase.from("project_members").upsert(
    {
      project_id: input.projectId,
      user_id: profile.user_id,
      role: input.role ?? "collaborator",
    },
    { onConflict: "project_id,user_id" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

export async function removeProjectMember(memberId: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  const { data: canManage, error: accessError } = await supabase.rpc("is_project_operator", { p_project_id: projectId, p_user_id: user.id });
  if (accessError || !canManage) return { ok: false, error: "Only the project owner or an approved admin can manage collaborators." };
  const { error } = await supabase.from("project_members").delete().eq("id", memberId).eq("project_id", projectId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
