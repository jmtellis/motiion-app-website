import { supabaseAdmin } from "./supabase-admin.ts";
import {
  createEnrollmentDayEntitlements,
  fetchEventDays,
  fetchTicketOptionDayIds,
  fetchTicketOptions,
  normalizeUuidList,
} from "./event-ticketing.ts";
import { recordPromoRedemption } from "./activity-promo.ts";

export async function syncRemainingSpots(activityId: string) {
  const { data: activity, error: activityError } = await supabaseAdmin
    .from("activities")
    .select("id,max_attendees")
    .eq("id", activityId)
    .single<{ id: string; max_attendees: number | null }>();

  if (activityError || !activity) {
    console.error("payment-sync syncRemainingSpots activity lookup failed", {
      activityId,
      activityError,
    });
    return;
  }

  if (activity.max_attendees === null) return;

  const { count: paidCount, error: countError } = await supabaseAdmin
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("activity_id", activityId)
    .in("status", ["paid", "guest", "comped"]);

  if (countError) {
    console.error("payment-sync syncRemainingSpots enrollment count failed", {
      activityId,
      countError,
    });
    return;
  }

  const remaining = Math.max(activity.max_attendees - (paidCount ?? 0), 0);
  const { error: updateError } = await supabaseAdmin
    .from("activities")
    .update({ spots_remaining: remaining })
    .eq("id", activityId);

  if (updateError) {
    console.error("payment-sync syncRemainingSpots activity update failed", {
      activityId,
      updateError,
    });
  }

  const { data: eventDays, error: eventDaysError } = await supabaseAdmin
    .from("activity_event_days")
    .select("id")
    .eq("activity_id", activityId);

  if (eventDaysError) {
    console.error("payment-sync syncRemainingSpots event days lookup failed", {
      activityId,
      eventDaysError,
    });
  } else {
    for (const day of eventDays ?? []) {
      const { error: syncDayError } = await supabaseAdmin.rpc("sync_event_day_spots_remaining", {
        p_event_day_id: day.id,
      });
      if (syncDayError) {
        console.error("payment-sync sync_event_day_spots_remaining failed", {
          activityId,
          eventDayId: day.id,
          syncDayError,
        });
      }
    }
  }

  const { error: offerError } = await supabaseAdmin.rpc("offer_next_activity_waitlist_spot", {
    p_activity_id: activityId,
  });
  if (offerError) {
    console.error("payment-sync syncRemainingSpots waitlist offer failed", {
      activityId,
      offerError,
    });
  }
}

type MarkPaidArgs = {
  activityId: string;
  studentId: string;
  sessionId: string;
  paymentIntentId: string | null;
  pricingTierId?: string | null;
};

export async function markCheckoutPaidAndSync(args: MarkPaidArgs) {
  const nowIso = new Date().toISOString();
  const { activityId, studentId, sessionId, paymentIntentId, pricingTierId } = args;

  const { data: sessionRow, error: sessionRowError } = await supabaseAdmin
    .from("stripe_checkout_sessions")
    .select("created_at,ticket_option_id,selected_event_day_ids,promo_code_id,promo_discount_cents")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle<{
      created_at: string;
      ticket_option_id: string | null;
      selected_event_day_ids: string[] | null;
      promo_code_id: string | null;
      promo_discount_cents: number | null;
    }>();

  if (sessionRowError) {
    console.error("payment-sync failed to load checkout session row", {
      sessionId,
      sessionRowError,
    });
    return { success: false as const, reason: "session_lookup_failed" as const };
  }

  const { data: existingEnrollment } = await supabaseAdmin
    .from("enrollments")
    .select("status,updated_at")
    .eq("activity_id", activityId)
    .eq("student_id", studentId)
    .maybeSingle<{ status: string; updated_at: string }>();

  let skipEnrollmentPaid = false;
  if (sessionRow && existingEnrollment) {
    const st = existingEnrollment.status.trim().toLowerCase();
    if (st === "cancelled" || st === "refunded") {
      const enrUpdated = new Date(existingEnrollment.updated_at).getTime();
      const sessCreated = new Date(sessionRow.created_at).getTime();
      // Student left after this checkout session was created (e.g. cancelled attendance).
      // Do not resurrect `paid` from a stale webhook / reconcile — they must complete a new checkout.
      if (enrUpdated > sessCreated) {
        skipEnrollmentPaid = true;
      }
    }
  }

  const { error: updateSessionError } = await supabaseAdmin
    .from("stripe_checkout_sessions")
    .update({
      status: "succeeded",
      stripe_payment_intent_id: paymentIntentId,
      updated_at: nowIso,
    })
    .eq("stripe_checkout_session_id", sessionId);

  if (updateSessionError) {
    console.error("payment-sync failed to update stripe_checkout_sessions", {
      sessionId,
      activityId,
      studentId,
      updateSessionError,
    });
    return { success: false as const, reason: "session_update_failed" as const };
  }

  if (skipEnrollmentPaid) {
    await syncRemainingSpots(activityId);
    return {
      success: true as const,
      skippedEnrollmentAfterCancellation: true as const,
    };
  }

  const sessionTicketOptionId = sessionRow?.ticket_option_id?.trim() ?? "";
  const resolvedTicketOptionId = sessionTicketOptionId.length > 0
    ? sessionTicketOptionId
    : (typeof pricingTierId === "string" ? pricingTierId.trim() : "");

  const enrollmentRow: Record<string, unknown> = {
    activity_id: activityId,
    student_id: studentId,
    status: "paid",
    updated_at: nowIso,
  };
  if (resolvedTicketOptionId.length > 0) {
    enrollmentRow.pricing_tier_id = resolvedTicketOptionId;
    enrollmentRow.ticket_option_id = resolvedTicketOptionId;
  }

  const { error: upsertEnrollmentError } = await supabaseAdmin
    .from("enrollments")
    .upsert(enrollmentRow, {
      onConflict: "activity_id,student_id",
    });

  if (upsertEnrollmentError) {
    console.error("payment-sync failed to upsert enrollment", {
      sessionId,
      activityId,
      studentId,
      upsertEnrollmentError,
    });
    return { success: false as const, reason: "enrollment_upsert_failed" as const };
  }

  const { error: markWaitlistError } = await supabaseAdmin.rpc("mark_activity_waitlist_promoted", {
    p_activity_id: activityId,
    p_user_id: studentId,
  });
  if (markWaitlistError) {
    console.error("payment-sync failed to mark waitlist entry promoted", {
      activityId,
      studentId,
      markWaitlistError,
    });
  }

  let entitlementDayIds = normalizeUuidList(sessionRow?.selected_event_day_ids);
  if (entitlementDayIds.length === 0 && resolvedTicketOptionId.length > 0) {
    const ticketOptions = await fetchTicketOptions(activityId);
    const option = ticketOptions.find((o) => o.id === resolvedTicketOptionId);
    if (option) {
      const eventDays = await fetchEventDays(activityId);
      if (option.access_mode === "all_days") {
        entitlementDayIds = eventDays.map((d) => d.id);
      } else if (option.access_mode === "fixed_days") {
        entitlementDayIds = await fetchTicketOptionDayIds(option.id);
      }
    }
  }

  if (entitlementDayIds.length > 0) {
    await createEnrollmentDayEntitlements({
      activityId,
      studentId,
      dayIds: entitlementDayIds,
      source: "purchase",
    });
  }

  if (sessionRow?.promo_code_id) {
    const { data: enrollment } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("activity_id", activityId)
      .eq("student_id", studentId)
      .maybeSingle<{ id: string }>();

    await recordPromoRedemption({
      promoCodeId: sessionRow.promo_code_id,
      activityId,
      studentId,
      sessionId,
      discountCents: sessionRow.promo_discount_cents ?? 0,
      enrollmentId: enrollment?.id ?? null,
    });
  }

  await syncRemainingSpots(activityId);
  return { success: true as const };
}
