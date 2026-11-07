import { Suspense } from "react";

import { HomeDiscovery } from "@/components/app/HomeDiscovery";
import { HomeListings } from "@/components/app/HomeListings";
import { LaunchEventBanner } from "@/components/app/LaunchEventBanner";
import {
  DiscoverFeaturedFeedSkeleton,
  DiscoverListingsSkeleton,
} from "@/components/app/DiscoverSkeletons";
import { discoverDetailHref } from "@/lib/app/discover-paths";
import { fetchUpcomingClassesAndSessions } from "@/lib/app/home-opportunities";

async function FeaturedListings({ from }: { from: string }) {
  const { activities, error } = await fetchUpcomingClassesAndSessions();
  return (
    <div className="discover-skel-enter">
      <HomeListings
        activities={activities}
        error={error}
        classesHref={discoverDetailHref("/discover", "classes", undefined, from)}
      />
    </div>
  );
}

/** Discover's Featured tab: the former Home feed without personal schedule. */
export function DiscoverFeatured({
  listings = false,
  detailBasePath = "/discover",
  from = "discover",
}: {
  listings?: boolean;
  detailBasePath?: "/discover" | "/talent";
  from?: string;
}) {
  return (
    <div className="talent-home talent-home--featured">
      <Suspense fallback={<DiscoverFeaturedFeedSkeleton />}>
        <HomeDiscovery
          navigatorHref={null}
          upcomingSlot={<LaunchEventBanner />}
          detailBasePath={detailBasePath}
          from={from}
        />
      </Suspense>
      {listings ? (
        <Suspense fallback={<DiscoverListingsSkeleton />}>
          <FeaturedListings from={from} />
        </Suspense>
      ) : null}
    </div>
  );
}
