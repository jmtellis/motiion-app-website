"use client";

import type { ReactNode } from "react";

import { WheelScrollCard } from "@/components/landing/WheelScrollCard";
import type { EditorialPart } from "@/lib/marketing/homepage-content";

type PillarItem = {
  id: string;
  titleParts: EditorialPart[];
  description: string;
  image: { src: string; alt: string; kind?: "image" | "video"; poster?: string };
  headshotStack?: ReactNode;
};

export function FeatureWheelStack({
  items,
  dark = true,
}: {
  items: PillarItem[];
  dark?: boolean;
}) {
  return (
    <section className="ui-wheel-stack border-t border-[#262626] bg-[#0a0a0a]">
      <div className="ui-wheel-lead-in" aria-hidden />
      <div className="ui-wheel-list">
        {items.map((item) => (
          <WheelScrollCard
            key={item.id}
            id={item.id}
            titleParts={item.titleParts}
            description={item.description}
            image={item.image}
            dark={dark}
            headshotStack={item.headshotStack}
          />
        ))}
      </div>
    </section>
  );
}
