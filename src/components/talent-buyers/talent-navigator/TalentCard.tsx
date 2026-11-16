"use client";

import Link from "next/link";
import { useProfileCardInteraction } from "@/components/app/use-profile-card-interaction";
import { ArrowUpRight, Check, Heart } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import type { Talent } from "@/lib/talent-navigator/types";

type TalentCardProps = {
  talent: Talent;
  active: boolean;
  distance?: number;
  /** Preview panel is open for this talent. */
  panelOpen?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onMouseEnter?: () => void;
  onSave?: (talent: Talent) => void | Promise<void>;
  saved?: boolean;
  profileHref?: string;
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

/** Cached, slow, and failed portraits all keep a stable card footprint. */
function Portrait({ src, name, active, nearby }: { src: string; name: string; active: boolean; nearby: boolean }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete) setStatus(image.naturalWidth > 0 ? "ready" : "error");
  }, []);
  return <>
    <span className="talent-navigator__portrait-placeholder" data-loading={status === "loading"} aria-hidden>{status === "error" ? name.split(" ").map(part => part[0]).slice(0, 2).join("") : ""}</span>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img ref={imageRef} src={src} alt="" loading={nearby ? "eager" : "lazy"} fetchPriority={active ? "high" : "auto"} decoding="async" data-ready={status === "ready"} onLoad={() => setStatus("ready")} onError={() => setStatus("error")} />
  </>;
}

export function TalentCard({
  talent,
  active,
  distance = active ? 0 : 1,
  panelOpen = false,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onSave,
  saved = false,
  profileHref,
  tabIndex = -1,
  ariaLabel,
}: TalentCardProps) {
  const interaction = useProfileCardInteraction(profileHref, onClick);
  const visuals = visualsForDistance(distance, active);
  const [isPending, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);
  const isSaved = saved || justSaved;

  return (
    <div
      data-profile-actions={active && profileHref ? true : undefined}
      className={`talent-navigator__card w-full text-left ${active ? "talent-navigator__card--active" : ""}${distance <= 1 ? " talent-navigator__card--near" : ""}${panelOpen ? " talent-navigator__card--panel-open" : ""}`}
      onMouseEnter={onMouseEnter}
      style={
        {
          "--tn-card-scale": visuals.scale,
          "--tn-card-opacity": visuals.opacity,
          "--tn-card-blur": `${visuals.blur}px`,
        } as React.CSSProperties
      }
    >
      <button type="button" className="talent-navigator__card-hit"
        onClick={interaction.onClick} onKeyDown={interaction.onKeyDown} onDoubleClick={profileHref ? undefined : onDoubleClick} tabIndex={tabIndex}
        aria-label={ariaLabel ?? `Preview ${talent.name}`} aria-pressed={panelOpen || undefined} />
      <div className="talent-navigator__card-photo">
        <Portrait key={talent.imageUrl} src={talent.imageUrl} name={talent.name} active={active} nearby={distance <= 1} />
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
              <button
                type="button"
                disabled={isPending || isSaved}
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

              >
                <Heart className="size-3.5" fill={isSaved ? "currentColor" : "none"} />
              </button>
            ) : null}
            {profileHref ? <Link className="talent-navigator__card-profile" href={profileHref} prefetch={false} aria-label={`${panelOpen ? "Selected in preview. " : ""}View ${talent.name} profile`} title={panelOpen ? "Selected in preview · View full profile" : "View full profile"}>
              {panelOpen ? <Check size={18} aria-hidden /> : <ArrowUpRight size={18} aria-hidden />}
            </Link> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
