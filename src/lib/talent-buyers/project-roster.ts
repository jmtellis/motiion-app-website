"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readPagedRows } from "@/lib/supabase/read-pages";
import { fetchAccessibleProjectRecord } from "./projects";
import { requireIndustryApproval } from "./require-industry-approval";
import { mergeProjectPeople } from "./project-roster-model";
import { resolveTalentProfileAccess } from "./casting/talent-profile-access";

export type ProjectRosterTalentCard = { userId: string | null; isVerified: boolean; locationCity: string | null; subtype: string | null; creditCount: number; topCredits: string[] };
export type ProjectRosterMember = { id: string; profileId: string; name: string; slug: string | null; avatarUrl: string | null; notes: string | null; addedAt: string; source?: "participant" | "legacy"; card?: ProjectRosterTalentCard };
export type ProjectPeopleGroup = { id: string; name: string; participantIds: string[] };

async function context(projectId: string, mutate = false) {
  if (!z.string().uuid().safeParse(projectId).success) throw new Error("Project not found.");
  const db = await createServerSupabaseClient();
  if (!db) throw new Error("Connection unavailable.");
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Sign in again to continue.");
  const project = await fetchAccessibleProjectRecord(projectId, user.id);
  if (!project) throw new Error("Project not found or access has been removed.");
  if (mutate) {
    const approval = await requireIndustryApproval(user.id);
    if (!approval.ok) throw new Error(approval.error);
    const operator = await db.rpc("is_project_operator", { p_project_id: projectId, p_user_id: user.id });
    if (operator.error || !operator.data) throw new Error("Only the project owner or an approved admin can manage people.");
  }
  return { db, user, project };
}
function message(error: unknown) { return error instanceof Error ? error.message : "Could not update project people. Please retry."; }
function refresh(projectId: string) { revalidatePath(`/projects/${projectId}`, "layout"); revalidatePath("/projects"); revalidatePath("/library"); }

export async function listProjectRosterMembers(projectId: string): Promise<{ listId: string | null; members: ProjectRosterMember[]; error?: string }> {
  try {
    const { db, project } = await context(projectId);
    const [participants, list] = await Promise.all([
      readPagedRows((from, to) => db.from("project_participants").select("id,user_id,added_at,removed_at").eq("project_id", projectId).order("id").range(from, to)),
      db.from("talent_lists").select("id").eq("owner_id", project.poster_id).eq("project_id", projectId).eq("kind", "project_roster").maybeSingle(),
    ]);
    if (participants.error || list.error) throw new Error("Could not load project people. Please retry.");
    const legacy = list.data ? await readPagedRows((from, to) => db.from("talent_list_members").select("id,profile_id,notes,added_at,professional_profiles(user_id)").eq("list_id", list.data!.id).order("id").range(from, to)) : { data: [], error: null };
    if (legacy.error) throw new Error("Could not load saved project people. Please retry.");
    const userIds = [...new Set([...participants.data!.map((row) => row.user_id as string), ...legacy.data!.flatMap((row) => { const profile = Array.isArray(row.professional_profiles) ? row.professional_profiles[0] : row.professional_profiles; return profile?.user_id ? [profile.user_id as string] : []; })])];
    // Project membership is not permission to disclose an arbitrary private
    // profile. Reuse the same self/public/actual-submission guard as Library.
    const access = await resolveTalentProfileAccess(db, userIds);
    const visibleIds = userIds.filter((id) => access.allowed.has(id));
    const reader = createAdminSupabaseClient() ?? db;
    async function hydrate(ids: string[]) { return Promise.all([
      reader.from("profiles").select("user_id,display_name,first_name,last_name,headshot_urls").in("user_id", ids),
      reader.from("professional_profiles").select("id,user_id,slug,location_city,is_verified,subtype,media_assets(url,kind,position)").in("user_id", ids),
      readPagedRows((from, to) => reader.from("talent_credits").select("id,talent_id,production_name_fallback,production:industry_entities!talent_credits_production_entity_id_fkey(canonical_name)").in("talent_id", ids).eq("is_public", true).neq("verification_status", "ai_extracted").order("credit_year", { ascending: false, nullsFirst: false }).order("id").range(from, to)),
    ]); }
    const batches: Awaited<ReturnType<typeof hydrate>>[] = [];
    for (let start = 0; start < visibleIds.length; start += 200) batches.push(await hydrate(visibleIds.slice(start, start + 200)));
    if (batches.some((batch) => batch.some((result) => result.error))) throw new Error("People were found, but their profiles could not load. Please retry.");
    const accounts = { data: batches.flatMap((batch) => batch[0].data ?? []) };
    const profiles = { data: batches.flatMap((batch) => batch[1].data ?? []) };
    const credits = { data: batches.flatMap((batch) => batch[2].data ?? []) };
    function person(userId: string | null, fallbackProfileId = "") {
      const account = accounts.data?.find((row) => row.user_id === userId);
      const profile = profiles.data?.find((row) => row.user_id === userId);
      const publicCredits = credits.data?.filter((row) => row.talent_id === userId) ?? [];
      return { userId, profileId: profile?.id ?? fallbackProfileId, name: account?.display_name || [account?.first_name, account?.last_name].filter(Boolean).join(" ") || profile?.slug?.replaceAll("-", " ") || "Unavailable profile", slug: profile?.slug ?? null, avatarUrl: profile?.media_assets?.find((asset) => asset.kind === "headshot")?.url || account?.headshot_urls?.[0] || null, card: { userId: account ? userId : null, isVerified: profile?.is_verified === true, locationCity: profile?.location_city ?? null, subtype: profile?.subtype ?? null, creditCount: publicCredits.length, topCredits: publicCredits.slice(0, 2).flatMap((row) => { const production = Array.isArray(row.production) ? row.production[0] : row.production; return production?.canonical_name || row.production_name_fallback ? [production?.canonical_name || row.production_name_fallback] : []; }) } };
    }
    const canonical = participants.data!.map((row) => ({ ...person(row.user_id, row.user_id), id: `participant:${row.id}`, notes: null, addedAt: row.added_at, removed: Boolean(row.removed_at), source: "participant" as const }));
    const saved = legacy.data!.map((row) => { const profile = Array.isArray(row.professional_profiles) ? row.professional_profiles[0] : row.professional_profiles; return { ...person(profile?.user_id ?? null, row.profile_id), id: row.id as string, notes: row.notes as string | null, addedAt: row.added_at as string, source: "legacy" as const }; });
    return { listId: list.data?.id ?? null, members: mergeProjectPeople<ProjectRosterMember & { userId: string | null }>(canonical, saved).sort((a, b) => a.name.localeCompare(b.name)) };
  } catch (error) { return { listId: null, members: [], error: message(error) }; }
}

export async function addToProjectRoster(input: { projectId: string; profileId: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const { db } = await context(input.projectId, true);
    const profile = await db.from("professional_profiles").select("user_id").eq("id", input.profileId).maybeSingle();
    if (profile.error || !profile.data?.user_id) throw new Error("This talent profile is no longer available.");
    const result = await db.rpc("add_project_participant", { p_project_id: input.projectId, p_user_id: profile.data.user_id });
    if (result.error) throw new Error(result.error.message);
    refresh(input.projectId); return { ok: true };
  } catch (error) { return { ok: false, error: message(error) }; }
}

export async function importCollectionToProjectRoster(input: { projectId: string; collectionId: string }): Promise<{ ok: boolean; added?: number; error?: string }> {
  try {
    const { db, user } = await context(input.projectId, true);
    const collection = await db.from("talent_lists").select("id").eq("id", input.collectionId).eq("owner_id", user.id).maybeSingle();
    if (collection.error || !collection.data) throw new Error("Collection not found.");
    const collectionId = collection.data.id;
    const members = await readPagedRows((from, to) => db.from("talent_list_members").select("id,professional_profiles(user_id)").eq("list_id", collectionId).order("id").range(from, to));
    if (members.error) throw new Error(members.error.message);
    const ids = [...new Set(members.data!.flatMap((row) => { const profile = Array.isArray(row.professional_profiles) ? row.professional_profiles[0] : row.professional_profiles; return profile?.user_id ? [profile.user_id] : []; }))];
    let added = 0;
    for (const id of ids) { const result = await db.rpc("add_project_participant", { p_project_id: input.projectId, p_user_id: id }); if (result.error) { refresh(input.projectId); throw new Error(`${added} people imported before an error. Retry safely to finish; people will not be duplicated.`); } added++; }
    refresh(input.projectId); return { ok: true, added };
  } catch (error) { return { ok: false, error: message(error) }; }
}

export async function removeFromProjectRoster(projectId: string, memberId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { db, project } = await context(projectId, true);
    if (memberId.startsWith("participant:")) {
      const person = await db.from("project_participants").select("user_id").eq("project_id", projectId).eq("id", memberId.slice(12)).maybeSingle();
      if (person.error || !person.data) throw new Error("Person no longer found in this project.");
      const result = await db.rpc("remove_project_participant", { p_project_id: projectId, p_user_id: person.data.user_id });
      if (result.error) throw new Error(result.error.message);
    } else {
      const list = await db.from("talent_lists").select("id").eq("owner_id", project.poster_id).eq("project_id", projectId).eq("kind", "project_roster").maybeSingle();
      if (list.error || !list.data) throw new Error("Saved project list not found.");
      const result = await db.from("talent_list_members").delete().eq("id", memberId).eq("list_id", list.data.id);
      if (result.error) throw new Error(result.error.message);
    }
    refresh(projectId); return { ok: true };
  } catch (error) { return { ok: false, error: message(error) }; }
}

export async function addSubmissionToProjectRoster(projectId: string, submissionId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { db } = await context(projectId, true);
    const submission = await db.from("submissions").select("id,talent_id,roles!inner(project_id)").eq("id", submissionId).eq("roles.project_id", projectId).maybeSingle();
    if (submission.error || !submission.data?.talent_id) throw new Error("Only a signed-in Motiion applicant from this project can be added to People.");
    const result = await db.rpc("add_project_participant", { p_project_id: projectId, p_user_id: submission.data.talent_id });
    if (result.error) throw new Error(result.error.message);
    refresh(projectId); return { ok: true };
  } catch (error) { return { ok: false, error: message(error) }; }
}

export async function listProjectPeopleGroups(projectId: string): Promise<{ groups: ProjectPeopleGroup[]; canManage: boolean; error?: string }> {
  try {
    const { db, user } = await context(projectId);
    const [groups, operator] = await Promise.all([db.from("project_groups").select("id,name,project_group_members(participant_id)").eq("project_id", projectId).is("archived_at", null).order("name"), db.rpc("is_project_operator", { p_project_id: projectId, p_user_id: user.id })]);
    if (groups.error || operator.error) throw new Error("Could not load project groups. Please retry.");
    return { groups: groups.data.map((group) => ({ id: group.id, name: group.name, participantIds: group.project_group_members.map((row) => `participant:${row.participant_id}`) })), canManage: Boolean(operator.data) };
  } catch (error) { return { groups: [], canManage: false, error: message(error) }; }
}
export async function updateProjectPeopleGroup(input: { projectId: string; action: "create" | "add" | "remove" | "archive"; groupId?: string; userId?: string; name?: string }) {
  try {
    const { db } = await context(input.projectId, true);
    if (input.action === "create") {
      const name = z.string().trim().min(1).max(80).parse(input.name);
      const result = await db.rpc("create_project_group", { p_project_id: input.projectId, p_name: name });
      if (result.error) throw new Error(result.error.message);
      refresh(input.projectId); return { ok: true, id: result.data as string };
    }
    const group = await db.from("project_groups").select("id").eq("id", input.groupId).eq("project_id", input.projectId).is("archived_at", null).maybeSingle();
    if (group.error || !group.data) throw new Error("Group not found in this project.");
    const result = input.action === "archive" ? await db.rpc("archive_project_people_group", { p_project_id: input.projectId, p_group_id: group.data.id }) : await db.rpc(input.action === "add" ? "add_project_group_member" : "remove_project_group_member", { p_group_id: group.data.id, p_user_id: z.string().uuid().parse(input.userId) });
    if (result.error) throw new Error(result.error.message);
    refresh(input.projectId); return { ok: true };
  } catch (error) { return { ok: false, error: message(error) }; }
}
