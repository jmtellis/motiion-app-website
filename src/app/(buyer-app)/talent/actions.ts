"use server";

import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { sendNotificationEmail } from "@/lib/email/send";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildNavigatorInitialData } from "@/lib/talent-navigator/profile-adapter";
import { navigatorFiltersToSearchFilters } from "@/lib/talent-navigator/search-filters";
import type { TalentNavigatorFilters, TalentNavigatorInitialData } from "@/lib/talent-navigator/types";
import { searchTalentProfiles } from "@/lib/search/search-profiles";

export async function fetchNavigatorTalent(
  filters: TalentNavigatorFilters,
): Promise<TalentNavigatorInitialData> {
  const result = await searchTalentProfiles(navigatorFiltersToSearchFilters(filters));
  return buildNavigatorInitialData(result, filters);
}

const DEFAULT_ROSTER_NAME = "Saved Talent";

/** Resolve a navigator Talent (user id or slug) to a professional_profiles row id. */
async function resolveProfessionalProfileId(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  talentIdOrSlug: string,
): Promise<string | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(talentIdOrSlug);

  if (isUuid) {
    const { data } = await supabase
      .from("professional_profiles")
      .select("id")
      .or(`user_id.eq.${talentIdOrSlug},id.eq.${talentIdOrSlug}`)
      .maybeSingle<{ id: string }>();
    if (data) return data.id;
  }

  const { data: bySlug } = await supabase
    .from("professional_profiles")
    .select("id")
    .eq("slug", talentIdOrSlug)
    .maybeSingle<{ id: string }>();

  return bySlug?.id ?? null;
}

export async function saveTalentForBuyer(
  talentIdOrSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const profileId = await resolveProfessionalProfileId(supabase, talentIdOrSlug);
  if (!profileId) {
    return { ok: false, error: "This profile isn't available for rosters yet." };
  }

  const { data: existing } = await supabase
    .from("talent_lists")
    .select("id")
    .eq("owner_id", user.id)
    .eq("name", DEFAULT_ROSTER_NAME)
    .maybeSingle<{ id: string }>();

  let listId = existing?.id;
  if (!listId) {
    const { data: created, error: createError } = await supabase
      .from("talent_lists")
      .insert({ owner_id: user.id, name: DEFAULT_ROSTER_NAME, kind: "favorites" })
      .select("id")
      .single();
    if (createError) return { ok: false, error: createError.message };
    listId = created.id;
  }

  const { error: memberError } = await supabase
    .from("talent_list_members")
    .upsert({ list_id: listId, profile_id: profileId }, { onConflict: "list_id,profile_id", ignoreDuplicates: true });

  if (memberError) return { ok: false, error: memberError.message };

  await trackServerEvent("talent_saved_to_list", { list_id: listId, profile_id: profileId });
  revalidatePath("/library");
  return { ok: true };
}

export type CastingInviteTarget = {
  projectId: string;
  castingId: string | null;
  title: string;
};

export async function listBuyerCastingTargets(): Promise<{
  targets: CastingInviteTarget[];
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { targets: [], error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { targets: [], error: "You must be signed in." };

  const { data: projects, error: projectError } = await supabase
    .from("projects")
    .select("id, title")
    .eq("poster_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (projectError) return { targets: [], error: projectError.message };
  if (!projects?.length) return { targets: [] };

  const projectIds = projects.map((project) => project.id);
  const { data: castings } = await supabase
    .from("castings")
    .select("id, title, project_id")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  const titleByProject = new Map(projects.map((project) => [project.id, project.title ?? "Untitled project"]));
  const targets: CastingInviteTarget[] = [];
  const projectsWithCastings = new Set<string>();

  for (const casting of castings ?? []) {
    projectsWithCastings.add(casting.project_id);
    targets.push({
      projectId: casting.project_id,
      castingId: casting.id,
      title: casting.title || titleByProject.get(casting.project_id) || "Casting",
    });
  }

  for (const project of projects) {
    if (!projectsWithCastings.has(project.id)) {
      targets.push({ projectId: project.id, castingId: null, title: project.title ?? "Untitled project" });
    }
  }

  return { targets };
}

export async function inviteTalentFromNavigator(
  talentIdOrSlug: string,
  target: { projectId: string; castingId: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const profileId = await resolveProfessionalProfileId(supabase, talentIdOrSlug);
  if (!profileId) {
    return { ok: false, error: "This profile isn't available for invitations yet." };
  }

  const { error } = await supabase.from("invitations").insert({
    project_id: target.projectId,
    casting_id: target.castingId,
    invited_profile_id: profileId,
    invited_by: user.id,
    kind: "casting",
    status: "sent",
  });

  if (error) {
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: error.message };
  }

  await trackServerEvent("booking_request_sent", {
    project_id: target.projectId,
    casting_id: target.castingId,
    profile_id: profileId,
  });

  await emailInvitedTalent(profileId);

  revalidatePath("/projects");
  return { ok: true };
}

/** Best-effort email to the invited talent; in-app notification is the primary channel. */
async function emailInvitedTalent(profileId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  if (!admin) return;

  const { data: pro } = await admin
    .from("professional_profiles")
    .select("user_id")
    .eq("id", profileId)
    .maybeSingle<{ user_id: string }>();
  if (!pro) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("email, display_name, first_name")
    .eq("user_id", pro.user_id)
    .maybeSingle<{ email: string | null; display_name: string | null; first_name: string | null }>();
  if (!profile?.email) return;

  const firstName = profile.first_name || profile.display_name || "there";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app";

  await sendNotificationEmail({
    to: profile.email,
    subject: "You've been invited to a casting on Motiion",
    html: `<p>Hi ${firstName},</p><p>A casting professional invited you to a project on Motiion. Sign in to review and respond.</p><p><a href="${siteUrl}/home">View your invitation</a></p>`,
  });
}
