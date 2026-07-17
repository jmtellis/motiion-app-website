"use client";

import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import type { Talent } from "@/lib/talent-navigator/types";

import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";

const PROFILE_DRAG_MIME = "application/x-motiion-profile-id";

function TalentCarouselCard({
  talent,
  selected,
  onSelect,
}: {
  talent: Talent;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={`casting-find-talent-card${selected ? " casting-find-talent-card--selected" : ""}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(PROFILE_DRAG_MIME, talent.id);
        event.dataTransfer.effectAllowed = "copy";
      }}
    >
      <button type="button" className="casting-find-talent-card__button" onClick={onSelect}>
        {talent.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={talent.imageUrl}
            src={talent.imageUrl}
            alt=""
            className="casting-find-talent-card__photo"
          />
        ) : (
          <div className="casting-find-talent-card__photo casting-find-talent-card__photo--empty" />
        )}
        <div className="casting-find-talent-card__body">
          <strong>{talent.name}</strong>
          {talent.caption?.trim() ? (
            <span className="casting-find-talent-card__meta">{talent.caption.trim()}</span>
          ) : (
            <span className="casting-find-talent-card__meta">
              {talent.agency?.trim() || "Independent"}
            </span>
          )}
        </div>
      </button>
    </article>
  );
}

export function CastingTalentCarousel({
  title,
  subtitle,
  items,
  loading,
  selectedId,
  onSelect,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  emptyActionHref,
  onEmptyAction,
  headerActions,
}: {
  title: string;
  subtitle?: string;
  items: Talent[];
  loading?: boolean;
  selectedId?: string | null;
  onSelect: (talent: Talent) => void;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
  onEmptyAction?: () => void;
  headerActions?: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: direction * 220, behavior: "smooth" });
  }

  return (
    <section className="casting-find-talent-carousel-section">
      <div className="casting-find-talent-carousel-section__header">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {headerActions ? (
          <div className="casting-find-talent-carousel-section__header-actions">{headerActions}</div>
        ) : null}
      </div>

      {loading ? (
        <div className="casting-find-talent-board__loading">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span>Loading…</span>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          variant="dashboard"
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          actionHref={onEmptyAction ? undefined : emptyActionHref}
          onAction={onEmptyAction}
        />
      ) : (
        <>
          <div className="casting-find-talent-carousel" ref={scrollerRef}>
            {items.map((talent) => (
              <TalentCarouselCard
                key={talent.id}
                talent={talent}
                selected={selectedId === talent.id}
                onSelect={() => onSelect(talent)}
              />
            ))}
          </div>
          <div className="casting-find-talent-carousel-section__footer">
            <p className="casting-find-talent-carousel-section__count">
              {items.length} {title.toLowerCase().includes("referred") ? "referred" : "matched"}
            </p>
            <div className="casting-find-talent-carousel-section__nav">
              <button
                type="button"
                className="casting-find-talent-carousel-section__nav-btn"
                onClick={() => scroll(-1)}
                aria-label={`Scroll ${title} back`}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className="casting-find-talent-carousel-section__nav-btn"
                onClick={() => scroll(1)}
                aria-label={`Scroll ${title} forward`}
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export { PROFILE_DRAG_MIME };
