"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CastingPublicShell } from "@/components/casting/CastingPublicShell";
import { ClassGuestBookingForm } from "@/components/product/ClassGuestBookingForm";
import { OpenInAppBar } from "@/components/product/OpenInAppBar";
import { PublicPageAnalytics } from "@/components/analytics/PublicPageAnalytics";
import {
  eventHeroEyebrow,
  eventHeroSubtitle,
  featuredTalentPath,
  formatActivityDateTime,
  formatActivityWhenLine,
  formatEventScheduleTime,
  formatMoney,
  mapsUrlForLocation,
} from "@/lib/publicActivity";
import type { PublicActivity, PublicEventHost, PublicFeaturedTalent } from "@/types/public";

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
  const showGuestBooking =
    hasMotiionTickets && activity.isEligibleForBooking && !enrolledTitle;
  const showExternalTickets =
    hasExternalTickets && !showGuestBooking && !enrolledTitle;
  const showFullMetadata = activity.requirePayment;

  const analyticsPath = sharePath.startsWith("/") ? sharePath : `/${sharePath}`;
  const whenLine = formatActivityWhenLine(activity);
  const dateLine = formatActivityDateTime(activity);
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
  const featured = activity.featuredTalent ?? [];

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
    <CastingPublicShell>
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

      <article
        className="event-showcase-page"
        style={{
          paddingBottom: showGuestBooking || showExternalTickets ? 88 : 24,
        }}
      >
        <header className="event-showcase-hero">
          {activity.coverImageURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activity.coverImageURL} alt="" />
          ) : null}
          <div className="event-showcase-hero-overlay" />
          <div className="event-showcase-hero-content">
            <p className="event-showcase-eyebrow">{eventHeroEyebrow(activity)}</p>
            <h1 className="event-showcase-title">{activity.title}</h1>
            <p className="event-showcase-subtitle">{eventHeroSubtitle(activity)}</p>
            {(showGuestBooking || showExternalTickets) && !enrolledTitle ? (
              <div className="event-showcase-hero-actions">
                {showGuestBooking ? (
                  <button
                    type="button"
                    className="casting-btn-primary"
                    disabled={!canBookGuest}
                    onClick={() => {
                      if (canBookGuest) setShowBookingModal(true);
                    }}
                  >
                    {bookLabel}
                  </button>
                ) : (
                  <a
                    href={activity.externalTicketUrl!.trim()}
                    target="_blank"
                    rel="noreferrer"
                    className="casting-btn-primary"
                    style={{ gap: 8 }}
                  >
                    <TicketProviderLogo url={ticketProviderLogoUrl} name={ticketProviderName} />
                    Get tickets
                  </a>
                )}
              </div>
            ) : null}
          </div>
        </header>

        <section className="casting-glass-card">
          <h2 className="casting-section-title">Event Guide</h2>
          <div className="event-guide-card">
            {hosts.length > 0 ? (
              <div className="event-guide-row">
                <span className="event-guide-icon" aria-hidden>
                  👥
                </span>
                <div className="event-guide-body">
                  <p className="event-guide-title">Hosts</p>
                  <p className="event-guide-subtitle">
                    {hosts.map((host) => host.displayName).join(", ")}
                  </p>
                </div>
                <div className="event-guide-hosts" aria-hidden>
                  {hosts.slice(0, 4).map((host) =>
                    host.headshotUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={host.userId}
                        src={host.headshotUrl}
                        alt=""
                        className="event-guide-host-avatar"
                      />
                    ) : (
                      <span
                        key={host.userId}
                        className="event-guide-host-avatar"
                        style={{ display: "grid", placeItems: "center", fontSize: 11 }}
                      >
                        {host.displayName.slice(0, 1)}
                      </span>
                    ),
                  )}
                </div>
              </div>
            ) : null}

            <div className="event-guide-row">
              <span className="event-guide-icon" aria-hidden>
                📅
              </span>
              <div className="event-guide-body">
                <p className="event-guide-title">{dateLine}</p>
                {whenLine && whenLine !== activity.activityDate ? (
                  <p className="event-guide-subtitle">{whenLine}</p>
                ) : activity.startTime ? (
                  <p className="event-guide-subtitle">{activity.startTime.slice(0, 5)}</p>
                ) : null}
              </div>
            </div>

            {activity.location?.trim() ? (
              <div className="event-guide-row">
                <span className="event-guide-icon" aria-hidden>
                  📍
                </span>
                <div className="event-guide-body">
                  <p className="event-guide-title">{activity.location.trim()}</p>
                </div>
                <a
                  className="event-guide-link"
                  href={mapsUrlForLocation(activity.location)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Maps
                </a>
              </div>
            ) : null}
          </div>
        </section>

        {showGuestBooking && (activity.ticketOptions?.length ?? 0) > 0 ? (
          <section className="casting-glass-card" id="tickets">
            <h2 className="casting-section-title">
              {hasExternalTickets ? "Motiion Tickets" : "Tickets"}
            </h2>
            <ul className="casting-body-copy" style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {activity.ticketOptions?.map((ticket) => (
                <li key={ticket.id}>
                  <strong>{ticket.label}</strong>
                  {" — "}
                  {formatMoney(ticket.amountCents, ticket.currency || activity.priceCurrency || "usd")}
                </li>
              ))}
            </ul>
            {canBookGuest ? (
              <button
                type="button"
                className="casting-btn-primary"
                style={{ marginTop: 14, width: "100%" }}
                onClick={() => setShowBookingModal(true)}
              >
                {bookLabel}
              </button>
            ) : null}
          </section>
        ) : null}

        {showExternalTickets ? (
          <section className="casting-glass-card" id="tickets">
            <h2 className="casting-section-title">Tickets</h2>
            <p
              className="casting-body-copy"
              style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}
            >
              <TicketProviderLogo url={ticketProviderLogoUrl} name={ticketProviderName} />
              <a
                href={activity.externalTicketUrl!.trim()}
                target="_blank"
                rel="noreferrer"
                className="casting-inline-link"
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
          <section className="casting-glass-card" id="tickets">
            <h2 className="casting-section-title">Tickets</h2>
            <dl className="casting-breakdown">
              {activity.pricingTiers.map((tier) => (
                <div key={tier.id} className="casting-breakdown-row">
                  <dt>{tier.label}</dt>
                  <dd>{formatMoney(tier.amountCents, activity.priceCurrency ?? "usd")}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {enrolledTitle ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">You&apos;re Registered</h2>
            <p className="casting-body-copy">
              You&apos;re booked for <strong>{enrolledTitle}</strong>. Download the Motiion app to
              view your schedule and get updates.
            </p>
          </section>
        ) : null}

        {activity.description?.trim() ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">About</h2>
            <p className="casting-body-copy">{activity.description.trim()}</p>
          </section>
        ) : null}

        {featured.length > 0 ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Featured Talent</h2>
            <div className="event-featured-grid">
              {featured.map((talent) => (
                <FeaturedTalentCell key={talent.id} activityId={activity.id} talent={talent} />
              ))}
            </div>
          </section>
        ) : null}

        {showFullMetadata && highlights.length > 0 ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Event Highlights</h2>
            <ul className="event-bullet-list" style={{ marginTop: 10 }}>
              {highlights.slice(0, 5).map((item) => (
                <li key={item}>
                  <span className="event-bullet-mark" aria-hidden>
                    ✦
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {showFullMetadata && lineup.length > 0 ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Lineup / Featured</h2>
            <ul className="event-bullet-list" style={{ marginTop: 10 }}>
              {lineup.map((item) => (
                <li key={item}>
                  <span className="event-bullet-mark" aria-hidden>
                    ★
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {showFullMetadata && scheduleItems.length > 0 ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Schedule</h2>
            <dl className="casting-breakdown" style={{ marginTop: 10 }}>
              {scheduleItems.map((item) => (
                <div key={item.id} className="casting-breakdown-row">
                  <dt>{formatEventScheduleTime(item.time) ?? "—"}</dt>
                  <dd>{item.title}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {showFullMetadata && detailRows.length > 0 ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Event Details</h2>
            <dl className="casting-breakdown" style={{ marginTop: 10 }}>
              {detailRows.map((row) => (
                <div key={row.label} className="casting-breakdown-row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {showFullMetadata && policyRows.length > 0 ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Policies</h2>
            <dl className="casting-breakdown" style={{ marginTop: 10 }}>
              {policyRows.map((row) => (
                <div key={row.label} className="casting-breakdown-row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {!activity.isEligibleForBooking && !enrolledTitle ? (
          <section className="casting-glass-card">
            <p className="casting-body-copy">
              This event is no longer open for booking on the web. Open Motiion for the latest
              status.
            </p>
          </section>
        ) : null}
      </article>

      <OpenInAppBar
        href={sharePath}
        label="Open in Motiion"
        hint="Download Motiion for tickets, updates, and the full event experience."
      />

      {showExternalTickets ? (
        <div className="casting-submit-bar">
          <a
            href={activity.externalTicketUrl!.trim()}
            target="_blank"
            rel="noreferrer"
            className="casting-submit-button"
            style={{ gap: 8 }}
          >
            <TicketProviderLogo url={ticketProviderLogoUrl} name={ticketProviderName} />
            Get tickets
          </a>
        </div>
      ) : null}

      {showGuestBooking ? (
        <div className="casting-submit-bar">
          <button
            type="button"
            className="casting-submit-button"
            disabled={!canBookGuest}
            onClick={() => {
              if (canBookGuest) setShowBookingModal(true);
            }}
          >
            {bookLabel}
          </button>
        </div>
      ) : null}

      {showBookingModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-booking-title"
          className="casting-modal-backdrop"
          onClick={() => setShowBookingModal(false)}
        >
          <div className="casting-modal-card" onClick={(event) => event.stopPropagation()}>
            <h2 id="event-booking-title" className="casting-modal-title">
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
              className="casting-modal-dismiss"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </CastingPublicShell>
  );
}

function FeaturedTalentCell({
  activityId,
  talent,
}: {
  activityId: string;
  talent: PublicFeaturedTalent;
}) {
  const href = featuredTalentPath(activityId, talent.userId);
  const nested = talent.children.length;
  return (
    <Link href={href} className="event-featured-cell">
      <div className="event-featured-portrait">
        {talent.headshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={talent.headshotUrl} alt="" />
        ) : (
          <div className="event-featured-portrait-fallback">
            {talent.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <p className="event-featured-name">{talent.displayName}</p>
      {nested > 0 ? (
        <p className="event-featured-meta">
          {nested === 1 ? "1 performer" : `${nested} performers`}
        </p>
      ) : null}
    </Link>
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
      style={{
        width: 20,
        height: 20,
        borderRadius: 5,
        objectFit: "contain",
        background: "#fff",
        flexShrink: 0,
      }}
    />
  );
}
