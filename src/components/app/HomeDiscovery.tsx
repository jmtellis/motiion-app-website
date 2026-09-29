import { fetchHomeCollections, fetchHomeEvents } from "@/lib/app/home-discovery";

import { HomeDiscoveryView, type HomeCommunityCard } from "@/components/app/HomeDiscoveryView";

export async function HomeDiscovery({
  navigatorHref = "/discover",
}: {
  navigatorHref?: string;
} = {}) {
  const [collections, events] = await Promise.all([fetchHomeCollections(), fetchHomeEvents()]);
  const cards: HomeCommunityCard[] = collections.length
    ? collections.slice(0, 3).map((row) => ({
        id: row.id,
        title: row.headline,
        eyebrow: row.eyebrow ?? "Featured",
        image: row.image_url,
        talentIds: row.talent_ids,
        subtype: null,
      }))
    : [
        { id: "dancer", title: "Discover dancers", eyebrow: "Find your community", image: null, talentIds: [], subtype: "dancer" },
        { id: "choreographer", title: "Meet choreographers", eyebrow: "Explore creative voices", image: null, talentIds: [], subtype: "choreographer" },
        { id: "instructor", title: "Find instructors", eyebrow: "Keep growing", image: null, talentIds: [], subtype: "instructor" },
      ];

  return (
    <HomeDiscoveryView
      cards={cards}
      sponsored={events.sponsored}
      cast={events.cast}
      navigatorHref={navigatorHref}
    />
  );
}
