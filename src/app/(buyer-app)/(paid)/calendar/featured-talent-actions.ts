"use server";

import { revalidatePath } from "next/cache";

import {
  loadFeaturedTalentTree,
  type FeaturedTalentRow,
} from "@/lib/talent-buyers/activities/featured-talent";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DraftPersonRef } from "@/lib/talent-buyers/activities/types";

function revalidateActivity(activityId: string) {
  revalidatePath(`/calendar/${activityId}`);
  revalidatePath(`/event/${activityId}`);
  revalidatePath(`/activity/${activityId}`);
}

export async function searchFeaturedTalentPeople(
  query: string,
): Promise<{ ok: true; people: DraftPersonRef[] } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const q = query.trim();
  if (q.length < 2) return { ok: true, people: [] };

  const safe = q.replace(/[%_,.()\"]/g, "").slice(0, 64);
  if (safe.length < 2) return { ok: true, people: [] };
  const pattern = `%${safe}%`;
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id,display_name,first_name,last_name,username,headshot_urls,account_type")
    .neq("user_id", user.id)
    .or(
      `display_name.ilike."${pattern}",first_name.ilike."${pattern}",last_name.ilike."${pattern}",username.ilike."${pattern}"`,
    )
    .limit(20);

  if (error) {
    console.error("[featured-talent] people search", error.message);
    return { ok: false, error: "Could not search talent." };
  }

  const people = ((data ?? []) as Record<string, unknown>[])
    .filter((row) => {
      const account = String(row.account_type ?? "").toLowerCase();
      return account === "talent";
    })
    .slice(0, 12)
    .map((row) => {
      const display =
        (typeof row.display_name === "string" && row.display_name.trim()) ||
        [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
        (typeof row.username === "string" ? row.username : null) ||
        "Talent";
      const urls = row.headshot_urls as string[] | null;
      const headshotUrl =
        Array.isArray(urls) ? urls.find((url) => typeof url === "string" && url.trim())?.trim() ?? null : null;
      return {
        userId: String(row.user_id),
        displayName: display,
        headshotUrl,
      };
    });

  return { ok: true, people };
}

export async function getFeaturedTalentTreeAction(
  activityId: string,
): Promise<{ ok: true; tree: FeaturedTalentRow[] } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const tree = await loadFeaturedTalentTree(supabase, activityId);
  return { ok: true, tree };
}

export async function inviteFeaturedTalentAction(input: {
  activityId: string;
  talentUserId: string;
  parentId?: string | null;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const { data, error } = await supabase.rpc("invite_activity_featured_talent", {
    p_activity_id: input.activityId,
    p_talent_user_id: input.talentUserId,
    p_parent_id: input.parentId ?? null,
  });

  if (error) {
    console.error("[featured-talent] invite", error.message);
    return { ok: false, error: "Could not send invite." };
  }

  const payload = data as { ok?: boolean; id?: string; error?: string } | null;
  if (!payload?.ok) {
    const code = payload?.error;
    if (code === "talent_only") return { ok: false, error: "Only talent profiles can be featured." };
    if (code === "forbidden") return { ok: false, error: "You cannot invite talent here." };
    if (code === "cannot_invite_self") return { ok: false, error: "You cannot feature yourself." };
    return { ok: false, error: "Could not send invite." };
  }

  revalidateActivity(input.activityId);
  return { ok: true, id: payload.id };
}

export async function respondFeaturedTalentAction(input: {
  id: string;
  action: "accept" | "decline";
  activityId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const { data, error } = await supabase.rpc("respond_activity_featured_talent", {
    p_id: input.id,
    p_action: input.action,
  });

  if (error) {
    console.error("[featured-talent] respond", error.message);
    return { ok: false, error: "Could not update invite." };
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    return { ok: false, error: "Could not update invite." };
  }

  if (input.activityId) revalidateActivity(input.activityId);
  revalidatePath("/home");
  return { ok: true };
}

export async function removeFeaturedTalentAction(input: {
  id: string;
  activityId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const { data, error } = await supabase.rpc("remove_activity_featured_talent", {
    p_id: input.id,
  });

  if (error) {
    console.error("[featured-talent] remove", error.message);
    return { ok: false, error: "Could not remove featured talent." };
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    return { ok: false, error: "Could not remove featured talent." };
  }

  revalidateActivity(input.activityId);
  return { ok: true };
}

export async function setFeaturedTalentVideoAction(input: {
  id: string;
  activityId: string;
  videoUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const { data, error } = await supabase.rpc("set_activity_featured_talent_video", {
    p_id: input.id,
    p_video_url: input.videoUrl,
  });

  if (error) {
    console.error("[featured-talent] video", error.message);
    return { ok: false, error: "Could not save video link." };
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    return { ok: false, error: "Could not save video link." };
  }

  revalidateActivity(input.activityId);
  return { ok: true };
}

export type OffPlatformFeaturedInvite = {
  id: string;
  activityId: string;
  parentId: string | null;
  displayName: string;
  email: string | null;
  token: string;
  url: string;
  status: string;
};

export async function createOffPlatformFeaturedTalentInviteAction(input: {
  activityId: string;
  displayName: string;
  parentId?: string | null;
  email?: string | null;
}): Promise<
  | { ok: true; invite: OffPlatformFeaturedInvite }
  | { ok: false; error: string }
> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const name = input.displayName.trim();
  if (!name) return { ok: false, error: "Enter a name for the invite." };

  const { data, error } = await supabase.rpc("create_activity_featured_talent_invite", {
    p_activity_id: input.activityId,
    p_display_name: name,
    p_parent_id: input.parentId ?? null,
    p_email: input.email?.trim() || null,
  });

  if (error) {
    console.error("[featured-talent] off-platform invite", error.message);
    return { ok: false, error: "Could not create invite link." };
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    id?: string;
    token?: string;
    url?: string;
    display_name?: string;
    parent_id?: string | null;
    status?: string;
  } | null;

  if (!payload?.ok || !payload.id || !payload.token || !payload.url) {
    const code = payload?.error;
    if (code === "already_invited") {
      return { ok: false, error: "That person already has a pending invite." };
    }
    if (code === "forbidden") return { ok: false, error: "You cannot invite talent here." };
    if (code === "name_required") return { ok: false, error: "Enter a name for the invite." };
    return { ok: false, error: "Could not create invite link." };
  }

  revalidateActivity(input.activityId);
  return {
    ok: true,
    invite: {
      id: payload.id,
      activityId: input.activityId,
      parentId: payload.parent_id ?? input.parentId ?? null,
      displayName: payload.display_name ?? name,
      email: input.email?.trim() || null,
      token: payload.token,
      url: payload.url,
      status: payload.status ?? "pending",
    },
  };
}

export async function listOffPlatformFeaturedTalentInvitesAction(
  activityId: string,
): Promise<
  | { ok: true; invites: OffPlatformFeaturedInvite[] }
  | { ok: false; error: string }
> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const { data, error } = await supabase.rpc("list_activity_featured_talent_invites", {
    p_activity_id: activityId,
  });

  if (error) {
    console.error("[featured-talent] list off-platform", error.message);
    return { ok: false, error: "Could not load invites." };
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    invites?: Array<Record<string, unknown>>;
  } | null;

  if (!payload?.ok) {
    return { ok: false, error: "Could not load invites." };
  }

  const invites = (payload.invites ?? []).map((row) => ({
    id: String(row.id),
    activityId: String(row.activity_id ?? activityId),
    parentId: row.parent_id ? String(row.parent_id) : null,
    displayName: String(row.display_name ?? "Talent"),
    email: typeof row.email === "string" ? row.email : null,
    token: String(row.token ?? ""),
    url: String(row.url ?? `https://www.motiion.app/featured-invite/${row.token ?? ""}`),
    status: String(row.status ?? "pending"),
  }));

  return { ok: true, invites };
}

export async function revokeOffPlatformFeaturedTalentInviteAction(input: {
  id: string;
  activityId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const { data, error } = await supabase.rpc("revoke_activity_featured_talent_invite", {
    p_id: input.id,
  });

  if (error) {
    console.error("[featured-talent] revoke off-platform", error.message);
    return { ok: false, error: "Could not revoke invite." };
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    return { ok: false, error: "Could not revoke invite." };
  }

  revalidateActivity(input.activityId);
  return { ok: true };
}

export async function listMyFeaturedTalentInvitesAction(): Promise<
  | {
      ok: true;
      invites: {
        id: string;
        activityId: string;
        activityTitle: string;
        parentId: string | null;
        status: string;
        coverImageUrl: string | null;
      }[];
    }
  | { ok: false; error: string }
> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const { data, error } = await supabase
    .from("activity_featured_talent")
    .select(
      `
      id, activity_id, parent_id, status,
      activities!inner ( id, title, cover_image_url, status )
    `,
    )
    .eq("talent_user_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("[featured-talent] my invites", error.message);
    return { ok: false, error: "Could not load invites." };
  }

  const invites = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const activity = row.activities as {
      id?: string;
      title?: string;
      cover_image_url?: string | null;
    } | null;
    return {
      id: String(row.id),
      activityId: String(row.activity_id),
      activityTitle: activity?.title?.trim() || "Event",
      parentId: row.parent_id ? String(row.parent_id) : null,
      status: String(row.status),
      coverImageUrl: activity?.cover_image_url ?? null,
    };
  });

  return { ok: true, invites };
}
