"use client";

import { Heart } from "lucide-react";
import { useState, useTransition } from "react";

import type { Talent } from "@/lib/talent-navigator/types";

type TalentCardProps = {
  talent: Talent;
  active: boolean;
  distance?: number;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onMouseEnter?: () => void;
  onSave?: (talent: Talent) => void | Promise<void>;
  saved?: boolean;
  tabIndex?: number;
  ariaLabel?: string;
};

function visualsForDistance(distance: number, active: boolean) {
  if (active) {
    return { scale: 1.04, opacity: 1, blur: 0 };
  }
  return {
    scale: Math.max(0.86, 1 - distance * 0.028),
    opacity: Math.max(0.12, 0.72 - distance * 0.14),
    blur: Math.min(distance * 0.2, 1.2),
  };
}

export function TalentCard({
  talent,
  active,
  distance = active ? 0 : 1,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onSave,
  saved = false,
  tabIndex = -1,
  ariaLabel,
}: TalentCardProps) {
  const visuals = visualsForDistance(distance, active);
  const [isPending, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);
  const isSaved = saved || justSaved;

  return (
    <button
      type="button"
      className={`talent-navigator__card w-full text-left ${active ? "talent-navigator__card--active" : ""}${distance <= 1 ? " talent-navigator__card--near" : ""}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      tabIndex={tabIndex}
      aria-label={ariaLabel ?? `${talent.name}${active ? ", active" : ""}`}
      aria-current={active ? "true" : undefined}
      style={
        {
          "--tn-card-scale": visuals.scale,
          "--tn-card-opacity": visuals.opacity,
          "--tn-card-blur": `${visuals.blur}px`,
        } as React.CSSProperties
      }
    >
      <div className="talent-navigator__card-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={talent.imageUrl} alt="" loading="lazy" />
        {active ? (
          <>
            <div className="talent-navigator__card-overlay" aria-hidden />
            <div className="talent-navigator__card-overlay-content">
              <p className="talent-navigator__card-name">{talent.name}</p>
              <p className="talent-navigator__card-sub">{talent.location ?? "Location TBD"}</p>
              {talent.matchReasons?.[0] ? (
                <p className="talent-navigator__card-why" title={talent.matchReasons[0].label}>
                  {talent.matchReasons[0].label}
                </p>
              ) : null}
            </div>
            {onSave ? (
              <span
                role="button"
                tabIndex={0}
                className={`talent-navigator__card-save${isSaved ? " talent-navigator__card-save--saved" : ""}`}
                aria-label={isSaved ? `${talent.name} saved` : `Save ${talent.name}`}
                aria-pressed={isSaved}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (isPending || isSaved) return;
                  startTransition(async () => {
                    await onSave(talent);
                    setJustSaved(true);
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  event.stopPropagation();
                  if (isPending || isSaved) return;
                  startTransition(async () => {
                    await onSave(talent);
                    setJustSaved(true);
                  });
                }}
              >
                <Heart className="size-3.5" fill={isSaved ? "currentColor" : "none"} />
              </span>
            ) : (
              <span className="talent-navigator__card-save" aria-hidden>
                <Heart className="size-3.5" />
              </span>
            )}
          </>
        ) : null}
      </div>
    </button>
  );
}
