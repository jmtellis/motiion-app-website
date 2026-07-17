"use server";

import { revalidatePath } from "next/cache";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PROJECT_ROSTER_KIND = "project_roster";
const PROJECT_ROSTER_NAME = "Project Roster";

export type ProjectRosterMember = {
  id: string;
  profileId: string;
  name: string;
  slug: string | null;
  avatarUrl: string | null;
  notes: string | null;
  addedAt: string;
};

async function getOrCreateProjectRosterList(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  ownerId: string,
  projectId: string,
): Promise<{ listId: string } | { error: string }> {
  const { data: existing } = await supabase
    .from("talent_lists")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("project_id", projectId)
    .eq("kind", PROJECT_ROSTER_KIND)
    .maybeSingle<{ id: string }>();

  if (existing?.id) return { listId: existing.id };

  const { data: created, error } = await supabase
    .from("talent_lists")
    .insert({
      owner_id: ownerId,
      project_id: projectId,
      name: PROJECT_ROSTER_NAME,
      kind: PROJECT_ROSTER_KIND,
    })
    .select("id")
    .single();

  if (error || !created) return { error: error?.message ?? "Could not create project roster." };
  return { listId: created.id as string };
}

export async function listProjectRosterMembers(projectId: string): Promise<{
  listId: string | null;
  members: ProjectRosterMember[];
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { listId: null, members: [], error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { listId: null, members: [], error: "You must be signed in." };

  const { data: list } = await supabase
    .from("talent_lists")
    .select("id")
    .eq("owner_id", user.id)
    .eq("project_id", projectId)
    .eq("kind", PROJECT_ROSTER_KIND)
    .maybeSingle<{ id: string }>();

  if (!list) return { listId: null, members: [] };

  const { data: rows, error } = await supabase
    .from("talent_list_members")
    .select("id, profile_id, notes, added_at, professional_profiles(slug, location_city, media_assets(url, kind, position))")
    .eq("list_id", list.id)
    .order("added_at", { ascending: false });

  if (error) return { listId: list.id, members: [], error: error.message };

  const admin = createAdminSupabaseClient();

  const members: ProjectRosterMember[] = (rows ?? []).map((row) => {
    const profile = Array.isArray(row.professional_profiles)
      ? row.professional_profiles[0]
      : row.professional_profiles;
    const media = profile && typeof profile === "object"
      ? ((profile as { media_assets?: { url: string; kind: string; position: number }[] }).media_assets ?? [])
      : [];
    const headshot = media.find((asset) => asset.kind === "headshot") ?? media[0];

    return {
      id: row.id as string,
      profileId: row.profile_id as string,
      name: (profile as { slug?: string } | null)?.slug?.replace(/-/g, " ") ?? "Talent",
      slug: (profile as { slug?: string } | null)?.slug ?? null,
      avatarUrl: headshot?.url ?? null,
      notes: (row.notes as string | null) ?? null,
      addedAt: row.added_at as string,
    };
  });

  if (admin && members.length) {
    const profileIds = members.map((member) => member.profileId);
    const { data: profiles } = await admin
      .from("professional_profiles")
      .select("id, user_id")
      .in("id", profileIds);

    const userIds = (profiles ?? []).map((profile) => profile.user_id as string);
    if (userIds.length) {
      const { data: names } = await admin
        .from("profiles")
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", userIds);

      const nameByUserId = new Map(
        (names ?? []).map((profile) => [
          profile.user_id as string,
          (profile.display_name as string | null) ||
            [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
            "Talent",
        ]),
      );

      const userIdByProfileId = new Map(
        (profiles ?? []).map((profile) => [profile.id as string, profile.user_id as string]),
      );

      for (const member of members) {
        const userId = userIdByProfileId.get(member.profileId);
        if (userId) {
          const name = nameByUserId.get(userId);
          if (name) member.name = name;
        }
      }
    }
  }

  return { listId: list.id, members };
}

export async function addToProjectRoster(input: {
  projectId: string;
  profileId: string;
  notes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const roster = await getOrCreateProjectRosterList(supabase, user.id, input.projectId);
  if ("error" in roster) return { ok: false, error: roster.error };

  const { error } = await supabase.from("talent_list_members").upsert(
    {
      list_id: roster.listId,
      profile_id: input.profileId,
      notes: input.notes?.trim() || null,
    },
    { onConflict: "list_id,profile_id" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath("/library");
  return { ok: true };
}

export async function removeFromProjectRoster(
  projectId: string,
  memberId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { data: list } = await supabase
    .from("talent_lists")
    .select("id")
    .eq("owner_id", user.id)
    .eq("project_id", projectId)
    .eq("kind", PROJECT_ROSTER_KIND)
    .maybeSingle<{ id: string }>();

  if (!list) return { ok: false, error: "Project roster not found." };

  const { error } = await supabase
    .from("talent_list_members")
    .delete()
    .eq("id", memberId)
    .eq("list_id", list.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/library");
  return { ok: true };
}

/** Resolve submission talent to professional_profiles id and add to project roster. */
export async function addSubmissionToProjectRoster(
  projectId: string,
  submissionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, talent_id, email")
    .eq("id", submissionId)
    .maybeSingle<{ id: string; talent_id: string | null; email: string | null }>();

  if (!submission) return { ok: false, error: "Submission not found." };

  let profileId: string | null = null;

  if (submission.talent_id) {
    const { data: profile } = await supabase
      .from("professional_profiles")
      .select("id")
      .eq("user_id", submission.talent_id)
      .maybeSingle<{ id: string }>();
    profileId = profile?.id ?? null;
  }

  if (!profileId && submission.email) {
    const admin = createAdminSupabaseClient();
    if (admin) {
      const { data: userProfile } = await admin
        .from("profiles")
        .select("user_id")
        .ilike("email", submission.email)
        .maybeSingle<{ user_id: string }>();
      if (userProfile?.user_id) {
        const { data: pro } = await supabase
          .from("professional_profiles")
          .select("id")
          .eq("user_id", userProfile.user_id)
          .maybeSingle<{ id: string }>();
        profileId = pro?.id ?? null;
      }
    }
  }

  if (!profileId) {
    return { ok: false, error: "Could not match this applicant to a roster profile." };
  }

  return addToProjectRoster({ projectId, profileId });
}
