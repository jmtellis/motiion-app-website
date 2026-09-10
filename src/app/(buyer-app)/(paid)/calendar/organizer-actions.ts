"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  loadFeaturedTalentTree,
  type FeaturedTalentRow,
} from "@/lib/talent-buyers/activities/featured-talent";
import {
  loadOrganizerActivity,
  loadOrganizerPromos,
  loadOrganizerRevenue,
  loadOrganizerRoster,
  loadOrganizerSubgroups,
  parseProfileQrPayload,
  type OrganizerActivityDetail,
} from "@/lib/talent-buyers/activities/organizer-data";
import { syncActivityPromoCodes } from "@/lib/talent-buyers/activities/promo-codes";
import type {
  ActivityDraft,
  DraftPromoCode,
  OrganizerAttendee,
  OrganizerRevenueSummary,
  OrganizerSubgroup,
} from "@/lib/talent-buyers/activities/types";
import { createDefaultActivityDraft } from "@/lib/talent-buyers/activities/defaults";

export type OrganizerPageData = {
  activity: OrganizerActivityDetail;
  attendees: OrganizerAttendee[];
  revenue: OrganizerRevenueSummary;
  subgroups: OrganizerSubgroup[];
  promos: DraftPromoCode[];
  featuredTalent: FeaturedTalentRow[];
};

export async function getOrganizerPageData(
  activityId: string,
  eventDayId?: string | null,
): Promise<{ ok: true; data: OrganizerPageData } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const activityResult = await loadOrganizerActivity(supabase, activityId, user.id);
  if (!activityResult.ok) return activityResult;

  const [attendees, revenue, subgroups, promos, featuredTalent] = await Promise.all([
    loadOrganizerRoster(supabase, activityId, eventDayId),
    loadOrganizerRevenue(supabase, activityId),
    loadOrganizerSubgroups(supabase, activityResult.activity.rootJobId),
    loadOrganizerPromos(supabase, activityId),
    activityResult.activity.type === "event"
      ? loadFeaturedTalentTree(supabase, activityId)
      : Promise.resolve([]),
  ]);

  return {
    ok: true,
    data: {
      activity: activityResult.activity,
      attendees,
      revenue,
      subgroups,
      promos,
      featuredTalent,
    },
  };
}

export async function recordOrganizerCheckIn(input: {
  activityId: string;
  qrOrUserRef: string;
  eventDayId?: string | null;
}): Promise<{ ok: boolean; error?: string; checkedInAt?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const parsed = parseProfileQrPayload(input.qrOrUserRef);
  if (!parsed) return { ok: false, error: "Could not read a Motiion profile from that code." };

  let userId = parsed;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(parsed)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", parsed)
      .maybeSingle();
    if (!profile?.user_id) {
      return { ok: false, error: "No profile found for that username." };
    }
    userId = profile.user_id as string;
  }

  const { data, error } = await supabase.rpc("record_activity_check_in", {
    p_activity_id: input.activityId,
    p_user_id: userId,
    ...(input.eventDayId ? { p_event_day_id: input.eventDayId } : {}),
  });

  if (error) {
    console.error("[organizer] check-in rpc", error.message);
    return { ok: false, error: "Could not record check-in." };
  }

  const payload = data as { ok?: boolean; error?: string; checked_in_at?: string } | null;
  if (!payload?.ok) {
    const code = payload?.error ?? "check_in_failed";
    const message =
      code === "not_on_roster"
        ? "This person is not on the roster."
        : code === "not_entitled_for_day"
          ? "This ticket does not include the selected day."
          : code === "forbidden"
            ? "You do not have permission to check people in."
            : "Could not record check-in.";
    return { ok: false, error: message };
  }

  revalidatePath(`/calendar/${input.activityId}`);
  return { ok: true, checkedInAt: payload.checked_in_at };
}

export async function grantOrganizerComp(input: {
  activityId: string;
  userId: string;
  ticketOptionId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const { data, error } = await supabase.rpc("event_grant_comp_enrollment", {
    p_activity_id: input.activityId,
    p_student_id: input.userId,
    p_pricing_tier_id: input.ticketOptionId ?? "",
    p_ticket_option_id: input.ticketOptionId ?? null,
  });

  if (error) {
    console.error("[organizer] comp", error.message);
    // Fallback for free/class activities without the event RPC shape.
    const { error: upsertError } = await supabase.from("enrollments").upsert(
      {
        activity_id: input.activityId,
        student_id: input.userId,
        status: "comped",
        ticket_option_id: input.ticketOptionId ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "activity_id,student_id" },
    );
    if (upsertError) {
      return { ok: false, error: "Could not comp this guest." };
    }
  } else {
    const payload = data as { ok?: boolean; error?: string } | null;
    if (payload && payload.ok === false) {
      return { ok: false, error: payload.error ?? "Could not comp this guest." };
    }
  }

  revalidatePath(`/calendar/${input.activityId}`);
  return { ok: true };
}

export async function inviteSubgroupLead(input: {
  activityId: string;
  groupId: string;
  userId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const result = await addEventLead({
    activityId: input.activityId,
    userId: input.userId,
    groupId: input.groupId,
  });
  return result.ok ? { ok: true } : result;
}

/** Invite a Motiion member as a subgroup lead. Creates a subgroup when none is selected. */
export async function addEventLead(input: {
  activityId: string;
  userId: string;
  groupId?: string | null;
  newGroupName?: string | null;
}): Promise<{ ok: true; groupId: string } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const activityResult = await loadOrganizerActivity(supabase, input.activityId, user.id);
  if (!activityResult.ok) return activityResult;
  if (activityResult.activity.type !== "event") {
    return { ok: false, error: "Leads are only available on events." };
  }
  const rootJobId = activityResult.activity.rootJobId;
  if (!rootJobId) return { ok: false, error: "This event has no showcase workspace." };

  let groupId = input.groupId?.trim() || null;
  if (!groupId) {
    const name = input.newGroupName?.trim() || "Featured";
    const { data: existingGroups } = await supabase
      .from("job_groups")
      .select("id,sort_order")
      .eq("job_id", rootJobId)
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextSort =
      ((existingGroups?.[0] as { sort_order?: number } | undefined)?.sort_order ?? -1) + 1;
    const { data: created, error: createError } = await supabase
      .from("job_groups")
      .insert({
        job_id: rootJobId,
        name,
        sort_order: nextSort,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (createError || !created) {
      console.error("[organizer] create subgroup", createError?.message);
      return { ok: false, error: "Could not create a subgroup for this lead." };
    }
    groupId = created.id as string;
  }

  const { error } = await supabase.from("job_group_invites").insert({
    job_group_id: groupId,
    job_id: rootJobId,
    invited_user_id: input.userId,
    invited_by: user.id,
    status: "pending",
    membership_role_on_accept: "lead",
    context_activity_id: input.activityId,
  });

  if (error) {
    console.error("[organizer] invite lead", error.message);
    return { ok: false, error: "Could not invite that lead." };
  }

  revalidatePath(`/calendar/${input.activityId}`);
  return { ok: true, groupId };
}

export async function removeSubgroupLead(input: {
  activityId: string;
  groupId: string;
  userId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const { data, error } = await supabase.rpc("organizer_remove_job_group_member", {
    p_job_group_id: input.groupId,
    p_member_user_id: input.userId,
  });

  if (error) {
    console.error("[organizer] remove lead member", error.message);
  } else {
    const payload = data as { ok?: boolean } | null;
    if (payload?.ok) {
      revalidatePath(`/calendar/${input.activityId}`);
      return { ok: true };
    }
  }

  const { error: revokeError } = await supabase
    .from("job_group_invites")
    .update({ status: "revoked" })
    .eq("job_group_id", input.groupId)
    .eq("invited_user_id", input.userId)
    .eq("status", "pending");

  if (revokeError) {
    return { ok: false, error: "Could not remove that lead." };
  }

  revalidatePath(`/calendar/${input.activityId}`);
  return { ok: true };
}

export async function saveOrganizerPromos(input: {
  activityId: string;
  promos: DraftPromoCode[];
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const activityResult = await loadOrganizerActivity(supabase, input.activityId, user.id);
  if (!activityResult.ok) return activityResult;

  const draft: ActivityDraft = {
    ...createDefaultActivityDraft(activityResult.activity.type),
    type: activityResult.activity.type,
    isPaid: activityResult.activity.requirePayment,
    promoCodes: input.promos,
  };

  const result = await syncActivityPromoCodes(supabase, input.activityId, draft);
  if (!result.ok) return result;

  revalidatePath(`/calendar/${input.activityId}`);
  return { ok: true };
}
