"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import type { MouseEvent, ReactNode } from "react";

import {
  MAX_PEEKING,
  rosterStackTileAccessibleLabel,
  type RosterStackPerson,
} from "@/lib/talent-buyers/roster-stack";

import { navigateWithViewTransition } from "./view-transition";

import "./composable-project.css";

export type { RosterStackPerson };

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/**
 * The stacked visual alone — reused as the shared element on the full roster page.
 * Room for the back cards is always reserved, so a 1-person and a 3-person
 * stack occupy the same box and never spill into the label below.
 */
export function RosterStack({
  people,
  transitionName,
  size = "md",
}: {
  people: RosterStackPerson[];
  transitionName?: string;
  size?: "md" | "lg" | "fluid";
}) {
  const visible = people.slice(0, MAX_PEEKING);
  const imageSizes = size === "lg" ? "160px" : size === "fluid" ? "(min-width: 640px) 320px, 90vw" : "120px";
  return (
    <span
      className={`roster-stack roster-stack--${size}${visible.length ? "" : " roster-stack--empty"}`}
      style={transitionName ? { viewTransitionName: transitionName } : undefined}
      aria-hidden
    >
      {visible.length ? (
        visible.map((person, index) => (
          <span
            key={person.id}
            className="roster-stack__card"
            style={{ zIndex: MAX_PEEKING - index, ["--stack-index" as string]: index }}
          >
            {person.avatarUrl ? (
              <Image src={person.avatarUrl} alt="" fill sizes={imageSizes} />
            ) : (
              <span className="roster-stack__initials">{initials(person.name)}</span>
            )}
          </span>
        ))
      ) : (
        <span className="roster-stack__card roster-stack__card--placeholder" />
      )}
    </span>
  );
}

/**
 * Overstacked roster tile. Labels sit below the tile in a fixed slot so rows
 * of tiles align; activating it pushes to the full roster page.
 */
export function RosterStackTile({
  people,
  label,
  sublabel,
  href,
  transitionName,
  size = "md",
  menu,
}: {
  people: RosterStackPerson[];
  label: string;
  sublabel?: string;
  href: string;
  transitionName?: string;
  size?: "md" | "fluid";
  /** Rendered beside the label, outside the link, so it stays a separate control. */
  menu?: ReactNode;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    navigateWithViewTransition((next) => router.push(next), href, { reducedMotion });
  }

  return (
    <div className={`roster-stack-tile roster-stack-tile--${size}${menu ? " roster-stack-tile--menu" : ""}`}>
      <a
        href={href}
        className="roster-stack-tile__link"
        onClick={handleClick}
        aria-label={rosterStackTileAccessibleLabel(label, sublabel)}
      >
        <RosterStack people={people} transitionName={transitionName} size={size} />
        <span className="roster-stack-tile__label">
          <strong>{label}</strong>
          <span>{sublabel ?? "\u00a0"}</span>
        </span>
      </a>
      {menu ? <div className="roster-stack-tile__menu">{menu}</div> : null}
    </div>
  );
}
