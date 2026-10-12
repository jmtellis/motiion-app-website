"use client";

import { useMemo, useState } from "react";

import { EventProgramCastSection } from "@/components/event/EventProgramCastSection";
import { EventProgramFixedCta, EventProgramPoweredBy } from "@/components/event/EventProgramChrome";
import { EventProgramHero, eventProgramHeroImageUrl } from "@/components/event/EventProgramHero";
import { EventProgramShell } from "@/components/event/EventProgramShell";
import { useEventProgramChrome } from "@/components/event/useEventProgramChrome";
import { ClassGuestBookingForm } from "@/components/product/ClassGuestBookingForm";
import { PublicPageAnalytics } from "@/components/analytics/PublicPageAnalytics";
import {
  billedArtistsLine,
  eventHeroEyebrow,
  formatActivityDateTime,
  formatActivityThroughLine,
  formatEventScheduleTime,
  formatMoney,
  formatProgramDateTime,
  mapsUrlForLocation,
  programCastNodes,
  resolveTalentAppearance,
} from "@/lib/publicActivity";
import { getIosAppStoreUrl } from "@/lib/referrals/app-store";
import type { PublicActivity, PublicEventHost } from "@/types/public";

import "@/app/casting/casting.css";

export default function EventShowcasePageClient({
  activity,
  sharePath,
  ticketProviderName = null,
  ticketProviderLogoUrl = null,
}: {
  activity: PublicActivity;
  sharePath: string;
  ticketProviderName?: string | null;
  ticketProviderLogoUrl?: string | null;
}) {
  const [enrolledTitle, setEnrolledTitle] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const soldOut = activity.spotsRemaining != null && activity.spotsRemaining <= 0;
  const hasExternalTickets = Boolean(activity.externalTicketUrl?.trim());
  const hasMotiionTickets =
    (activity.ticketOptions?.length ?? 0) > 0 ||
    (activity.requirePayment && (activity.pricingTiers?.length ?? 0) > 0) ||
    activity.requirePayment;
  const canBookGuest =
    activity.isEligibleForBooking && !enrolledTitle && !soldOut && hasMotiionTickets;
  const showGuestBooking = hasMotiionTickets && activity.isEligibleForBooking && !enrolledTitle;
  const showExternalTickets = hasExternalTickets && !showGuestBooking && !enrolledTitle;
  const showFullMetadata = activity.requirePayment;

  const analyticsPath = sharePath.startsWith("/") ? sharePath : `/${sharePath}`;
  const dateLine = formatActivityDateTime(activity);
  const throughLine = formatActivityThroughLine(activity);
  const programDate = formatProgramDateTime(activity);
  const location = activity.location?.trim() ?? "";
  const appearance = resolveTalentAppearance(activity);
  const featured = programCastNodes(activity);
  const poweredByOpacity = useEventProgramChrome();
  const appStoreUrl = getIosAppStoreUrl();
  const eyebrow = billedArtistsLine(activity) ?? eventHeroEyebrow(activity);

  const hosts = activity.hosts?.length
    ? activity.hosts
    : activity.organizerDisplayName
      ? [
          {
            userId: "organizer",
            displayName: activity.organizerDisplayName,
            headshotUrl: activity.organizerHeadshotURL,
          } satisfies PublicEventHost,
        ]
      : [];

  const highlights = (activity.eventHighlights ?? []).filter((item) => item.trim());
  const lineup = (activity.eventLineup ?? []).filter((item) => item.trim());
  const scheduleItems = activity.eventScheduleItems ?? [];

  const detailRows = useMemo(
    () =>
      [
        { label: "Dress Code", value: activity.eventDressCode?.trim() ?? "" },
        { label: "Arrival", value: activity.eventArrivalNotes?.trim() ?? "" },
        { label: "Food & Drinks", value: activity.eventFoodDrinksInfo?.trim() ?? "" },
        { label: "Accessibility", value: activity.eventAccessibilityInfo?.trim() ?? "" },
      ].filter((row) => row.value.length > 0),
    [activity],
  );

  const policyRows = useMemo(
    () =>
      [
        { label: "Late Entry", value: activity.eventLateEntryPolicy?.trim() ?? "" },
        { label: "Cancellation", value: activity.eventCancellationPolicy?.trim() ?? "" },
      ].filter((row) => row.value.length > 0),
    [activity],
  );

  const bookLabel = enrolledTitle
    ? "Registered"
    : soldOut
      ? "Sold out"
      : !activity.isEligibleForBooking
        ? "Booking closed"
        : "Get tickets";

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
          eyebrow={eyebrow}
          imageUrl={eventProgramHeroImageUrl(activity)}
        >
          {programDate ? <p className="event-program-showcase-date">{programDate}</p> : null}
          {location ? <p className="event-program-showcase-location">{location}</p> : null}
        </EventProgramHero>

        <EventProgramCastSection featured={featured} appearance={appearance} />

        {activity.description?.trim() ? (
          <section className="event-program-detail-section">
            <h2 className="event-program-cast-heading">About</h2>
            <p className="event-program-detail-copy">{activity.description.trim()}</p>
          </section>
        ) : null}

        {hosts.length > 0 || dateLine || location ? (
          <section className="event-program-detail-section">
            <h2 className="event-program-cast-heading">When & where</h2>
            <dl className="event-program-detail-list">
              {hosts.length > 0 ? (
                <div className="event-program-detail-row">
                  <dt>Hosts</dt>
                  <dd>
                    <span>{hosts.map((host) => host.displayName).join(", ")}</span>
                    <span className="event-program-host-avatars" aria-hidden>
                      {hosts.slice(0, 4).map((host) =>
                        host.headshotUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={host.userId} src={host.headshotUrl} alt="" />
                        ) : (
                          <span key={host.userId}>{host.displayName.slice(0, 1)}</span>
                        ),
                      )}
                    </span>
                  </dd>
                </div>
              ) : null}
              <div className="event-program-detail-row">
                <dt>Date</dt>
                <dd>
                  <span>{dateLine}</span>
                  {throughLine ? (
                    <span className="event-program-detail-sub">{throughLine}</span>
                  ) : null}
                </dd>
              </div>
              {location ? (
                <div className="event-program-detail-row">
                  <dt>Location</dt>
                  <dd>
                    <span>{location}</span>
                    <a
                      className="event-program-inline-link"
                      href={mapsUrlForLocation(location)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Maps
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {showGuestBooking && (activity.ticketOptions?.length ?? 0) > 0 ? (
          <section className="event-program-detail-section" id="tickets">
            <h2 className="event-program-cast-heading">
              {hasExternalTickets ? "Motiion Tickets" : "Tickets"}
            </h2>
            <ul className="event-program-ticket-list">
              {activity.ticketOptions?.map((ticket) => (
                <li key={ticket.id}>
                  <strong>{ticket.label}</strong>
                  {" — "}
                  {formatMoney(ticket.amountCents, ticket.currency || activity.priceCurrency || "usd")}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {showExternalTickets ? (
          <section className="event-program-detail-section" id="tickets">
            <h2 className="event-program-cast-heading">Tickets</h2>
            <p className="event-program-detail-copy event-program-ticket-provider">
              <TicketProviderLogo url={ticketProviderLogoUrl} name={ticketProviderName} />
              <a
                href={activity.externalTicketUrl!.trim()}
                target="_blank"
                rel="noreferrer"
                className="event-program-inline-link"
              >
                Get tickets
              </a>
            </p>
          </section>
        ) : null}

        {activity.pricingTiers &&
        activity.pricingTiers.length > 0 &&
        (activity.ticketOptions?.length ?? 0) === 0 &&
        showGuestBooking ? (
          <section className="event-program-detail-section" id="tickets">
            <h2 className="event-program-cast-heading">Tickets</h2>
            <dl className="event-program-detail-list">
              {activity.pricingTiers.map((tier) => (
                <div key={tier.id} className="event-program-detail-row">
                  <dt>{tier.label}</dt>
                  <dd>{formatMoney(tier.amountCents, activity.priceCurrency ?? "usd")}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {enrolledTitle ? (
          <section className="event-program-detail-section">
            <h2 className="event-program-cast-heading">You&apos;re registered</h2>
            <p className="event-program-detail-copy">
              You&apos;re booked for <strong>{enrolledTitle}</strong>. Download the Motiion app to
              view your schedule and get updates.
            </p>
          </section>
        ) : null}

        {showFullMetadata && highlights.length > 0 ? (
          <section className="event-program-detail-section">
            <h2 className="event-program-cast-heading">Event highlights</h2>
            <ul className="event-program-bullet-list">
              {highlights.slice(0, 5).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {showFullMetadata && lineup.length > 0 ? (
          <section className="event-program-detail-section">
            <h2 className="event-program-cast-heading">Lineup</h2>
            <ul className="event-program-bullet-list">
              {lineup.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {showFullMetadata && scheduleItems.length > 0 ? (
          <section className="event-program-detail-section">
            <h2 className="event-program-cast-heading">Schedule</h2>
            <dl className="event-program-detail-list">
              {scheduleItems.map((item) => (
                <div key={item.id} className="event-program-detail-row">
                  <dt>{formatEventScheduleTime(item.time) ?? "—"}</dt>
                  <dd>{item.title}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {showFullMetadata && detailRows.length > 0 ? (
          <section className="event-program-detail-section">
            <h2 className="event-program-cast-heading">Event details</h2>
            <dl className="event-program-detail-list">
              {detailRows.map((row) => (
                <div key={row.label} className="event-program-detail-row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {showFullMetadata && policyRows.length > 0 ? (
          <section className="event-program-detail-section">
            <h2 className="event-program-cast-heading">Policies</h2>
            <dl className="event-program-detail-list">
              {policyRows.map((row) => (
                <div key={row.label} className="event-program-detail-row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {!activity.isEligibleForBooking && !enrolledTitle && !showExternalTickets ? (
          <section className="event-program-detail-section">
            <p className="event-program-detail-copy">
              This event is no longer open for booking on the web. Open Motiion for the latest
              status.
            </p>
          </section>
        ) : null}

        <div className="event-program-scroll-tail" aria-hidden />
      </article>

      <EventProgramPoweredBy opacity={poweredByOpacity} />

      <EventProgramFixedCta>
        {showGuestBooking ? (
          <button
            type="button"
            className="event-program-cta-glass event-program-cta-button"
            disabled={!canBookGuest}
            onClick={() => {
              if (canBookGuest) setShowBookingModal(true);
            }}
          >
            {bookLabel}
          </button>
        ) : showExternalTickets ? (
          <a
            className="event-program-cta-glass event-program-cta-button"
            href={activity.externalTicketUrl!.trim()}
            target="_blank"
            rel="noreferrer"
          >
            <TicketProviderLogo url={ticketProviderLogoUrl} name={ticketProviderName} />
            Get tickets
          </a>
        ) : (
          <a
            className="event-program-cta-glass event-program-cta-button"
            href={appStoreUrl}
            target="_blank"
            rel="noreferrer"
          >
            Download Motiion
          </a>
        )}
      </EventProgramFixedCta>

      {showBookingModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-booking-title"
          className="event-program-modal-backdrop"
          onClick={() => setShowBookingModal(false)}
        >
          <div className="event-program-booking-card" onClick={(event) => event.stopPropagation()}>
            <h2 id="event-booking-title" className="event-program-booking-title">
              Get tickets
            </h2>
            <ClassGuestBookingForm
              activity={activity}
              onEnrolled={(title) => {
                setEnrolledTitle(title);
                setShowBookingModal(false);
              }}
              variant="modal"
            />
            <button
              type="button"
              onClick={() => setShowBookingModal(false)}
              className="event-program-booking-dismiss"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </EventProgramShell>
  );
}

function TicketProviderLogo({
  url,
  name,
}: {
  url?: string | null;
  name?: string | null;
}) {
  const src = url?.trim();
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name ? `${name} logo` : ""}
      width={20}
      height={20}
      className="event-program-ticket-logo"
    />
  );
}
