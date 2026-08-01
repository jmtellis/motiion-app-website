"use client";

import Link from "next/link";

import { BuyerEmptyIntro } from "./BuyerEmptyIntro";
import { CreateActivityButton } from "./CreateActivityButton";

import "./buyer-empty.css";

const EXAMPLE_ACTIVITIES = [
  { type: "class" as const, key: "class", label: "Start a class" },
  { type: "session" as const, key: "session", label: "Start a session" },
  { type: "event" as const, key: "event", label: "Start an event" },
  { type: "class" as const, key: "workshop", label: "Start a workshop" },
];

function GhostEventCardContents() {
  return (
    <>
      <div className="buyer-empty__card-media" aria-hidden>
        <span className="buyer-empty__bone buyer-empty__bone--chip" />
      </div>
      <div className="buyer-empty__card-body" aria-hidden>
        <span className="buyer-empty__bone buyer-empty__bone--type" />
        <span className="buyer-empty__bone buyer-empty__bone--title" />
        <div className="buyer-empty__card-meta">
          <div className="buyer-empty__card-meta-col">
            <span className="buyer-empty__bone buyer-empty__bone--label" />
            <span className="buyer-empty__bone buyer-empty__bone--value" />
          </div>
          <div className="buyer-empty__card-meta-col">
            <span className="buyer-empty__bone buyer-empty__bone--label" />
            <span className="buyer-empty__bone buyer-empty__bone--value" />
          </div>
        </div>
      </div>
    </>
  );
}

export function EventsGhostGrid({
  interactive = true,
  label = "Example activity layout",
}: {
  interactive?: boolean;
  label?: string;
}) {
  return (
    <ul className="buyer-empty__grid" aria-label={label}>
      {EXAMPLE_ACTIVITIES.map((example) => (
        <li key={example.key}>
          {interactive ? (
            <Link
              href={`/calendar/new?type=${example.type}`}
              className="buyer-empty__card buyer-empty__card--interactive"
              aria-label={example.label}
            >
              <GhostEventCardContents />
            </Link>
          ) : (
            <div className="buyer-empty__card" aria-hidden>
              <GhostEventCardContents />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function EventsEmptyState({ onOpenSchedule }: { onOpenSchedule: () => void }) {
  return (
    <div className="buyer-empty">
      <BuyerEmptyIntro
        title="Host your next industry event"
        lede="Set up tickets, invite subgroup leads, check guests in, and run the whole showcase from Motiion."
      >
        <div className="buyer-empty__actions">
          <CreateActivityButton
            triggerClassName="buyer-chrome-bar__cta"
            triggerLabel="Create activity"
            showPlusIcon
          />
          <button type="button" className="bd-btn-secondary" onClick={onOpenSchedule}>
            Open schedule
          </button>
        </div>
      </BuyerEmptyIntro>

      <EventsGhostGrid />
    </div>
  );
}
