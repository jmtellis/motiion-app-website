import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicActivity } from "@/types/public";

/** Private calendar destinations use the viewer's RLS session, never the public catalog's service identity. */
export async function fetchMemberActivity(id: string): Promise<PublicActivity | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase || !(await supabase.auth.getUser()).data.user) return null;
  const { data: row, error } = await supabase.from("activities")
    .select("id,type,title,description,cover_image_url,location,activity_date,start_time,end_date,end_time,max_attendees,require_payment,status,is_private,price_amount_cents,price_currency")
    .eq("id", id).eq("is_private", true).maybeSingle();
  if (error || !row || !["class", "session", "event"].includes(row.type)) return null;
  const { data: days } = await supabase.from("activity_event_days")
    .select("id,day_date,start_time,end_time").eq("activity_id", id).order("day_date");
  return {
    id: row.id, title: row.title, kind: row.type as PublicActivity["kind"], description: row.description,
    coverImageURL: row.cover_image_url, location: row.location, activityDate: row.activity_date,
    startTime: row.start_time, endDate: row.end_date, endTime: row.end_time,
    maxAttendees: row.max_attendees, spotsRemaining: null, requirePayment: row.require_payment,
    priceAmountCents: row.price_amount_cents, priceCurrency: row.price_currency, pricingTiers: null,
    organizerDisplayName: null, organizerHeadshotURL: null, isEligibleForBooking: false, privateAccess: true,
    eventDays: (days ?? []).map((day) => ({ id: day.id, dayDate: day.day_date, label: null, startTime: day.start_time, endTime: day.end_time, maxAttendees: null, spotsRemaining: null })),
  };
}
