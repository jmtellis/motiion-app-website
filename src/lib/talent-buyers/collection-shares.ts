"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
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

  const { data, error } = await supabase
    .from("talent_list_shares")
    .select(
      "id, list_id, token, title, is_active, expires_at, expiration_kind, created_at, talent_lists(name), talent_list_share_recipients(id, display_name, email, avatar_url, sort_order)",
    )
    .eq("owner_user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

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

  const { data: list, error: listError } = await supabase
    .from("talent_lists")
    .select("id, name")
    .eq("id", input.collectionId)
    .eq("owner_id", user.id)
    .eq("kind", "roster")
    .maybeSingle();

  if (listError || !list) return { ok: false, error: "Collection not found" };

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
    await supabase.from("talent_list_share_recipients").insert(recipients);
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

  const { error } = await supabase
    .from("talent_list_shares")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", shareId)
    .eq("owner_user_id", user.id);

  if (error) return { ok: false, error: error.message };
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

  const { data: members } = await admin
    .from("talent_list_members")
    .select("profile_id, added_at")
    .eq("list_id", share.list_id as string)
    .order("added_at", { ascending: false });

  const profileIds = (members ?? []).map((row) => row.profile_id as string);
  const people: PublicCollectionShare["members"] = [];

  if (profileIds.length) {
    const { data: pros } = await admin
      .from("professional_profiles")
      .select("id, user_id, slug, location_city, location_region")
      .in("id", profileIds);

    const proById = new Map((pros ?? []).map((row) => [row.id as string, row]));
    const userIds = [...new Set((pros ?? []).map((row) => row.user_id as string).filter(Boolean))];

    const [{ data: accounts }, { data: mediaRows }] = await Promise.all([
      userIds.length
        ? admin
            .from("profiles")
            .select("user_id, display_name, first_name, last_name, headshot_urls")
            .in("user_id", userIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      admin
        .from("media_assets")
        .select("profile_id, url, storage_path, kind, position")
        .in("profile_id", profileIds)
        .eq("kind", "headshot")
        .order("position", { ascending: true }),
    ]);

    const accountByUser = new Map((accounts ?? []).map((row) => [row.user_id as string, row]));

    const mediaByProfile = new Map<string, { url: string | null; storage_path: string | null }>();
    for (const asset of mediaRows ?? []) {
      const profileId = asset.profile_id as string;
      if (mediaByProfile.has(profileId)) continue;
      mediaByProfile.set(profileId, {
        url: (asset.url as string | null) ?? null,
        storage_path: (asset.storage_path as string | null) ?? null,
      });
    }

    const paths = [...mediaByProfile.values()]
      .map((asset) => asset.storage_path?.trim())
      .filter((path): path is string => Boolean(path));
    const signedByPath = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await admin.storage.from("media").createSignedUrls(paths, 60 * 60);
      signed?.forEach((entry, index) => {
        if (entry.signedUrl) signedByPath.set(paths[index], entry.signedUrl);
      });
    }

    for (const profileId of profileIds) {
      const pro = proById.get(profileId);
      const account = pro?.user_id ? accountByUser.get(pro.user_id as string) : null;
      const name =
        (account?.display_name as string | null)?.trim() ||
        [account?.first_name, account?.last_name].filter(Boolean).join(" ").trim() ||
        ((pro?.slug as string | null) ?? "Talent");
      const headshots = account?.headshot_urls as string[] | null;
      const media = mediaByProfile.get(profileId);
      const signed =
        media?.storage_path && signedByPath.get(media.storage_path.trim())
          ? signedByPath.get(media.storage_path.trim())!
          : null;
      const avatarUrl =
        headshots?.find((url) => typeof url === "string" && url.trim())?.trim() ||
        signed ||
        media?.url?.trim() ||
        null;
      const location = [pro?.location_city, pro?.location_region].filter(Boolean).join(", ") || null;

      people.push({
        name,
        location,
        avatarUrl,
        slug: (pro?.slug as string | null) ?? null,
      });
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
