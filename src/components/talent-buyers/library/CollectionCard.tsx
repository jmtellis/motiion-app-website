"use client";

import Link from "next/link";

import type { LibraryCollectionSummary } from "@/lib/talent-buyers/library";

import { CollectionPreviewCollage } from "./CollectionPreviewCollage";
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
  const countLabel =
    collection.talentCount === 1 ? "1 person" : `${collection.talentCount} people`;

  return (
    <Link
      href={`/library/${collection.id}`}
      className="library-collection-card"
      aria-label={`${collection.name}, ${countLabel}`}
    >
      <div className="library-collection-card__menu">
        <OverflowMenu
          label={`Actions for ${collection.name}`}
          items={[
            { label: "Rename", onSelect: onRename },
            { label: "Edit description", onSelect: onEditDescription },
            { label: "Duplicate", onSelect: onDuplicate },
            { label: "Delete", onSelect: onDelete, danger: true },
          ]}
        />
      </div>
      <div className="library-collection-card__body">
        <CollectionPreviewCollage
          avatars={collection.previewAvatars}
          totalCount={collection.talentCount}
          name={collection.name}
        />
        <div className="library-collection-card__meta">
          <h3 className="library-collection-card__name">{collection.name}</h3>
          <p className="library-collection-card__count">{countLabel}</p>
          {collection.description ? (
            <p className="library-collection-card__description">{collection.description}</p>
          ) : null}
        </div>
        {collection.talentCount === 0 ? (
          <span className="text-xs font-medium text-[var(--accent)]">Add talent</span>
        ) : null}
      </div>
    </Link>
  );
}
