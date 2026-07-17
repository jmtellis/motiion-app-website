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

  const admin = createAdminSupabaseClient();
  const members: ProjectMemberRow[] = [];

  for (const row of data ?? []) {
    let displayName = "Collaborator";
    let email: string | null = null;

    if (admin) {
      const { data: profile } = await admin
        .from("profiles")
        .select("display_name, first_name, last_name, email")
        .eq("user_id", row.user_id)
        .maybeSingle<{
          display_name: string | null;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        }>();
      if (profile) {
        email = profile.email;
        displayName =
          profile.display_name ||
          [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
          profile.email ||
          displayName;
      }
    }

    members.push({
      id: row.id as string,
      userId: row.user_id as string,
      role: row.role as string,
      displayName,
      email,
    });
  }

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

  const { error } = await supabase.from("project_members").delete().eq("id", memberId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
