import type { ReactNode } from "react";

import { NotificationsButton } from "@/components/workspace/WorkspaceNotifications";

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function HomeFeed({
  greeting,
  discoverySlot,
  listingsSlot,
}: {
  greeting: string;
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
        <NotificationsButton />
      </header>

      {discoverySlot}

      {listingsSlot}
    </div>
  );
}
