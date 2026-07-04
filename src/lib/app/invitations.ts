"use server";

import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type InvitationRow = {
  id: string;
  projectId: string;
  castingId: string | null;
  kind: string;
  status: string;
  title: string;
  message: string | null;
  createdAt: string;
};

export async function listTalentInvitations(): Promise<{ invitations: InvitationRow[]; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { invitations: [], error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { invitations: [], error: "Not signed in" };

  const { data: pro } = await supabase
    .from("professional_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!pro) return { invitations: [], error: null };

  const { data, error } = await supabase
    .from("invitations")
    .select("id, project_id, casting_id, kind, status, message, created_at, projects ( title )")
    .eq("invited_profile_id", pro.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return { invitations: [], error: error.message };

  return {
    invitations: (data ?? []).map((row) => {
      const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
      return {
        id: row.id,
        projectId: row.project_id,
        castingId: row.casting_id,
        kind: row.kind,
        status: row.status,
        title: project && typeof project === "object" ? String((project as { title?: string }).title ?? "Invitation") : "Invitation",
        message: row.message,
        createdAt: row.created_at,
      };
    }),
    error: null,
  };
}

export type ProjectInvitationRow = {
  id: string;
  status: string;
  kind: string;
  createdAt: string;
  respondedAt: string | null;
  talentSlug: string | null;
  talentName: string;
};

/** Per-invitee status board for a project (buyer view). */
export async function listProjectInvitations(
  projectId: string,
): Promise<{ invitations: ProjectInvitationRow[]; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { invitations: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("invitations")
    .select("id, status, kind, created_at, responded_at, professional_profiles ( slug )")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { invitations: [], error: error.message };

  return {
    invitations: (data ?? []).map((row) => {
      const profile = Array.isArray(row.professional_profiles)
        ? row.professional_profiles[0]
        : row.professional_profiles;
      const slug =
        profile && typeof profile === "object" ? ((profile as { slug?: string }).slug ?? null) : null;
      return {
        id: row.id,
        status: row.status,
        kind: row.kind,
        createdAt: row.created_at,
        respondedAt: row.responded_at,
        talentSlug: slug,
        talentName: slug ? slug.replace(/-/g, " ") : "Talent",
      };
    }),
    error: null,
  };
}

export async function respondToInvitation(
  invitationId: string,
  status: "accepted" | "declined",
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { error } = await supabase
    .from("invitations")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", invitationId);

  if (error) return { ok: false, error: error.message };

  await trackServerEvent(status === "accepted" ? "invitation_accepted" : "invitation_declined", {
    invitation_id: invitationId,
  });

  revalidatePath("/home");
  revalidatePath("/inbox");
  return { ok: true };
}

export async function inviteTalentToCasting(input: {
  projectId: string;
  castingId: string;
  profileId: string;
  message?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("invitations").upsert(
    {
      project_id: input.projectId,
      casting_id: input.castingId,
      invited_profile_id: input.profileId,
      invited_by: user.id,
      kind: "casting",
      status: "sent",
      message: input.message ?? null,
    },
    { onConflict: "casting_id,invited_profile_id", ignoreDuplicates: true },
  );

  if (error) {
    // Fallback insert if unique constraint differs
    const { error: insertError } = await supabase.from("invitations").insert({
      project_id: input.projectId,
      casting_id: input.castingId,
      invited_profile_id: input.profileId,
      invited_by: user.id,
      kind: "casting",
      status: "sent",
      message: input.message ?? null,
    });
    if (insertError?.code === "23505") return { ok: true };
    if (insertError) return { ok: false, error: insertError.message };
  }

  await trackServerEvent("booking_request_sent", {
    project_id: input.projectId,
    casting_id: input.castingId,
    profile_id: input.profileId,
  });

  revalidatePath("/projects");
  return { ok: true };
}
