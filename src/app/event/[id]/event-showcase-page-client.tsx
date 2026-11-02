"use client";

import { EventProgramCastSection } from "@/components/event/EventProgramCastSection";
import { EventProgramFixedCta, EventProgramPoweredBy } from "@/components/event/EventProgramChrome";
import { EventProgramHero, eventProgramHeroImageUrl } from "@/components/event/EventProgramHero";
import { EventProgramShell } from "@/components/event/EventProgramShell";
import { useEventProgramChrome } from "@/components/event/useEventProgramChrome";
import { PublicPageAnalytics } from "@/components/analytics/PublicPageAnalytics";
import { programCastNodes, programHeroEyebrow, resolveTalentAppearance } from "@/lib/publicActivity";
import Link from "next/link";
import type { PublicActivity } from "@/types/public";

import "@/app/casting/casting.css";

export default function EventShowcasePageClient({
  activity,
  sharePath,
}: {
  activity: PublicActivity;
  sharePath: string;
}) {
  const appearance = resolveTalentAppearance(activity);
  const featured = programCastNodes(activity);
  const poweredByOpacity = useEventProgramChrome();
  const analyticsPath = sharePath.startsWith("/") ? sharePath : `/${sharePath}`;

  return (
    <EventProgramShell>
      <PublicPageAnalytics
        eventName="activity_viewed"
        properties={{ activity_id: activity.id, kind: "event", activity_type: "event" }}
        path={analyticsPath}
      />
      <PublicPageAnalytics
        eventName="opportunity_viewed"
        properties={{ opportunity_id: activity.id, activity_type: "event" }}
        path={analyticsPath}
      />

      <article className="event-program-page">
        <EventProgramHero
          title={activity.title}
          eyebrow={programHeroEyebrow(activity)}
          imageUrl={eventProgramHeroImageUrl(activity)}
        />
        <EventProgramCastSection featured={featured} appearance={appearance} />
        <div className="event-program-scroll-tail" aria-hidden />
      </article>

      <EventProgramPoweredBy opacity={poweredByOpacity} />

      <EventProgramFixedCta>
        <Link className="event-program-cta-glass event-program-cta-button" href={`/activity/${activity.id}`}>
          {activity.requirePayment || activity.externalTicketUrl ? "Event details & tickets" : "View event details"}
        </Link>
      </EventProgramFixedCta>
    </EventProgramShell>
  );
}
