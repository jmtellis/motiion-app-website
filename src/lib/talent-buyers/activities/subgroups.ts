import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActivityDraft, DraftJobGroup } from "@/lib/talent-buyers/activities/types";

function profileName(row: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  const display = row.display_name?.trim();
  if (display) return display;
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "Member";
}

function headshot(urls: string[] | null | undefined): string | null {
  if (!Array.isArray(urls)) return null;
  return urls.find((url) => typeof url === "string" && url.trim())?.trim() ?? null;
}

export async function loadJobGroupsForDraft(
  supabase: SupabaseClient,
  rootJobId: string,
): Promise<{ enabled: boolean; groups: DraftJobGroup[] }> {
  const { data: groups } = await supabase
    .from("job_groups")
    .select("id,name,sort_order")
    .eq("job_id", rootJobId)
    .order("sort_order", { ascending: true });

  const groupRows = (groups ?? []) as { id: string; name: string; sort_order: number }[];
  if (!groupRows.length) {
    return { enabled: false, groups: [] };
  }

  const groupIds = groupRows.map((g) => g.id);
  const { data: invites } = await supabase
    .from("job_group_invites")
    .select("id,job_group_id,invited_user_id,status,membership_role_on_accept")
    .in("job_group_id", groupIds)
    .in("status", ["pending", "accepted"])
    .eq("membership_role_on_accept", "lead");

  const inviteRows = (invites ?? []) as {
    job_group_id: string;
    invited_user_id: string;
    status: string;
  }[];
  const userIds = [...new Set(inviteRows.map((row) => row.invited_user_id))];
  const profileById = new Map<string, { displayName: string; headshotUrl: string | null }>();

  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id,display_name,first_name,last_name,headshot_urls")
      .in("user_id", userIds);
    for (const profile of (profiles ?? []) as Record<string, unknown>[]) {
      profileById.set(String(profile.user_id), {
        displayName: profileName(
          profile as {
            display_name?: string | null;
            first_name?: string | null;
            last_name?: string | null;
          },
        ),
        headshotUrl: headshot(profile.headshot_urls as string[] | null),
      });
    }
  }

  const draftGroups: DraftJobGroup[] = groupRows.map((group) => {
    const leads = inviteRows
      .filter((invite) => invite.job_group_id === group.id)
      .map((invite) => {
        const profile = profileById.get(invite.invited_user_id);
        return {
          userId: invite.invited_user_id,
          displayName: profile?.displayName ?? "Lead",
          headshotUrl: profile?.headshotUrl ?? null,
        };
      });
    return {
      id: group.id,
      persistedId: group.id,
      name: group.name,
      leadInvitees: leads,
    };
  });

  return { enabled: true, groups: draftGroups };
}

export async function syncEventSubgroups(
  supabase: SupabaseClient,
  userId: string,
  rootJobId: string,
  activityId: string,
  draft: ActivityDraft,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!draft.eventSubgroupsEnabled) {
    // Leave existing groups intact when toggled off on edit — organizer can delete in manage.
    return { ok: true };
  }

  const desired = draft.jobGroups
    .map((group) => ({
      ...group,
      name: group.name.trim(),
    }))
    .filter((group) => group.name.length > 0);

  const { data: existing } = await supabase
    .from("job_groups")
    .select("id")
    .eq("job_id", rootJobId);
  const existingIds = new Set(((existing ?? []) as { id: string }[]).map((row) => row.id));
  const keepIds = new Set(
    desired.map((group) => group.persistedId).filter((id): id is string => Boolean(id)),
  );

  for (const id of existingIds) {
    if (!keepIds.has(id)) {
      const { error } = await supabase.from("job_groups").delete().eq("id", id);
      if (error) {
        console.error("[activities] delete job_group", error.message);
        return { ok: false, error: "Could not update subgroups." };
      }
    }
  }

  for (let index = 0; index < desired.length; index += 1) {
    const group = desired[index];
    let groupId = group.persistedId;

    if (groupId && existingIds.has(groupId)) {
      const { error } = await supabase
        .from("job_groups")
        .update({ name: group.name, sort_order: index })
        .eq("id", groupId);
      if (error) {
        console.error("[activities] update job_group", error.message);
        return { ok: false, error: "Could not update subgroups." };
      }
    } else {
      const { data: created, error } = await supabase
        .from("job_groups")
        .insert({
          job_id: rootJobId,
          name: group.name,
          sort_order: index,
          created_by: userId,
        })
        .select("id")
        .single();
      if (error || !created) {
        console.error("[activities] insert job_group", error?.message);
        return { ok: false, error: "Could not create subgroups." };
      }
      groupId = created.id as string;
    }

    const inviteResult = await replaceGroupLeadInvites(
      supabase,
      userId,
      rootJobId,
      groupId,
      activityId,
      group.leadInvitees.map((person) => person.userId),
    );
    if (!inviteResult.ok) return inviteResult;
  }

  return { ok: true };
}

async function replaceGroupLeadInvites(
  supabase: SupabaseClient,
  actorId: string,
  jobId: string,
  groupId: string,
  activityId: string,
  invitedUserIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const desired = [...new Set(invitedUserIds.filter(Boolean))];

  const { data: existingRows, error: existingError } = await supabase
    .from("job_group_invites")
    .select("id,invited_user_id,status")
    .eq("job_group_id", groupId)
    .in("status", ["pending", "accepted"]);

  if (existingError) {
    console.error("[activities] load group invites", existingError.message);
    return { ok: false, error: "Could not update lead invites." };
  }

  const existing = (existingRows ?? []) as {
    id: string;
    invited_user_id: string;
    status: string;
  }[];
  const desiredSet = new Set(desired);
  const existingSet = new Set(existing.map((row) => row.invited_user_id));

  const toRevoke = existing.filter((row) => !desiredSet.has(row.invited_user_id));
  if (toRevoke.length) {
    const { error } = await supabase
      .from("job_group_invites")
      .update({ status: "revoked" })
      .in(
        "id",
        toRevoke.map((row) => row.id),
      );
    if (error) {
      console.error("[activities] revoke group invites", error.message);
      return { ok: false, error: "Could not update lead invites." };
    }
  }

  const toInsert = desired
    .filter((userId) => !existingSet.has(userId))
    .map((userId) => ({
      job_group_id: groupId,
      job_id: jobId,
      invited_user_id: userId,
      invited_by: actorId,
      status: "pending",
      membership_role_on_accept: "lead",
      context_activity_id: activityId,
    }));

  if (toInsert.length) {
    const { error } = await supabase.from("job_group_invites").insert(toInsert);
    if (error) {
      console.error("[activities] insert group invites", error.message);
      return { ok: false, error: "Could not invite subgroup leads." };
    }
  }

  return { ok: true };
}
