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
  /** Motiion Talent Card summary (identity, credits, verification). */
  card?: ProjectRosterTalentCard;
};

export type ProjectRosterTalentCard = {
  userId: string | null;
  isVerified: boolean;
  locationCity: string | null;
  subtype: string | null;
  creditCount: number;
  topCredits: string[];
};

type RosterProfileJoin = {
  slug?: string | null;
  location_city?: string | null;
  is_verified?: boolean | null;
  subtype?: string | null;
  user_id?: string | null;
  media_assets?: { url: string; kind: string; position: number }[];
};

const TOP_CREDITS_PER_MEMBER = 2;

async function loadRosterCredits(
  admin: NonNullable<ReturnType<typeof createAdminSupabaseClient>>,
  userIds: string[],
): Promise<Map<string, { count: number; top: string[] }>> {
  const byUser = new Map<string, { count: number; top: string[] }>();
  if (!userIds.length) return byUser;

  const { data } = await admin
    .from("talent_credits")
    .select(
      "talent_id, role, production_name_fallback, credit_year, production:industry_entities!talent_credits_production_entity_id_fkey(canonical_name), artist:industry_entities!talent_credits_artist_entity_id_fkey(canonical_name)",
    )
    .in("talent_id", userIds)
    .eq("is_public", true)
    .neq("verification_status", "ai_extracted")
    .order("credit_year", { ascending: false, nullsFirst: false });

  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const talentId = row.talent_id as string;
    const entry = byUser.get(talentId) ?? { count: 0, top: [] };
    entry.count += 1;
    if (entry.top.length < TOP_CREDITS_PER_MEMBER) {
      const entityName = (value: unknown) => {
        const entity = Array.isArray(value) ? value[0] : value;
        return entity && typeof entity === "object"
          ? ((entity as { canonical_name?: string | null }).canonical_name ?? null)
          : null;
      };
      const label =
        entityName(row.production) ??
        entityName(row.artist) ??
        (row.production_name_fallback as string | null) ??
        null;
      if (label) entry.top.push(label);
    }
    byUser.set(talentId, entry);
  }
  return byUser;
}

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
    .select(
      "id, profile_id, notes, added_at, professional_profiles(slug, location_city, is_verified, subtype, user_id, media_assets(url, kind, position))",
    )
    .eq("list_id", list.id)
    .order("added_at", { ascending: false });

  if (error) return { listId: list.id, members: [], error: error.message };

  const admin = createAdminSupabaseClient();

  const members: ProjectRosterMember[] = (rows ?? []).map((row) => {
    const joined = Array.isArray(row.professional_profiles)
      ? row.professional_profiles[0]
      : row.professional_profiles;
    const profile = joined && typeof joined === "object" ? (joined as RosterProfileJoin) : null;
    const media = profile?.media_assets ?? [];
    const headshot = media.find((asset) => asset.kind === "headshot") ?? media[0];

    return {
      id: row.id as string,
      profileId: row.profile_id as string,
      name: profile?.slug?.replace(/-/g, " ") ?? "Talent",
      slug: profile?.slug ?? null,
      avatarUrl: headshot?.url ?? null,
      notes: (row.notes as string | null) ?? null,
      addedAt: row.added_at as string,
      card: {
        userId: profile?.user_id ?? null,
        isVerified: profile?.is_verified === true,
        locationCity: profile?.location_city ?? null,
        subtype: profile?.subtype ?? null,
        creditCount: 0,
        topCredits: [],
      },
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
      const [{ data: names }, creditsByUser] = await Promise.all([
        admin
          .from("profiles")
          .select("user_id, display_name, first_name, last_name, headshot_urls")
          .in("user_id", userIds),
        loadRosterCredits(admin, userIds),
      ]);

      const accountByUserId = new Map(
        (names ?? []).map((profile) => [profile.user_id as string, profile]),
      );

      const userIdByProfileId = new Map(
        (profiles ?? []).map((profile) => [profile.id as string, profile.user_id as string]),
      );

      for (const member of members) {
        const userId = userIdByProfileId.get(member.profileId);
        if (!userId) continue;
        const account = accountByUserId.get(userId);
        if (account) {
          const name =
            (account.display_name as string | null) ||
            [account.first_name, account.last_name].filter(Boolean).join(" ");
          if (name) member.name = name;
          if (!member.avatarUrl && Array.isArray(account.headshot_urls)) {
            const headshot = (account.headshot_urls as unknown[]).find(
              (url): url is string => typeof url === "string" && url.length > 0,
            );
            if (headshot) member.avatarUrl = headshot;
          }
        }
        const credits = creditsByUser.get(userId);
        if (member.card) {
          member.card.userId = userId;
          member.card.creditCount = credits?.count ?? 0;
          member.card.topCredits = credits?.top ?? [];
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

/** Copy every member of one of the owner's library collections into the project roster. */
export async function importCollectionToProjectRoster(input: {
  projectId: string;
  collectionId: string;
}): Promise<{ ok: boolean; added?: number; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { data: collection } = await supabase
    .from("talent_lists")
    .select("id")
    .eq("id", input.collectionId)
    .eq("owner_id", user.id)
    .maybeSingle<{ id: string }>();
  if (!collection) return { ok: false, error: "Collection not found." };

  const { data: members, error: membersError } = await supabase
    .from("talent_list_members")
    .select("profile_id")
    .eq("list_id", collection.id);
  if (membersError) return { ok: false, error: membersError.message };

  const profileIds = [...new Set((members ?? []).map((row) => row.profile_id as string))];
  if (!profileIds.length) return { ok: true, added: 0 };

  const roster = await getOrCreateProjectRosterList(supabase, user.id, input.projectId);
  if ("error" in roster) return { ok: false, error: roster.error };

  const { error } = await supabase.from("talent_list_members").upsert(
    profileIds.map((profileId) => ({ list_id: roster.listId, profile_id: profileId })),
    { onConflict: "list_id,profile_id", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${input.projectId}`, "layout");
  revalidatePath("/library");
  return { ok: true, added: profileIds.length };
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
