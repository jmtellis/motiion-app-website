"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import type { MouseEvent } from "react";

import { navigateWithViewTransition } from "./view-transition";

import "./composable-project.css";

export type RosterStackPerson = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

const MAX_PEEKING = 3;

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

/** The stacked visual alone — reused as the shared element on the full roster page. */
export function RosterStack({
  people,
  transitionName,
  size = "md",
}: {
  people: RosterStackPerson[];
  transitionName?: string;
  size?: "md" | "lg";
}) {
  const visible = people.slice(0, MAX_PEEKING);
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
              <Image src={person.avatarUrl} alt="" fill sizes={size === "lg" ? "160px" : "120px"} />
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
}: {
  people: RosterStackPerson[];
  label: string;
  sublabel?: string;
  href: string;
  transitionName?: string;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigateWithViewTransition((next) => router.push(next), href, { reducedMotion });
  }

  return (
    <a href={href} className="roster-stack-tile" onClick={handleClick}>
      <RosterStack people={people} transitionName={transitionName} />
      <span className="roster-stack-tile__label">
        <strong>{label}</strong>
        <span>{sublabel ?? "\u00a0"}</span>
      </span>
    </a>
  );
}
