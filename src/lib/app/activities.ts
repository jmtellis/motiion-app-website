"use server";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { callSupabaseFunctionAsUser } from "@/lib/supabaseRest";
import { activityRegistrationError, isActiveEnrollment, normalizeActivityCheckoutSelection, type ActivityCheckoutSelection } from "@/lib/app/activity-enrollment";

function refreshActivity(activityId: string) {
  for (const path of ["/home", "/dashboard", "/schedule", "/events", "/classes", "/inbox", "/messages", `/activity/${activityId}`, `/class/${activityId}`, `/event/${activityId}`]) revalidatePath(path);
}

export type ActivityAdmissionDay = { id: string; date: string; label: string | null; startTime: string | null; endTime: string | null };

export async function activityViewerState(activityId: string) {
  const supabase = await createServerSupabaseClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) return { accountId: null as string | null, signedIn: false, saved: false, enrollmentStatus: null as string | null, refundRequested: false, ticketLabel: null as string | null, admittedDays: [] as ActivityAdmissionDay[], admissionError: null as string | null, sessionStatus: null as string | null, error: null as string | null };
  const [saved, session, enrollment] = await Promise.all([
    supabase.from("activity_calendar_items").select("id").eq("user_id", user.id).eq("activity_id", activityId).maybeSingle(),
    supabase.from("session_join_requests").select("status").eq("requester_id", user.id).eq("activity_id", activityId).maybeSingle(),
    supabase.from("enrollments").select("id,status,refund_requested_at,ticket_option_id").eq("student_id", user.id).eq("activity_id", activityId).maybeSingle(),
  ]);
  let ticketLabel: string | null = null;
  let admittedDays: ActivityAdmissionDay[] = [];
  let admissionError: string | null = null;
  if (enrollment.data && isActiveEnrollment(enrollment.data.status)) {
    const [ticket, days] = await Promise.all([
      enrollment.data.ticket_option_id ? supabase.from("activity_ticket_options").select("label").eq("id", enrollment.data.ticket_option_id).eq("activity_id", activityId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      supabase.from("enrollment_event_day_entitlements").select("activity_event_days(id,activity_id,day_date,label,start_time,end_time)").eq("enrollment_id", enrollment.data.id).eq("status", "active"),
    ]);
    ticketLabel = ticket.data?.label ?? null;
    admittedDays = (days.data ?? []).flatMap((row) => {
      const day = Array.isArray(row.activity_event_days) ? row.activity_event_days[0] : row.activity_event_days;
      return day && day.activity_id === activityId ? [{ id: day.id, date: day.day_date, label: day.label, startTime: day.start_time, endTime: day.end_time }] : [];
    }).sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
    if (ticket.error || days.error) admissionError = "Your ticket details could not be loaded. Refresh to check your admitted dates.";
  }
  return { accountId: user.id, signedIn: true, saved: Boolean(saved.data), sessionStatus: session.data?.status ?? null,
    enrollmentStatus: enrollment.data?.status ?? null, refundRequested: Boolean(enrollment.data?.refund_requested_at), ticketLabel, admittedDays, admissionError,
    error: saved.error || session.error || enrollment.error ? "Your activity status could not be refreshed. Please retry." : null };
}

export type RegisterActivityResult =
  | { ok: true; enrolled: true; activityTitle: string }
  | { ok: true; checkoutUrl: string; sessionId: string }
  | { ok: false; error: string; signIn?: boolean };

/** Uses the current account, never an email supplied by a form or a service-role admission. */
export async function registerForActivity(activityId: string, selection: ActivityCheckoutSelection): Promise<RegisterActivityResult> {
  if (!/^[\da-f-]{36}$/i.test(activityId)) return { ok: false, error: "Invalid activity." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Activity registration is unavailable. Please retry." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, signIn: true, error: "Sign in to continue your reservation." };
  try {
    const [activity, enrollment] = await Promise.all([
      supabase.from("activities").select("id,type,title,status,require_payment").eq("id", activityId).maybeSingle(),
      supabase.from("enrollments").select("status").eq("activity_id", activityId).eq("student_id", user.id).maybeSingle(),
    ]);
    if (activity.error || enrollment.error) return { ok: false, error: "Couldn't check registration. Please retry." };
    if (!activity.data || !["class", "event"].includes(activity.data.type)) return { ok: false, error: "This activity is unavailable to your account." };
    if (isActiveEnrollment(enrollment.data?.status)) return { ok: true, enrolled: true, activityTitle: activity.data.title };
    if (activity.data.status !== "active") return { ok: false, error: "Registration for this activity is closed." };
    if (!activity.data.require_payment) {
      const { data, error } = await supabase.rpc("reserve_free_activity", { p_activity_id: activityId });
      if (error || data?.ok !== true) return { ok: false, error: error?.code === "PGRST202"
        ? "Free registration is temporarily unavailable. Please try again shortly."
        : activityRegistrationError(error?.message ?? data?.error ?? "Registration was not confirmed. Please retry.") };
      refreshActivity(activityId);
      return { ok: true, enrolled: true, activityTitle: activity.data.title };
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, signIn: true, error: "Your session expired. Sign in to continue." };
    const clean = normalizeActivityCheckoutSelection(selection);
    const checkout = await callSupabaseFunctionAsUser<{ checkoutUrl: string; sessionId: string }>("payments-create-checkout-session", {
      classId: activityId,
      ...(clean.ticketOptionId ? { ticketOptionId: clean.ticketOptionId, pricingTierId: clean.ticketOptionId } : {}),
      ...(clean.selectedEventDayIds?.length ? { selectedEventDayIds: clean.selectedEventDayIds } : {}),
      ...(clean.promoCode ? { promoCode: clean.promoCode } : {}),
    }, session.access_token);
    const url = new URL(checkout.checkoutUrl);
    if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com" || !checkout.sessionId) throw new Error("The payment provider did not return a valid checkout. Please retry.");
    return { ok: true, ...checkout };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't reach registration. Check your connection and retry." };
  }
}

export async function cancelActivityReservation(activityId: string): Promise<{ ok: true; cancelled: boolean; message: string } | { ok: false; error: string }> {
  if (!/^[\da-f-]{36}$/i.test(activityId)) return { ok: false, error: "Invalid activity." };
  const supabase = await createServerSupabaseClient();
  if (!supabase || !(await supabase.auth.getUser()).data.user) return { ok: false, error: "Sign in again before changing your reservation." };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: "Your session expired. Sign in and retry." };
  try {
    const result = await callSupabaseFunctionAsUser<{ success?: boolean; outcome?: string }>("payments-student-cancel-class", { activityId }, session.access_token);
    if (!result.success || !["guest_cancelled", "refunded", "cancelled_no_refund", "refund_pending"].includes(result.outcome ?? "")) return { ok: false, error: "Your cancellation was not confirmed. Refresh the activity before retrying." };
    refreshActivity(activityId);
    return { ok: true, cancelled: result.outcome !== "refund_pending", message: result.outcome === "refund_pending" ? "Your refund is processing. Your reservation stays active until the payment provider confirms the refund. Refresh the activity for its latest status." : result.outcome === "refunded" ? "Your reservation is canceled and a full refund has been issued to the original payment method. Your bank may take several days to show it."
      : result.outcome === "cancelled_no_refund" ? "Your reservation is canceled. No refund was issued because the cancellation was within 24 hours of the scheduled start."
        : "Your reservation is canceled and your place has been released." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't cancel your reservation. Please retry." };
  }
}

export async function setActivityCalendarSaved(activityId: string, saved: boolean): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) return { ok: false, error: "Sign in to save this activity to your calendar." };
  if (saved) {
    const visible = await supabase.from("activities").select("id").eq("id", activityId).eq("status", "active").maybeSingle();
    if (visible.error || !visible.data) return { ok: false, error: "This activity is no longer available in this environment." };
  }
  const result = saved
    ? await supabase.from("activity_calendar_items").upsert({ user_id: user.id, activity_id: activityId }, { onConflict: "user_id,activity_id" })
    : await supabase.from("activity_calendar_items").delete().eq("user_id", user.id).eq("activity_id", activityId);
  if (result.error) return { ok: false, error: "Couldn't update your calendar. Please retry." };
  refreshActivity(activityId);
  return { ok: true };
}

type SessionJoinResponse = {
  ok?: boolean;
  status?: string;
  message?: string;
  error?: string;
};

export type RequestSessionJoinResult =
  | { ok: true; status: string }
  | { ok: false; reason: "unauthenticated" }
  | { ok: false; reason: "error"; error: string };

/** RSVP to a session via the shared iOS `request_session_join` RPC. */
export async function requestSessionJoin(activityId: string): Promise<RequestSessionJoinResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, reason: "error", error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data, error } = await supabase.rpc("request_session_join", {
    p_activity_id: activityId,
  });

  if (error) {
    return { ok: false, reason: "error", error: error.message };
  }

  const response = (data ?? {}) as SessionJoinResponse;
  if (!data || response.error || response.ok === false) {
    return { ok: false, reason: "error", error: response.message ?? response.error ?? "Your request was not confirmed. Please retry." };
  }

  await trackServerEvent("rsvp_submitted", {
    activity_id: activityId,
    activity_type: "session",
    status: response.status ?? "requested",
  });

  refreshActivity(activityId);
  return { ok: true, status: response.status ?? "requested" };
}
