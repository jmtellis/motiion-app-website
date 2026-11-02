"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { isPublicCollectionAccount } from "@/lib/talent-buyers/collection-public-people";
import { readPagedRows } from "@/lib/supabase/read-pages";

import { requireIndustryProFeature } from "@/lib/billing/gate";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  COLLECTION_SHARE_DURATIONS,
  collectionShareExpiresAt,
  publicCollectionShareUrl,
  type CollectionShareDuration,
  type CollectionShareSummary,
} from "@/lib/talent-buyers/collection-share-types";

export async function listCollectionShares(): Promise<{
  shares: CollectionShareSummary[];
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { shares: [], error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { shares: [], error: "Not signed in" };

  const { data, error } = await readPagedRows((from, to) => supabase
    .from("talent_list_shares")
    .select(
      "id, list_id, token, title, is_active, expires_at, expiration_kind, created_at, talent_lists(name), talent_list_share_recipients(id, display_name, email, avatar_url, sort_order)",
    )
    .eq("owner_user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false }).order("id").range(from, to));

  if (error) return { shares: [], error: error.message };

  const shares: CollectionShareSummary[] = (data ?? []).map((row) => {
    const list = row.talent_lists as { name?: string } | { name?: string }[] | null;
    const listName = Array.isArray(list) ? list[0]?.name : list?.name;
    const recipientsRaw = row.talent_list_share_recipients as
      | {
          id: string;
          display_name: string | null;
          email: string | null;
          avatar_url: string | null;
          sort_order: number;
        }[]
      | null;

    const recipients = [...(recipientsRaw ?? [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((recipient) => ({
        id: recipient.id,
        displayName: recipient.display_name,
        email: recipient.email,
        avatarUrl: recipient.avatar_url,
      }));

    return {
      id: row.id as string,
      listId: row.list_id as string,
      listName: listName || "Collection",
      token: row.token as string,
      title: (row.title as string | null) ?? null,
      isActive: Boolean(row.is_active),
      expiresAt: (row.expires_at as string | null) ?? null,
      expirationKind: (row.expiration_kind as string | null) ?? null,
      createdAt: row.created_at as string,
      publicUrl: publicCollectionShareUrl(row.token as string),
      recipients,
    };
  });

  return { shares, error: null };
}

export async function createCollectionShare(input: {
  collectionId: string;
  duration: CollectionShareDuration;
  title?: string;
  recipients?: { displayName: string; email?: string; avatarUrl?: string }[];
}): Promise<{ ok: boolean; share?: CollectionShareSummary; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const pro = await requireIndustryProFeature(user.id, "roster_write");
  if (!pro.ok) {
    return { ok: false, error: "Industry Pro is required to share collections." };
  }

  const { data: list, error: listError } = await supabase
    .from("talent_lists")
    .select("id, name")
    .eq("id", input.collectionId)
    .eq("owner_id", user.id)
    .eq("kind", "roster").is("project_id", null)
    .maybeSingle();

  if (listError || !list) return { ok: false, error: "Collection not found" };

  if (!COLLECTION_SHARE_DURATIONS.some((option) => option.value === input.duration)) return { ok: false, error: "Choose a valid link duration" };
  if ((input.recipients?.length ?? 0) > 50) return { ok: false, error: "Use at most 50 recipient labels" };
  const token = randomBytes(18).toString("base64url");
  const expiresAt = collectionShareExpiresAt(input.duration);

  const { data: share, error } = await supabase
    .from("talent_list_shares")
    .insert({
      list_id: input.collectionId,
      owner_user_id: user.id,
      token,
      title: input.title?.trim() || list.name,
      is_active: true,
      expires_at: expiresAt,
      expiration_kind: input.duration,
    })
    .select("id, list_id, token, title, is_active, expires_at, expiration_kind, created_at")
    .single();

  if (error || !share) return { ok: false, error: error?.message ?? "Could not create share" };

  const recipients = (input.recipients ?? [])
    .map((recipient, index) => ({
      share_id: share.id,
      display_name: recipient.displayName.trim() || null,
      email: recipient.email?.trim() || null,
      avatar_url: recipient.avatarUrl?.trim() || null,
      sort_order: index,
    }))
    .filter((recipient) => recipient.display_name || recipient.email);

  if (recipients.length) {
    const { error: recipientError } = await supabase.from("talent_list_share_recipients").insert(recipients);
    if (recipientError) {
      await supabase.from("talent_list_shares").update({ is_active: false }).eq("id", share.id).eq("owner_user_id", user.id).select("id").maybeSingle();
      return { ok: false, error: "Could not save recipient labels. Please try creating the share again." };
    }
  }

  revalidatePath("/library");

  const listed = await listCollectionShares();
  const created = listed.shares.find((item) => item.id === share.id);

  return {
    ok: true,
    share:
      created ??
      ({
        id: share.id,
        listId: share.list_id,
        listName: list.name,
        token: share.token,
        title: share.title,
        isActive: share.is_active,
        expiresAt: share.expires_at,
        expirationKind: share.expiration_kind,
        createdAt: share.created_at,
        publicUrl: publicCollectionShareUrl(share.token),
        recipients: (input.recipients ?? []).map((recipient, index) => ({
          id: String(index),
          displayName: recipient.displayName,
          email: recipient.email ?? null,
          avatarUrl: recipient.avatarUrl ?? null,
        })),
      } satisfies CollectionShareSummary),
  };
}

export async function deactivateCollectionShare(
  shareId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: changed, error } = await supabase
    .from("talent_list_shares")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", shareId)
    .eq("owner_user_id", user.id);

  if (error) return { ok: false, error: error.message };
  if (!changed) return { ok: false, error: "This share is unavailable or access changed." };
  revalidatePath("/library");
  return { ok: true };
}

export type PublicCollectionShare = {
  title: string;
  listName: string;
  expiresAt: string | null;
  expirationKind: string | null;
  members: {
    name: string;
    location: string | null;
    avatarUrl: string | null;
    slug: string | null;
  }[];
};

export async function getPublicCollectionShare(
  token: string,
): Promise<{ share: PublicCollectionShare | null; error: string | null }> {
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const admin = createAdminSupabaseClient();
  if (!admin) return { share: null, error: "Unavailable" };

  const trimmed = token.trim();
  if (!trimmed) return { share: null, error: "Invalid link" };

  const { data: share, error } = await admin
    .from("talent_list_shares")
    .select("id, list_id, title, is_active, expires_at, expiration_kind, talent_lists(name)")
    .eq("token", trimmed)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return { share: null, error: error.message };
  if (!share) return { share: null, error: "Link not found" };

  const expiresAt = (share.expires_at as string | null) ?? null;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return { share: null, error: "This link has expired" };
  }

  const list = share.talent_lists as { name?: string } | { name?: string }[] | null;
  const listName = (Array.isArray(list) ? list[0]?.name : list?.name) || "Collection";

  const { data: members, error: membersError } = await readPagedRows((from, to) => admin
    .from("talent_list_members").select("profile_id, added_at")
    .eq("list_id", share.list_id as string)
    .order("added_at", { ascending: false }).order("id").range(from, to));
  if (membersError) return { share: null, error: "The collection could not be loaded. Please try again." };

  const profileIds = (members ?? []).map((row) => row.profile_id as string);
  const people: PublicCollectionShare["members"] = [];

  for (let index = 0; index < profileIds.length; index += 200) {
    const batchIds = profileIds.slice(index, index + 200);
    const { data: pros, error: profilesError } = await admin.from("professional_profiles")
      .select("id, user_id, slug, location_city, location_region").in("id", batchIds);
    if (profilesError) return { share: null, error: "The profiles could not be loaded. Please try again." };
    const userIds = [...new Set((pros ?? []).map((row) => row.user_id as string).filter(Boolean))];
    const { data: accounts, error: accountsError } = userIds.length
      ? await admin.from("profiles").select("user_id, username, display_name, first_name, last_name, headshot_urls, is_private, moderation_status").in("user_id", userIds)
      : { data: [], error: null };
    if (accountsError) return { share: null, error: "The profiles could not be loaded. Please try again." };
    // A roster owner's share does not override a talent account's public visibility.
    const accountByUser = new Map((accounts ?? []).filter(isPublicCollectionAccount).map((row) => [row.user_id as string, row]));
    const visiblePros = (pros ?? []).filter((row) => row.user_id && accountByUser.has(row.user_id));
    const proById = new Map(visiblePros.map((row) => [row.id as string, row]));
    if (!visiblePros.length) continue;
    const { data: mediaRows, error: mediaError } = await readPagedRows((from, to) => admin.from("media_assets")
      .select("profile_id, url, storage_path, kind, position").in("profile_id", visiblePros.map((row) => row.id))
      .eq("kind", "headshot").order("position", { ascending: true }).order("id").range(from, to));
    if (mediaError) return { share: null, error: "Profile media could not be loaded. Please try again." };
    const mediaByProfile = new Map<string, { url: string | null; storage_path: string | null }>();
    for (const asset of mediaRows ?? []) {
      if (!mediaByProfile.has(asset.profile_id)) mediaByProfile.set(asset.profile_id, asset);
    }
    const paths = [...new Set([...mediaByProfile.values()].map((asset) => asset.storage_path?.trim()).filter((path): path is string => Boolean(path)))];
    const signedByPath = new Map<string, string>();
    if (paths.length) {
      const { data: signed, error: signingError } = await admin.storage.from("media").createSignedUrls(paths, 60 * 60);
      if (signingError) return { share: null, error: "Profile media is temporarily unavailable. Please try again." };
      signed?.forEach((entry, position) => { if (entry.signedUrl) signedByPath.set(paths[position], entry.signedUrl); });
    }
    for (const profileId of batchIds) {
      const pro = proById.get(profileId);
      if (!pro?.user_id) continue;
      const account = accountByUser.get(pro.user_id)!;
      const name = account.display_name?.trim() || [account.first_name, account.last_name].filter(Boolean).join(" ").trim() || pro.slug || "Talent";
      const headshots = account.headshot_urls as string[] | null;
      const media = mediaByProfile.get(profileId);
      const avatarUrl = headshots?.find((url) => typeof url === "string" && url.trim())?.trim()
        || (media?.storage_path ? signedByPath.get(media.storage_path.trim()) : null) || media?.url?.trim() || null;
      people.push({ name, location: [pro.location_city, pro.location_region].filter(Boolean).join(", ") || null, avatarUrl, slug: account.username || pro.user_id });
    }
  }

  return {
    share: {
      title: ((share.title as string | null) ?? listName) || "Collection",
      listName,
      expiresAt,
      expirationKind: (share.expiration_kind as string | null) ?? null,
      members: people,
    },
    error: null,
  };
}
