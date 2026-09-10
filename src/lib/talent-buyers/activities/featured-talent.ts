import type { SupabaseClient } from "@supabase/supabase-js";

export type FeaturedTalentStatus = "pending" | "accepted" | "declined" | "removed";

export type FeaturedTalentPerson = {
  userId: string;
  displayName: string;
  headshotUrl: string | null;
  username: string | null;
};

export type FeaturedTalentRow = {
  id: string;
  activityId: string;
  talentUserId: string;
  parentId: string | null;
  invitedByUserId: string;
  status: FeaturedTalentStatus;
  videoUrl: string | null;
  sortOrder: number;
  person: FeaturedTalentPerson;
  children: FeaturedTalentRow[];
};

export type DraftFeaturedTalentInvite = {
  /** Client-local id for draft UI before persist. */
  localId: string;
  talentUserId: string;
  displayName: string;
  headshotUrl: string | null;
  /** null = level 1; otherwise localId of parent draft row. */
  parentLocalId: string | null;
};

function profileName(row: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
}): string {
  const display = row.display_name?.trim();
  if (display) return display;
  const combined = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  return row.username?.trim() || "Talent";
}

function headshot(urls: string[] | null | undefined): string | null {
  if (!Array.isArray(urls)) return null;
  return urls.find((url) => typeof url === "string" && url.trim())?.trim() ?? null;
}

type RawRow = {
  id: string;
  activity_id: string;
  talent_user_id: string;
  parent_id: string | null;
  invited_by_user_id: string;
  status: FeaturedTalentStatus;
  video_url: string | null;
  sort_order: number;
};

export function buildFeaturedTalentTree(
  rows: RawRow[],
  profilesByUserId: Map<string, FeaturedTalentPerson>,
): FeaturedTalentRow[] {
  const mapped = rows
    .filter((row) => row.status !== "removed" && row.status !== "declined")
    .map((row) => {
      const person = profilesByUserId.get(row.talent_user_id) ?? {
        userId: row.talent_user_id,
        displayName: "Talent",
        headshotUrl: null,
        username: null,
      };
      return {
        id: row.id,
        activityId: row.activity_id,
        talentUserId: row.talent_user_id,
        parentId: row.parent_id,
        invitedByUserId: row.invited_by_user_id,
        status: row.status,
        videoUrl: row.video_url,
        sortOrder: row.sort_order,
        person,
        children: [] as FeaturedTalentRow[],
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));

  const byId = new Map(mapped.map((row) => [row.id, row]));
  const roots: FeaturedTalentRow[] = [];
  for (const row of mapped) {
    if (row.parentId && byId.has(row.parentId)) {
      byId.get(row.parentId)!.children.push(row);
    } else if (!row.parentId) {
      roots.push(row);
    }
  }
  return roots;
}

export async function loadFeaturedTalentTree(
  supabase: SupabaseClient,
  activityId: string,
  options?: { acceptedOnly?: boolean },
): Promise<FeaturedTalentRow[]> {
  let query = supabase
    .from("activity_featured_talent")
    .select(
      "id,activity_id,talent_user_id,parent_id,invited_by_user_id,status,video_url,sort_order",
    )
    .eq("activity_id", activityId)
    .order("sort_order", { ascending: true });

  if (options?.acceptedOnly) {
    query = query.eq("status", "accepted");
  } else {
    query = query.in("status", ["pending", "accepted"]);
  }

  const { data, error } = await query;
  if (error || !data?.length) {
    if (error) console.error("[featured-talent] load", error.message);
    return [];
  }

  const rows = data as RawRow[];
  const userIds = [...new Set(rows.map((row) => row.talent_user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id,display_name,first_name,last_name,username,headshot_urls")
    .in("user_id", userIds);

  const profilesByUserId = new Map<string, FeaturedTalentPerson>();
  for (const profile of (profiles ?? []) as Record<string, unknown>[]) {
    const userId = String(profile.user_id);
    profilesByUserId.set(userId, {
      userId,
      displayName: profileName(
        profile as {
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          username?: string | null;
        },
      ),
      headshotUrl: headshot(profile.headshot_urls as string[] | null),
      username: typeof profile.username === "string" ? profile.username : null,
    });
  }

  return buildFeaturedTalentTree(rows, profilesByUserId);
}

export async function syncFeaturedTalentInvites(
  supabase: SupabaseClient,
  activityId: string,
  invites: DraftFeaturedTalentInvite[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!invites.length) return { ok: true };

  const level1 = invites.filter((invite) => !invite.parentLocalId);
  const localIdToPersisted = new Map<string, string>();

  for (const invite of level1) {
    const { data, error } = await supabase.rpc("invite_activity_featured_talent", {
      p_activity_id: activityId,
      p_talent_user_id: invite.talentUserId,
      p_parent_id: null,
    });
    if (error) {
      console.error("[featured-talent] invite L1", error.message);
      return { ok: false, error: "Could not invite featured talent." };
    }
    const payload = data as { ok?: boolean; id?: string; error?: string } | null;
    if (!payload?.ok || !payload.id) {
      return {
        ok: false,
        error:
          payload?.error === "talent_only"
            ? "Only talent profiles can be featured."
            : "Could not invite featured talent.",
      };
    }
    localIdToPersisted.set(invite.localId, payload.id);
  }

  const level2 = invites.filter((invite) => invite.parentLocalId);
  for (const invite of level2) {
    const parentId = invite.parentLocalId
      ? localIdToPersisted.get(invite.parentLocalId)
      : null;
    if (!parentId) {
      return { ok: false, error: "Could not nest featured talent under a parent." };
    }
    const { data, error } = await supabase.rpc("invite_activity_featured_talent", {
      p_activity_id: activityId,
      p_talent_user_id: invite.talentUserId,
      p_parent_id: parentId,
    });
    if (error) {
      console.error("[featured-talent] invite L2", error.message);
      return { ok: false, error: "Could not invite supporting talent." };
    }
    const payload = data as { ok?: boolean; error?: string } | null;
    if (!payload?.ok) {
      return {
        ok: false,
        error:
          payload?.error === "talent_only"
            ? "Only talent profiles can be featured."
            : "Could not invite supporting talent.",
      };
    }
  }

  return { ok: true };
}

export type PublicFeaturedTalentNode = {
  id: string;
  userId: string;
  displayName: string;
  headshotUrl: string | null;
  username: string | null;
  videoUrl: string | null;
  children: PublicFeaturedTalentNode[];
};

export function toPublicFeaturedTalentTree(tree: FeaturedTalentRow[]): PublicFeaturedTalentNode[] {
  return tree
    .filter((row) => row.status === "accepted")
    .map((row) => ({
      id: row.id,
      userId: row.talentUserId,
      displayName: row.person.displayName,
      headshotUrl: row.person.headshotUrl,
      username: row.person.username,
      videoUrl: row.videoUrl,
      children: row.children
        .filter((child) => child.status === "accepted")
        .map((child) => ({
          id: child.id,
          userId: child.talentUserId,
          displayName: child.person.displayName,
          headshotUrl: child.person.headshotUrl,
          username: child.person.username,
          videoUrl: null,
          children: [],
        })),
    }));
}
