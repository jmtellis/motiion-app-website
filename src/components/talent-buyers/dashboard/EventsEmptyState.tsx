"use client";

import Link from "next/link";

import {
  BUYER_CREATE_INTENT_OPTIONS,
  createIntentPath,
} from "@/lib/talent-buyers/create-intent";

import { BuyerEmptyIntro } from "./BuyerEmptyIntro";
import { CreateActivityButton } from "./CreateActivityButton";

import "./buyer-empty.css";

function GhostEventCardContents({
  label,
  description,
}: {
  label?: string;
  description?: string;
}) {
  return (
    <>
      <div className="buyer-empty__card-media" aria-hidden>
        <span className="buyer-empty__bone buyer-empty__bone--chip" />
      </div>
      <div className="buyer-empty__card-body">
        {label ? (
          <>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
              {label}
            </span>
            {description ? <p className="mt-2 text-sm text-white/55">{description}</p> : null}
          </>
        ) : (
          <div aria-hidden>
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
        )}
      </div>
    </>
  );
}

export function EventsGhostGrid({
  interactive = true,
  label = "Create a casting, event, class, or session",
}: {
  interactive?: boolean;
  label?: string;
}) {
  return (
    <ul className="buyer-empty__grid" aria-label={label}>
      {BUYER_CREATE_INTENT_OPTIONS.map((option) => (
        <li key={option.value}>
          {interactive ? (
            <Link
              href={createIntentPath(option.value)}
              className="buyer-empty__card buyer-empty__card--interactive"
              aria-label={`Start a ${option.label.toLowerCase()}`}
            >
              <GhostEventCardContents label={option.label} description={option.description} />
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

export function EventsEmptyState({
  onOpenSchedule,
  onCreate,
}: {
  onOpenSchedule: () => void;
  onCreate?: () => void;
}) {
  return (
    <div className="buyer-empty">
      <BuyerEmptyIntro
        title="Create a casting, event, class, or session"
        lede="One create path for castings and activities. Events include tickets, lead invites, and check-in — free on every plan."
      >
        <div className="buyer-empty__actions">
          <CreateActivityButton
            triggerClassName="buyer-chrome-bar__cta"
            triggerLabel="Create"
            showPlusIcon
            onClick={onCreate}
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
