import { TalentScheduleCalendar } from "@/components/talent/TalentScheduleCalendar";
import {
  fetchTalentCalendarEvents,
  type TalentScheduleFilter,
} from "@/lib/app/schedule";
import { requireCommunityOrTalentAccount } from "@/lib/auth/session";

const FILTERS = new Set<TalentScheduleFilter>(["all", "classes", "sessions", "events"]);

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireCommunityOrTalentAccount();
  const params = await searchParams;
  const rawFilter = typeof params.filter === "string" ? params.filter : "all";
  const filter = FILTERS.has(rawFilter as TalentScheduleFilter)
    ? (rawFilter as TalentScheduleFilter)
    : "all";
  const { events, error } = await fetchTalentCalendarEvents(profile.id);

  return <TalentScheduleCalendar key={profile.id} events={events} error={error} filter={filter} />;
}
