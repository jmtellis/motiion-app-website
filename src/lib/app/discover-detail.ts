import "server-only";

import { fetchHomeCollections } from "@/lib/app/home-discovery";
import {
  loadCommunityRoster,
  type HomeRosterPerson,
} from "@/app/(app)/home/actions";

export {
  discoverDetailHref,
  resolveDiscoverBackHref,
} from "@/lib/app/discover-paths";

const SUBTYPES = ["dancer", "choreographer", "instructor"] as const;
type CommunitySubtype = (typeof SUBTYPES)[number];

export type DiscoverCollectionDetail = {
  id: string;
  title: string;
  eyebrow: string | null;
  people: HomeRosterPerson[];
  error: string | null;
};

function isSubtype(value: string): value is CommunitySubtype {
  return (SUBTYPES as readonly string[]).includes(value);
}

function collectionTitle(headline: string, subtype: CommunitySubtype | null) {
  const title = headline.trim();
  if (/^featured\b/i.test(title)) return title;
  if (subtype === "dancer" || /\bdancers?\b/i.test(title)) return "Featured Dancers";
  if (subtype === "choreographer" || /\bchoreographers?\b/i.test(title)) return "Featured Choreographers";
  if (subtype === "instructor" || /\binstructors?\b/i.test(title)) return "Featured Instructors";
  return title || "Featured talent";
}

export async function loadDiscoverCollection(id: string): Promise<DiscoverCollectionDetail> {
  const key = id.trim();
  if (!key) {
    return { id: "", title: "Featured talent", eyebrow: null, people: [], error: "Collection not found." };
  }

  if (isSubtype(key)) {
    const result = await loadCommunityRoster({ talentIds: [], subtype: key });
    return {
      id: key,
      title: collectionTitle("", key),
      eyebrow: "Find your community",
      people: result.people,
      error: result.error,
    };
  }

  const collections = await fetchHomeCollections();
  const row = collections.find((item) => item.id === key);
  if (!row) {
    return { id: key, title: "Featured talent", eyebrow: null, people: [], error: "This list could not be opened." };
  }

  const result = await loadCommunityRoster({ talentIds: row.talent_ids, subtype: null });
  return {
    id: row.id,
    title: collectionTitle(row.headline, null),
    eyebrow: row.eyebrow,
    people: result.people,
    error: result.error,
  };
}
