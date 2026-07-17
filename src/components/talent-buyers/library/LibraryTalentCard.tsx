"use client";

import Link from "next/link";

import type { LibraryTalent } from "@/lib/talent-buyers/library";

export function LibraryTalentCard({
  talent,
  selected,
  selectable,
  onToggleSelect,
  onRemove,
  savedIndicator,
}: {
  talent: LibraryTalent;
  selected?: boolean;
  selectable?: boolean;
  onToggleSelect?: () => void;
  onRemove?: () => void;
  savedIndicator?: boolean;
}) {
  const href = talent.slug ? `/talent/${talent.slug}` : `/talent/${talent.profileId}`;

  return (
    <div className={`library-talent-card ${selected ? "library-talent-card--selected" : ""}`}>
      {selectable ? (
        <input
          type="checkbox"
          className="library-talent-card__select"
          checked={Boolean(selected)}
          onChange={onToggleSelect}
          aria-label={`Select ${talent.name}`}
        />
      ) : null}
      <Link href={href} className="contents">
        <div className="library-talent-card__media">
          {talent.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={talent.avatarUrl} alt="" />
          ) : (
            <div className="library-talent-card__fallback">{talent.name.slice(0, 1).toUpperCase()}</div>
          )}
          <div className="library-talent-card__actions">
            <span className="library-talent-card__action">View profile</span>
            {onRemove ? (
              <button
                type="button"
                className="library-talent-card__action"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onRemove();
                }}
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
        <div className="library-talent-card__meta">
          <p className="library-talent-card__name">
            {talent.name}
            {savedIndicator ? <span className="ml-1 text-[10px] font-semibold text-[var(--accent)]">Saved</span> : null}
          </p>
          <p className="library-talent-card__sub">{talent.location || "Location unavailable"}</p>
        </div>
      </Link>
    </div>
  );
}
