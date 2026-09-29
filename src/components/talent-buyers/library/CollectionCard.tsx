"use client";

import { useMemo } from "react";

import { RosterStackTile } from "@/components/talent-buyers/project/composable/RosterStackTile";
import { collectionStackTransitionName } from "@/components/talent-buyers/project/composable/view-transition";
import type { LibraryCollectionSummary } from "@/lib/talent-buyers/library";
import { collectionMosaicPeople, collectionTileSublabel } from "@/lib/talent-buyers/roster-stack";

import { OverflowMenu } from "./OverflowMenu";

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
  const people = useMemo(() => collectionMosaicPeople(collection), [collection]);

  return (
    <RosterStackTile
      layout="mosaic"
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
