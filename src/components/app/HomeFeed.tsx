import type { ReactNode } from "react";

import { LaunchEventBanner } from "@/components/app/LaunchEventBanner";

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function HomeFeed({
  greeting,
  bookingSlot,
  discoverySlot,
  listingsSlot,
}: {
  greeting: string;
  bookingSlot?: ReactNode;
  discoverySlot?: ReactNode;
  listingsSlot?: ReactNode;
}) {
  return (
    <div className="talent-home">
      <header className="talent-home__header">
        <div>
          <p>{todayLabel()}</p>
          <h1>{greeting}</h1>
        </div>
      </header>

      <LaunchEventBanner />

      {bookingSlot}

      {discoverySlot}

      {listingsSlot}
    </div>
  );
}
