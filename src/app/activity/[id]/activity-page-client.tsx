"use client";

import { useMemo, useState, useTransition } from "react";

import { CastingPublicShell } from "@/components/casting/CastingPublicShell";
import { ClassGuestBookingForm } from "@/components/product/ClassGuestBookingForm";
import { OpenInAppBar } from "@/components/product/OpenInAppBar";
import { SessionSignUpRequiredModal } from "@/components/product/SessionSignUpRequiredModal";
import { PublicPageAnalytics } from "@/components/analytics/PublicPageAnalytics";
import { requestSessionJoin } from "@/lib/app/activities";
import {
  activityKindLabel,
  effectiveActivityKind,
  formatActivityDateTime,
  formatActivityWhenLine,
  formatMoney,
} from "@/lib/publicActivity";
import type { PublicActivity } from "@/types/public";

type DetailRow = { label: string; value: string };

export default function ActivityPageClient({
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
  const kind = effectiveActivityKind(activity, sharePath);
  const dateLine = formatActivityDateTime(activity);
  const whenLine = formatActivityWhenLine(activity);
  const priceLine = activity.requirePayment
    ? formatMoney(activity.priceAmountCents, activity.priceCurrency ?? "usd")
    : "Free to attend";
  const soldOut = activity.spotsRemaining != null && activity.spotsRemaining <= 0;

  const [enrolledTitle, setEnrolledTitle] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showSessionSignUpGate, setShowSessionSignUpGate] = useState(false);
  const [sessionJoinState, setSessionJoinState] = useState<
    { kind: "idle" } | { kind: "sent"; status: string } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [isJoinPending, startJoinTransition] = useTransition();

  function handleSessionJoin() {
    setSessionJoinState({ kind: "idle" });
    startJoinTransition(async () => {
      const result = await requestSessionJoin(activity.id);
      if (result.ok) {
        setSessionJoinState({ kind: "sent", status: result.status });
        return;
      }
      if (result.reason === "unauthenticated") {
        setShowSessionSignUpGate(true);
        return;
      }
      setSessionJoinState({ kind: "error", message: result.error });
    });
  }

  const isClass = kind === "class";
  const isSession = kind === "session";
  const isEvent = kind === "event";
  const hasExternalTickets = Boolean(activity.externalTicketUrl?.trim());
  const hasMotiionTickets = (activity.ticketOptions?.length ?? 0) > 0 || activity.requirePayment;
  const canBookGuest =
    (isClass || isEvent) &&
    activity.isEligibleForBooking &&
    !enrolledTitle &&
    !soldOut &&
    (!isEvent || hasMotiionTickets);
  const showGuestBookingBar =
    (isClass || (isEvent && hasMotiionTickets)) &&
    activity.isEligibleForBooking &&
    !enrolledTitle;
  const showExternalTicketBar =
    isEvent && hasExternalTickets && !showGuestBookingBar && !enrolledTitle;
  const showSessionActionBar = isSession && activity.isEligibleForBooking;

  const analyticsPath = sharePath.startsWith("/") ? sharePath : `/${sharePath}`;
  const experiencePills = useMemo(() => buildExperiencePills(activity, kind), [activity, kind]);
  const dayOfRows = useMemo(() => buildDayOfRows(activity, kind), [activity, kind]);
  const learningOutcomes = activity.classWhatYouWillLearn?.filter((item) => item.trim()) ?? [];
  const sessionTags = activity.sessionTags?.filter((tag) => tag.trim()) ?? [];

  const bookButtonLabel = enrolledTitle
    ? "Registered"
    : soldOut
      ? "Sold out"
      : !activity.isEligibleForBooking
        ? "Booking closed"
        : activity.requirePayment
          ? isEvent
            ? "Get tickets"
            : "Book"
          : "Reserve spot";

  return (
    <CastingPublicShell>
      <PublicPageAnalytics
        eventName="activity_viewed"
        properties={{ activity_id: activity.id, kind, activity_type: kind }}
        path={analyticsPath}
      />
      <PublicPageAnalytics
        eventName="opportunity_viewed"
        properties={{
          opportunity_id: activity.id,
          activity_type: kind,
        }}
        path={analyticsPath}
      />
      <article
        className="casting-page"
        style={{
          paddingBottom:
            showGuestBookingBar || showSessionActionBar || showExternalTicketBar ? 88 : 24,
        }}
      >
        <header className="casting-page-header">
          <p className="casting-section-title">{activityKindLabel(kind)}</p>
          <h1 className="casting-page-title">{activity.title}</h1>
        </header>

        <div className="casting-page-hero">
          {activity.coverImageURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activity.coverImageURL} alt="" />
          ) : null}
          <div className="casting-page-hero-overlay" />
          <div className="casting-page-hero-meta">
            <p className="casting-page-deadline">{dateLine}</p>
            {activity.location ? <p className="casting-page-location">{activity.location}</p> : null}
          </div>
        </div>

        {activity.organizerDisplayName?.trim() ? (
          <OrganizerRow
            name={activity.organizerDisplayName.trim()}
            headshotURL={activity.organizerHeadshotURL ?? null}
          />
        ) : null}

        <section className="casting-glass-card">
          <dl className="casting-breakdown">
            <BreakdownRow label="Admission" value={priceLine} />
            {whenLine ? <BreakdownRow label="When" value={whenLine} /> : null}
            {activity.location?.trim() ? <BreakdownRow label="Where" value={activity.location.trim()} /> : null}
            {activity.maxAttendees != null ? (
              <BreakdownRow label="Capacity" value={`${activity.maxAttendees} attendees`} />
            ) : null}
            {activity.spotsRemaining != null ? (
              <BreakdownRow
                label="Availability"
                value={soldOut ? "Sold out" : `${activity.spotsRemaining} spots remaining`}
              />
            ) : null}
            {isEvent && (activity.eventDays?.length ?? 0) > 0 ? (
              <BreakdownRow
                label="Days"
                value={String(activity.eventDays?.length ?? 0)}
              />
            ) : null}
          </dl>
        </section>

        {isEvent && activity.externalTicketUrl?.trim() ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Tickets</h2>
            <p
              className="casting-body-copy"
              style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}
            >
              <TicketProviderLogo url={ticketProviderLogoUrl} name={ticketProviderName} />
              <a
                href={activity.externalTicketUrl.trim()}
                target="_blank"
                rel="noreferrer"
                className="casting-inline-link"
              >
                Get tickets
              </a>
            </p>
          </section>
        ) : null}

        {isEvent && (activity.ticketOptions?.length ?? 0) > 0 ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">
              {activity.externalTicketUrl?.trim() ? "Motiion Tickets" : "Tickets"}
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
          </section>
        ) : null}

        {isEvent && (activity.featuredTalent?.length ?? 0) > 0 ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Featured talent</h2>
            <ul style={{ display: "grid", gap: 16, marginTop: 12, padding: 0, listStyle: "none" }}>
              {activity.featuredTalent?.map((talent) => (
                <li key={talent.id}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {talent.headshotUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={talent.headshotUrl}
                        alt=""
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 999,
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          background: "rgba(255,255,255,0.08)",
                        }}
                      >
                        {talent.displayName.slice(0, 1)}
                      </span>
                    )}
                    <div>
                      <p className="casting-body-copy" style={{ margin: 0, fontWeight: 600 }}>
                        {talent.username ? (
                          <a href={`/${talent.username}`} className="casting-inline-link">
                            {talent.displayName}
                          </a>
                        ) : (
                          talent.displayName
                        )}
                      </p>
                      {talent.videoUrl ? (
                        <p className="casting-body-copy" style={{ margin: "4px 0 0" }}>
                          <a
                            href={talent.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="casting-inline-link"
                          >
                            Watch showcase
                          </a>
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {talent.children.length > 0 ? (
                    <ul
                      style={{
                        display: "grid",
                        gap: 10,
                        margin: "12px 0 0",
                        padding: "0 0 0 16px",
                        listStyle: "none",
                        borderLeft: "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      {talent.children.map((child) => (
                        <li key={child.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          {child.headshotUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={child.headshotUrl}
                              alt=""
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 999,
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 999,
                                display: "grid",
                                placeItems: "center",
                                background: "rgba(255,255,255,0.08)",
                                fontSize: 12,
                              }}
                            >
                              {child.displayName.slice(0, 1)}
                            </span>
                          )}
                          <p className="casting-body-copy" style={{ margin: 0 }}>
                            {child.username ? (
                              <a href={`/${child.username}`} className="casting-inline-link">
                                {child.displayName}
                              </a>
                            ) : (
                              child.displayName
                            )}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {experiencePills.length > 0 ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Experience</h2>
            <div className="casting-skill-tags">
              {experiencePills.map((pill) => (
                <span key={pill} className="casting-skill-tag">
                  {pill}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {activity.pricingTiers && activity.pricingTiers.length > 0 ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Tickets</h2>
            <dl className="casting-breakdown">
              {activity.pricingTiers.map((tier) => (
                <BreakdownRow
                  key={tier.id}
                  label={tier.label}
                  value={formatMoney(tier.amountCents, activity.priceCurrency ?? "usd")}
                />
              ))}
            </dl>
          </section>
        ) : null}

        {activity.description?.trim() ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">About</h2>
            <p className="casting-body-copy">{activity.description.trim()}</p>
          </section>
        ) : null}

        {learningOutcomes.length > 0 ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">What you&apos;ll learn</h2>
            <ul className="casting-body-copy" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
              {learningOutcomes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {dayOfRows.length > 0 ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">
              {isClass ? "On the day of the class" : "On the day of the session"}
            </h2>
            <dl className="casting-breakdown">
              {dayOfRows.map((row) => (
                <BreakdownRow key={`${row.label}-${row.value}`} label={row.label} value={row.value} />
              ))}
            </dl>
          </section>
        ) : null}

        {sessionTags.length > 0 ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Tags</h2>
            <div className="casting-skill-tags">
              {sessionTags.map((tag) => (
                <span key={tag} className="casting-skill-tag">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {enrolledTitle ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">You&apos;re registered</h2>
            <p className="casting-body-copy">
              You&apos;re booked for <strong>{enrolledTitle}</strong>. Download the Motiion app to view your
              schedule and get updates.
            </p>
          </section>
        ) : null}

        {!activity.isEligibleForBooking ? (
          <section className="casting-glass-card">
            <p className="casting-body-copy">
              This activity is no longer open for booking on the web. Open Motiion for the latest status.
            </p>
          </section>
        ) : null}
      </article>

      <OpenInAppBar
        href={sharePath}
        label="Open in Motiion"
        hint="Download Motiion for tickets, updates, and the full experience."
      />

      {showExternalTicketBar ? (
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

      {showGuestBookingBar ? (
        <div className="casting-submit-bar">
          <button
            type="button"
            className="casting-submit-button"
            disabled={!canBookGuest}
            onClick={() => {
              if (canBookGuest) setShowBookingModal(true);
            }}
          >
            {bookButtonLabel}
          </button>
        </div>
      ) : null}

      {showSessionActionBar ? (
        <div className="casting-submit-bar">
          {sessionJoinState.kind === "error" ? (
            <p className="casting-body-copy" role="alert" style={{ marginBottom: 8 }}>
              {sessionJoinState.message}
            </p>
          ) : null}
          <button
            type="button"
            className="casting-submit-button"
            disabled={soldOut || isJoinPending || sessionJoinState.kind === "sent"}
            onClick={() => {
              if (!soldOut && sessionJoinState.kind !== "sent") handleSessionJoin();
            }}
          >
            {soldOut
              ? "Session full"
              : sessionJoinState.kind === "sent"
                ? sessionJoinState.status === "joined"
                  ? "You're in"
                  : "Request sent"
                : isJoinPending
                  ? "Sending…"
                  : "Request to join"}
          </button>
        </div>
      ) : null}

      {showBookingModal ? (
        <BookingModal
          activity={activity}
          onClose={() => setShowBookingModal(false)}
          onEnrolled={(title) => {
            setEnrolledTitle(title);
            setShowBookingModal(false);
          }}
        />
      ) : null}

      {showSessionSignUpGate ? (
        <SessionSignUpRequiredModal
          sharePath={sharePath}
          onClose={() => setShowSessionSignUpGate(false)}
        />
      ) : null}
    </CastingPublicShell>
  );
}

function OrganizerRow({ name, headshotURL }: { name: string; headshotURL: string | null }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <p className="casting-page-organizer">
      {headshotURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={headshotURL} alt="" className="casting-page-organizer-avatar" />
      ) : (
        <span className="casting-page-organizer-avatar casting-page-organizer-avatar-fallback" aria-hidden>
          {initials || "?"}
        </span>
      )}
      <span>Posted by {name}</span>
    </p>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="casting-breakdown-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
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

function BookingModal({
  activity,
  onClose,
  onEnrolled,
}: {
  activity: PublicActivity;
  onClose: () => void;
  onEnrolled: (title: string) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="class-booking-title"
      className="casting-modal-backdrop"
      onClick={onClose}
    >
      <div className="casting-modal-card" onClick={(event) => event.stopPropagation()}>
        <h2 id="class-booking-title" className="casting-modal-title">
          {activity.kind === "event"
            ? "Get tickets"
            : activity.kind === "session"
              ? "Book this session"
              : "Book this class"}
        </h2>
        <ClassGuestBookingForm activity={activity} onEnrolled={onEnrolled} variant="modal" />
        <button type="button" onClick={onClose} className="casting-modal-dismiss">
          Cancel
        </button>
      </div>
    </div>
  );
}

function buildExperiencePills(activity: PublicActivity, kind: PublicActivity["kind"]): string[] {
  if (kind === "class") {
    return [activity.classSkillLevel, activity.classFocus, activity.classIntensity].filter(
      (value): value is string => Boolean(value?.trim()),
    );
  }
  if (kind === "session") {
    return [activity.sessionLevel, activity.sessionVibe].filter((value): value is string =>
      Boolean(value?.trim()),
    );
  }
  return [];
}

function buildDayOfRows(activity: PublicActivity, kind: PublicActivity["kind"]): DetailRow[] {
  if (kind === "class") {
    return [
      { label: "Prerequisites", value: activity.classPrerequisites?.trim() ?? "" },
      { label: "Dress code", value: activity.classDressCode?.trim() ?? "" },
      { label: "What to bring", value: activity.classEquipment?.trim() ?? "" },
      { label: "Cancellation policy", value: activity.classCancellationPolicy?.trim() ?? "" },
    ].filter((row) => row.value.length > 0);
  }
  if (kind === "session") {
    return [
      { label: "Rules", value: activity.sessionRules?.trim() ?? "" },
      { label: "Good to know", value: activity.sessionGoodToKnow?.trim() ?? "" },
      { label: "Dress code", value: activity.sessionDressCode?.trim() ?? "" },
      { label: "What to bring", value: activity.sessionEquipment?.trim() ?? "" },
      { label: "Prep material", value: activity.sessionPrepMaterial?.trim() ?? "" },
      { label: "Cancellation policy", value: activity.sessionCancellationPolicy?.trim() ?? "" },
    ].filter((row) => row.value.length > 0);
  }
  return [];
}
