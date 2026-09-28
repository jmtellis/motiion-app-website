import type { ReactNode } from "react";
import { Ticket } from "lucide-react";

import { NotificationsButton } from "@/components/workspace/WorkspaceNotifications";

const LAUNCH_EVENT_URL = "https://partiful.com/e/J2NVfO0cgaOmQjERYJ4Z";

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

      <p className="talent-launch-banner" role="status">
        <Ticket size={16} aria-hidden />
        <span>
          <strong>You’re invited to our launch event.</strong>
        </span>
        <a href={LAUNCH_EVENT_URL} target="_blank" rel="noopener noreferrer">
          RSVP
        </a>
      </p>

      {discoverySlot}

      {listingsSlot}
    </div>
  );
}
