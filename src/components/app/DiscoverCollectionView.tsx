"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";

import type { HomeRosterPerson } from "@/app/(app)/home/actions";
import { DiscoverBackHeader } from "@/components/app/DiscoverBackHeader";
import { DiscoverProfilePanel } from "@/components/app/DiscoverProfilePanel";
import { ProductEmptyState } from "@/components/ui/EmptyState";
import type { Talent } from "@/lib/talent-navigator/types";

function personToTalent(person: HomeRosterPerson): Talent {
  return {
    id: person.id,
    slug: person.slug || person.id,
    name: person.name,
    imageUrl: person.avatarUrl || "",
    styles: [],
    location: person.location ?? undefined,
    talentTypes: person.role ? [person.role] : undefined,
  };
}

/** Explore-list style roster for a Featured collection. */
export function DiscoverCollectionView({
  title,
  subtitle,
  people,
  error,
  backHref,
  profileBasePath = "/discover",
}: {
  title: string;
  subtitle?: string | null;
  people: HomeRosterPerson[];
  error?: string | null;
  backHref: string;
  profileBasePath?: "/discover" | "/talent";
}) {
  const [selected, setSelected] = useState<Talent | null>(null);

  return (
    <div className="discover-detail discover-detail--collection discover-skel-enter">
      <DiscoverBackHeader href={backHref} title={title} subtitle={subtitle} />

      {error ? (
        <div role="alert" className="ui-notice" data-tone="error">
          {error}
        </div>
      ) : null}

      {!error && people.length === 0 ? (
        <ProductEmptyState
          illustration="people"
          title="No one to show yet"
          description="This featured list is empty right now."
          actionLabel="Back"
          actionHref={backHref}
        />
      ) : null}

      {people.length ? (
        <div className="discover-browse__grid">
          {people.map((person) => (
            <button
              key={person.id}
              type="button"
              className={`discover-browse-card${selected?.id === person.id ? " discover-browse-card--active" : ""}`}
              aria-label={`Open ${person.name} profile`}
              aria-pressed={selected?.id === person.id}
              onClick={() => setSelected(personToTalent(person))}
            >
              <span className="discover-browse-card__photo">
                {person.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={person.avatarUrl} alt="" loading="lazy" />
                ) : (
                  <span className="discover-browse-card__initial">{person.name.charAt(0)}</span>
                )}
              </span>
              <span className="discover-browse-card__copy">
                <strong>{person.name}</strong>
                <small>
                  <MapPin size={12} aria-hidden />
                  {person.location || "Location TBD"}
                </small>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <DiscoverProfilePanel
        key={selected?.id ?? "none"}
        talent={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        profileBasePath={profileBasePath}
      />
    </div>
  );
}
