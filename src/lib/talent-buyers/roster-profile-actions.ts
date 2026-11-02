"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readPagedRows } from "@/lib/supabase/read-pages";
import { requireIndustryApproval } from "./require-industry-approval";
import { addTalentToCollections, createCollection, getOrCreateSavedTalentListId, removeTalentFromCollection, unsaveTalent } from "./library";
import type { TalentSaveState } from "@/lib/talent/referrer-lists";
import { revalidatePath } from "next/cache";

async function context(talentUserId: string) {
  const db = await createServerSupabaseClient();
  const user = db ? (await db.auth.getUser()).data.user : null;
  if (!db || !user) return { error: "Sign in again to update your saved talent." } as const;
  const approval = await requireIndustryApproval(user.id);
  if (!approval.ok) return { error: approval.error } as const;
  const resolved = await db.rpc("resolve_professional_profile_id", { p_key: talentUserId });
  if (resolved.error || !resolved.data) return { error: "This talent profile is unavailable. Please try again." } as const;
  return { db, userId: user.id, profileId: resolved.data as string };
}

export async function fetchIndustryTalentSaveState(talentUserId: string): Promise<TalentSaveState> {
  const empty: TalentSaveState = { favorited: false, notifying: false, lists: [], error: null };
  const ctx = await context(talentUserId);
  if ("error" in ctx) return { ...empty, error: ctx.error ?? "Could not load saved talent." };
  const { db, userId, profileId } = ctx;
  const [lists, memberships, follow] = await Promise.all([
    readPagedRows((from, to) => db.from("talent_lists").select("id,name,kind").eq("owner_id", userId)
      .is("project_id", null).in("kind", ["favorites", "roster"]).order("name").order("id").range(from, to)),
    readPagedRows((from, to) => db.from("talent_list_members").select("id,list_id,talent_lists!inner(owner_id)")
      .eq("profile_id", profileId).eq("talent_lists.owner_id", userId).order("id").range(from, to)),
    db.from("profile_follows").select("followed_id").eq("follower_id", userId).eq("followed_id", talentUserId).maybeSingle(),
  ]);
  const error = lists.error ?? memberships.error ?? follow.error;
  if (error) return { ...empty, error: "Saved talent could not be loaded. Please retry." };
  const included = new Set((memberships.data ?? []).map(row => row.list_id));
  return {
    favorited: (lists.data ?? []).some(row => row.kind === "favorites" && included.has(row.id)),
    notifying: Boolean(follow.data),
    lists: (lists.data ?? []).filter(row => row.kind === "roster").map(row => ({ id: row.id, name: row.name, includes: included.has(row.id) })),
    error: null,
  };
}

/** Desired state makes retries idempotent and keeps named rosters independent. */
export async function setIndustryTalentSaved(talentUserId: string, saved: boolean): Promise<{ favorited: boolean; error: string | null }> {
  const ctx = await context(talentUserId);
  if ("error" in ctx) return { favorited: !saved, error: ctx.error ?? "Could not update saved talent." };
  if (!saved) {
    const result = await unsaveTalent([ctx.profileId]);
    return { favorited: result.ok ? false : true, error: result.error ?? null };
  }
  const favorite = await getOrCreateSavedTalentListId(ctx.db, ctx.userId);
  if (!favorite.id) return { favorited: false, error: favorite.error ?? "Could not save talent." };
  const { error } = await ctx.db.from("talent_list_members").upsert({ list_id: favorite.id, profile_id: ctx.profileId }, { onConflict: "list_id,profile_id", ignoreDuplicates: true });
  revalidatePath("/talent");
  revalidatePath("/library");
  return { favorited: !error, error: error ? "Could not save talent. Please retry." : null };
}

export async function setIndustryRosterMembership(talentUserId: string, listId: string, included: boolean) {
  const ctx = await context(talentUserId);
  if ("error" in ctx) return { error: ctx.error ?? "Could not update roster." };
  const result = included
    ? await addTalentToCollections({ profileIds: [ctx.profileId], collectionIds: [listId], ensureSaved: false })
    : await removeTalentFromCollection({ profileIds: [ctx.profileId], collectionId: listId });
  return { error: result.error ?? null };
}

export async function createIndustryRosterForTalent(talentUserId: string, name: string) {
  const ctx = await context(talentUserId);
  if ("error" in ctx) return { id: null, error: ctx.error ?? "Could not create roster.", includes: false };
  const created = await createCollection({ name });
  if (!created.ok || !created.id) return { id: null, error: created.error ?? "Could not create roster.", includes: false };
  const added = await addTalentToCollections({ profileIds: [ctx.profileId], collectionIds: [created.id], ensureSaved: false });
  return { id: created.id, includes: added.ok, error: added.ok ? null : "The roster was created, but this person could not be added. Select the roster below to retry." };
}
