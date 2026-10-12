"use client";

import { useState } from "react";

import { ProgramTalentSheet } from "@/components/event/ProgramTalentSheet";
import {
  featuredTalentEmptyMessage,
  featuredTalentSectionTitle,
} from "@/lib/publicActivity";
import type { PublicEventTalentAppearance, PublicFeaturedTalent } from "@/types/public";

function initial(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

export function EventProgramCastSection({
  featured,
  appearance,
}: {
  featured: PublicFeaturedTalent[];
  appearance: PublicEventTalentAppearance;
}) {
  const [selected, setSelected] = useState<PublicFeaturedTalent | null>(null);

  return (
    <>
      <section className="event-program-cast-section">
        <h2 className="event-program-cast-heading">{featuredTalentSectionTitle(appearance)}</h2>
        {featured.length === 0 ? (
          <p className="event-program-empty-copy">{featuredTalentEmptyMessage(appearance)}</p>
        ) : (
          <div className="event-program-cast-grid">
            {featured.map((talent) => (
              <button
                key={talent.id}
                type="button"
                className="event-program-cast-cell"
                onClick={() => setSelected(talent)}
              >
                <div className="event-program-cast-portrait">
                  {talent.headshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={talent.headshotUrl} alt="" />
                  ) : (
                    <div className="event-program-cast-portrait-fallback">
                      {initial(talent.displayName)}
                    </div>
                  )}
                </div>
                <p className="event-program-cast-name">{talent.displayName}</p>
                {talent.children.length > 0 ? (
                  <p className="event-program-cast-meta">
                    {talent.children.length === 1
                      ? "1 performer"
                      : `${talent.children.length} performers`}
                  </p>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </section>

      {selected ? (
        <ProgramTalentSheet key={selected.id} talent={selected} onClose={() => setSelected(null)} />
      ) : null}
    </>
  );
}
