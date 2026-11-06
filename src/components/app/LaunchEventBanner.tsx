import { Ticket } from "lucide-react";

import { Banner } from "@/components/ui/Banner";

const LAUNCH_EVENT_URL = "https://partiful.com/e/J2NVfO0cgaOmQjERYJ4Z";

export function LaunchEventBanner() {
  return (
    <Banner
      tone="info"
      inline
      icon={<Ticket size={16} strokeWidth={2.4} />}
      title="You’re invited to our launch event"
      action={
        <a className="ui-banner__action" href={LAUNCH_EVENT_URL} target="_blank" rel="noopener noreferrer">
          RSVP
        </a>
      }
    >
      Celebrate the launch of Motiion with dancers, choreographers, and industry friends.
    </Banner>
  );
}
