import { currentBlockedUsers } from "@/lib/app/blocked-visibility";
import { allowsUser } from "@/lib/app/blocked-visibility-model";
import type { ReactNode } from "react";
import {
  fetchHomeCollections,
  fetchHomeEvents,
  fetchHomeCampaigns,
} from "@/lib/app/home-discovery";

import {
  HomeDiscoveryView,
  type HomeCommunityCard,
} from "@/components/app/HomeDiscoveryView";

export async function HomeDiscovery({
  upcomingSlot,
  navigatorHref = "/discover",
}: {
  navigatorHref?: string;
  upcomingSlot?: ReactNode;
} = {}) {
  const [rawCollections, rawEvents, campaigns, blocked] = await Promise.all([
    fetchHomeCollections(),
    fetchHomeEvents(),
    fetchHomeCampaigns(),
    currentBlockedUsers(),
  ]);
  if (blocked.error) return <div className="ui-notice" data-tone="error" role="alert">{blocked.error}</div>;
  const collections = rawCollections.map(row => ({ ...row, talent_ids: row.talent_ids.filter(id => allowsUser(id, blocked.ids)), image_url: row.talent_ids.some(id => !allowsUser(id, blocked.ids)) ? null : row.image_url })).filter(row => row.talent_ids.length);
  const visibleEvents = (rows: typeof rawEvents.cast) => rows.filter(row => allowsUser(row.creator_id, blocked.ids)).map(row => ({ ...row, people: row.people.filter(person => allowsUser(person.userId, blocked.ids)) }));
  const events = { sponsored: visibleEvents(rawEvents.sponsored), cast: visibleEvents(rawEvents.cast) };
  const cards: HomeCommunityCard[] = collections.length
    ? collections.map((row) => ({
        id: row.id,
        title: row.headline,
        eyebrow: row.eyebrow ?? "Featured",
        image: row.image_url,
        talentIds: row.talent_ids,
        subtype: null,
      }))
    : [
        {
          id: "dancer",
          title: "Discover dancers",
          eyebrow: "Find your community",
          image: null,
          talentIds: [],
          subtype: "dancer",
        },
        {
          id: "choreographer",
          title: "Meet choreographers",
          eyebrow: "Explore creative voices",
          image: null,
          talentIds: [],
          subtype: "choreographer",
        },
        {
          id: "instructor",
          title: "Find instructors",
          eyebrow: "Keep growing",
          image: null,
          talentIds: [],
          subtype: "instructor",
        },
      ];

  return (
    <HomeDiscoveryView
      upcomingSlot={upcomingSlot}
      campaigns={campaigns}
      cards={cards}
      sponsored={events.sponsored}
      cast={events.cast}
      navigatorHref={navigatorHref}
    />
  );
}
