import type { LibraryCollectionSummary } from "@/lib/talent-buyers/library";
import { formatRelativeUpdated } from "@/lib/talent-buyers/relative-time";

export type RosterStackPerson = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

/** Front card plus two peeks; the stack CSS reserves room for exactly this many. */
export const MAX_PEEKING = 3;

/** Screen-reader copy: "{Group}, {N} people, {time}. Opens full roster." */
export function rosterStackTileAccessibleLabel(label: string, sublabel?: string | null) {
  const detail = sublabel?.split(" · ").map((part) => part.trim()).filter(Boolean) ?? [];
  return `${[label, ...detail].join(", ")}. Opens full roster.`;
}

/** Preview avatars carry no names, so faceless members peek as the roster's initial. */
/** Spotify-style cover: the first four people on the roster, photos or not. */
export const MOSAIC_COUNT = 4;

export function collectionMosaicPeople(
  collection: Pick<LibraryCollectionSummary, "id" | "name" | "previewAvatars"> & {
    previewPeople?: LibraryCollectionSummary["previewPeople"];
  },
): RosterStackPerson[] {
  if (collection.previewPeople?.length) {
    return collection.previewPeople.slice(0, MOSAIC_COUNT).map((person, index) => ({
      id: `${collection.id}-${index}`,
      name: person.name || collection.name,
      avatarUrl: person.avatarUrl,
    }));
  }
  return collection.previewAvatars.slice(0, MOSAIC_COUNT).map((avatarUrl, index) => ({
    id: `${collection.id}-${index}`,
    name: collection.name,
    avatarUrl,
  }));
}

export function collectionStackPeople(
  collection: Pick<LibraryCollectionSummary, "id" | "name" | "talentCount" | "previewAvatars">,
): RosterStackPerson[] {
  const peeking = Math.min(MAX_PEEKING, collection.talentCount);
  return Array.from({ length: peeking }, (_, index) => ({
    id: `${collection.id}-${index}`,
    name: collection.name,
    avatarUrl: collection.previewAvatars[index] ?? null,
  }));
}

export function collectionTileSublabel(
  collection: Pick<LibraryCollectionSummary, "talentCount" | "updatedAt">,
  now?: number,
) {
  const count = collection.talentCount === 1 ? "1 person" : `${collection.talentCount} people`;
  const updated = formatRelativeUpdated(collection.updatedAt, now);
  return updated ? `${count} · ${updated}` : count;
}
