"use client";

import { useMemo } from "react";

import {
  MAX_PEEKING,
  RosterStackTile,
  type RosterStackPerson,
} from "@/components/talent-buyers/project/composable/RosterStackTile";
import { collectionStackTransitionName } from "@/components/talent-buyers/project/composable/view-transition";
import type { LibraryCollectionSummary } from "@/lib/talent-buyers/library";
import { formatRelativeUpdated } from "@/lib/talent-buyers/relative-time";

import { OverflowMenu } from "./OverflowMenu";

/** Preview avatars carry no names, so faceless members peek as the roster's initial. */
export function collectionStackPeople(collection: LibraryCollectionSummary): RosterStackPerson[] {
  const peeking = Math.min(MAX_PEEKING, collection.talentCount);
  return Array.from({ length: peeking }, (_, index) => ({
    id: `${collection.id}-${index}`,
    name: collection.name,
    avatarUrl: collection.previewAvatars[index] ?? null,
  }));
}

export function collectionTileSublabel(collection: LibraryCollectionSummary, now?: number) {
  const count = collection.talentCount === 1 ? "1 person" : `${collection.talentCount} people`;
  const updated = formatRelativeUpdated(collection.updatedAt, now);
  return updated ? `${count} · ${updated}` : count;
}

export function CollectionCard({
  collection,
  onRename,
  onEditDescription,
  onDuplicate,
  onDelete,
}: {
  collection: LibraryCollectionSummary;
  onRename: () => void;
  onEditDescription: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const people = useMemo(() => collectionStackPeople(collection), [collection]);

  return (
    <RosterStackTile
      size="fluid"
      people={people}
      label={collection.name}
      sublabel={collectionTileSublabel(collection)}
      href={`/library/${collection.id}`}
      transitionName={collectionStackTransitionName(collection.id)}
      menu={
        <OverflowMenu
          label={`Actions for ${collection.name}`}
          items={[
            { label: "Rename", onSelect: onRename },
            { label: "Edit description", onSelect: onEditDescription },
            { label: "Duplicate", onSelect: onDuplicate },
            { label: "Delete", onSelect: onDelete, danger: true },
          ]}
        />
      }
    />
  );
}
