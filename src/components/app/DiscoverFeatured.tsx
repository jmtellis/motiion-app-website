import { HomeDiscovery } from "@/components/app/HomeDiscovery";
import { HomeListings } from "@/components/app/HomeListings";
import { LaunchEventBanner } from "@/components/app/LaunchEventBanner";
import { fetchUpcomingClassesAndSessions } from "@/lib/app/home-opportunities";

async function FeaturedListings() {
  const { activities, error } = await fetchUpcomingClassesAndSessions();
  return <HomeListings activities={activities} error={error} />;
}

/** Discover's Featured tab: the former Home feed without personal schedule. */
export function DiscoverFeatured({ listings = false }: { listings?: boolean }) {
  return (
    <div className="talent-home talent-home--featured">
      <HomeDiscovery navigatorHref={null} upcomingSlot={<LaunchEventBanner />} />
      {listings ? <FeaturedListings /> : null}
    </div>
  );
}
