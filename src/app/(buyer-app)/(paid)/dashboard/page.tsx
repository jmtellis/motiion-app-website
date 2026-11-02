import { HomeUpcomingActivities } from "@/components/app/HomeUpcomingActivities";
import { fetchTalentCalendarEvents } from "@/lib/app/schedule";
import { HomeDiscovery } from "@/components/app/HomeDiscovery";
import { HomeListings } from "@/components/app/HomeListings";
import { fetchUpcomingClassesAndSessions } from "@/lib/app/home-opportunities";
import { HomeFeed } from "@/components/app/HomeFeed";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerHomePage() {
  const profile = await requireHiringAccount();
  const [activities, calendar] = await Promise.all([fetchUpcomingClassesAndSessions(), fetchTalentCalendarEvents(profile.id)]);
  const firstName = profile.fullName.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? `Good morning, ${firstName}`
      : hour < 18
        ? `Good afternoon, ${firstName}`
        : `Good evening, ${firstName}`;

  return (
    <HomeFeed
      greeting={greeting}
      listingsSlot={<HomeListings activities={activities} />}
      discoverySlot={<HomeDiscovery navigatorHref="/talent" upcomingSlot={<HomeUpcomingActivities events={calendar} calendarHref="/events" />} />}
    />
  );
}
