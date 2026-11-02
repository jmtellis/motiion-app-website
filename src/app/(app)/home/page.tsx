import { CommunityFavorites } from "@/components/app/CommunityFavorites";
import { loadCommunityFavorites } from "@/lib/app/community";
import { isCommunityAccount } from "@/lib/auth/profile";
import { HomeUpcomingActivities } from "@/components/app/HomeUpcomingActivities";
import { fetchTalentCalendarEvents } from "@/lib/app/schedule";

import { HomeDiscovery } from "@/components/app/HomeDiscovery";
import { HomeFeed } from "@/components/app/HomeFeed";
import { HomeListings } from "@/components/app/HomeListings";
import { fetchUpcomingClassesAndSessions } from "@/lib/app/home-opportunities";
import { requireCommunityOrTalentAccount } from "@/lib/auth/session";

export default async function HomePage() {
  const profile = await requireCommunityOrTalentAccount();
  const [activities, calendar, community] = await Promise.all([
    fetchUpcomingClassesAndSessions(),
    fetchTalentCalendarEvents(profile.id),
    isCommunityAccount(profile.accountType) ? loadCommunityFavorites() : Promise.resolve(null),
  ]);
  const firstName = profile.fullName.split(" ")[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? `Good morning, ${firstName}` : hour < 18 ? `Good afternoon, ${firstName}` : `Good evening, ${firstName}`;

  return (
    <HomeFeed
      greeting={greeting}
      discoverySlot={<HomeDiscovery upcomingSlot={<HomeUpcomingActivities events={calendar.events} error={calendar.error} />} />}
      listingsSlot={<>{community ? <CommunityFavorites key={profile.id} initial={community} /> : null}<HomeListings activities={activities.activities} error={activities.error} /></>}
    />
  );
}
