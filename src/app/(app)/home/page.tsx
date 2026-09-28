import { HomeDiscovery } from "@/components/app/HomeDiscovery";
import { HomeFeed } from "@/components/app/HomeFeed";
import { HomeListings } from "@/components/app/HomeListings";
import { fetchUpcomingClassesAndSessions } from "@/lib/app/home-opportunities";
import { requireTalentAccount } from "@/lib/auth/session";

export default async function HomePage() {
  const profile = await requireTalentAccount();
  const activities = await fetchUpcomingClassesAndSessions();
  const firstName = profile.fullName.split(" ")[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? `Good morning, ${firstName}` : hour < 18 ? `Good afternoon, ${firstName}` : `Good evening, ${firstName}`;

  return (
    <HomeFeed
      greeting={greeting}
      discoverySlot={<HomeDiscovery />}
      listingsSlot={<HomeListings activities={activities} />}
    />
  );
}
