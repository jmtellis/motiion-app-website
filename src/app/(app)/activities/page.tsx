import { TalentActivitiesView, type ActivityType } from "@/components/app/TalentActivitiesView";
import { fetchTalentConfirmations } from "@/lib/app/talent-confirmations";
import { fetchTalentCalendarEvents } from "@/lib/app/schedule";
import { requireTalentAccount } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const TYPES: Record<string, ActivityType> = {
  class: "class", classes: "class", session: "session", sessions: "session",
  event: "event", events: "event", project: "project", projects: "project",
};

async function fetchHostedActivityIds(userId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data } = await supabase.from("activities").select("id").eq("creator_id", userId).eq("status", "active").limit(500);
  return (data ?? []).map((row) => row.id as string);
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireTalentAccount();
  const params = await searchParams;
  const rawType = typeof params.type === "string" ? params.type : typeof params.view === "string" ? params.view : "";
  const type = TYPES[rawType] ?? "all";
  const scope = params.scope === "history" ? "history" : "upcoming";
  const booking = typeof params.booking === "string" ? params.booking : null;
  const [calendar, confirmations, hostedIds] = await Promise.all([
    fetchTalentCalendarEvents(profile.id),
    fetchTalentConfirmations(),
    fetchHostedActivityIds(profile.id),
  ]);

  return (
    <TalentActivitiesView
      key={profile.id}
      events={calendar.events}
      error={calendar.error}
      hostedIds={hostedIds}
      confirmations={confirmations}
      scope={scope}
      type={type}
      initialBooking={booking}
    />
  );
}
