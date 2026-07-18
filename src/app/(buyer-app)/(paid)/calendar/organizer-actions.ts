"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  loadOrganizerActivity,
  loadOrganizerRevenue,
  loadOrganizerRoster,
  parseProfileQrPayload,
  type OrganizerActivityDetail,
} from "@/lib/talent-buyers/activities/organizer-data";
import type {
  OrganizerAttendee,
  OrganizerRevenueSummary,
} from "@/lib/talent-buyers/activities/types";

export type OrganizerPageData = {
  activity: OrganizerActivityDetail;
  attendees: OrganizerAttendee[];
  revenue: OrganizerRevenueSummary;
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

  const [attendees, revenue] = await Promise.all([
    loadOrganizerRoster(supabase, activityId, eventDayId),
    loadOrganizerRevenue(supabase, activityId),
  ]);

  return {
    ok: true,
    data: {
      activity: activityResult.activity,
      attendees,
      revenue,
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
