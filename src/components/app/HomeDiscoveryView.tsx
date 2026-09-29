"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, Sparkles, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { homeEventDateLabel } from "@/lib/app/home-event-copy";
import type { HomeEvent } from "@/lib/app/home-discovery";
import {
  loadCommunityRoster,
  loadHomeEventDetail,
  type HomeEventDetail,
  type HomeRosterPerson,
} from "@/app/(app)/home/actions";
import { TalentProfileSheet, type TalentProfileChrome } from "@/components/app/talent-profile/TalentProfileSheet";
import { getProfileInitials } from "@/lib/auth/avatar";
import { primaryTalentLabel } from "@/lib/app/talent-label";
import { useNotificationsPanel } from "@/components/workspace/WorkspaceNotifications";
import { WorkspaceSidePanel } from "@/components/workspace/WorkspaceSidePanel";

const CAST_AVATAR_LIMIT = 3;
const PANEL_ID = "home-discovery-panel";

export type HomeCommunityCard = {
  id: string;
  title: string;
  eyebrow: string;
  image: string | null;
  talentIds: string[];
  subtype: "dancer" | "choreographer" | "instructor" | null;
};

type OpenPanel =
  | { kind: "roster"; cardId: string }
  | { kind: "event"; eventId: string; label: string };

type OpenProfile = { name: string; slug: string };

function rosterTitle(card: HomeCommunityCard) {
  const title = card.title.trim();
  if (/^featured\b/i.test(title)) return title;
  if (card.subtype === "dancer" || /\bdancers?\b/i.test(title)) return "Featured Dancers";
  if (card.subtype === "choreographer" || /\bchoreographers?\b/i.test(title)) return "Featured Choreographers";
  return title;
}

function rosterRole(card: HomeCommunityCard, person: HomeRosterPerson) {
  if (card.subtype === "dancer" || /\bdancers?\b/i.test(card.title)) return "Dancer";
  if (card.subtype === "choreographer" || /\bchoreographers?\b/i.test(card.title)) return "Choreographer";
  return primaryTalentLabel([person.role]);
}

function personMeta(role: string | null, location: string | null) {
  return [role, location].filter(Boolean).join(" · ");
}

function cardDateLabel(date: string | null) {
  if (!date) return "Date to be announced";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function HomeDiscoveryView({
  cards,
  sponsored,
  cast,
  navigatorHref = "/discover",
}: {
  cards: HomeCommunityCard[];
  sponsored: HomeEvent[];
  cast: HomeEvent[];
  navigatorHref?: string;
}) {
  const notifications = useNotificationsPanel();
  const [panel, setPanel] = useState<OpenPanel | null>(null);
  const [roster, setRoster] = useState<HomeRosterPerson[] | null>(null);
  const [eventDetail, setEventDetail] = useState<HomeEventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<OpenProfile | null>(null);
  const [profileTitle, setProfileTitle] = useState<string | null>(null);
  const profilePop = useRef<(() => void) | null>(null);
  const [shareLabel, setShareLabel] = useState("Share");
  const events = [...sponsored, ...cast];
  const rosterCard = panel?.kind === "roster" ? cards.find((card) => card.id === panel.cardId) ?? null : null;
  const selectedEvent = panel?.kind === "event" ? events.find((event) => event.id === panel.eventId) ?? null : null;

  useEffect(() => {
    if (!panel) return;
    let cancelled = false;

    if (panel.kind === "roster") {
      const card = cards.find((item) => item.id === panel.cardId);
      if (!card) return;
      void loadCommunityRoster({ talentIds: card.talentIds, subtype: card.subtype }).then((result) => {
        if (cancelled) return;
        setRoster(result.people);
        setError(result.error);
        setLoading(false);
      });
    } else {
      void loadHomeEventDetail(panel.eventId).then((result) => {
        if (cancelled) return;
        setEventDetail(result.event);
        setError(result.error);
        setLoading(false);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [cards, panel]);

  function openRoster(cardId: string) {
    if (panel?.kind === "roster" && panel.cardId === cardId) {
      setPanel(null);
      return;
    }
    notifications.setOpen(false);
    setRoster(null);
    setProfile(null);
    setError(null);
    setLoading(true);
    setPanel({ kind: "roster", cardId });
  }

  function openEvent(eventId: string, label: string) {
    if (panel?.kind === "event" && panel.eventId === eventId) {
      setPanel(null);
      return;
    }
    notifications.setOpen(false);
    setEventDetail(null);
    setProfile(null);
    setShareLabel("Share");
    setError(null);
    setLoading(true);
    setPanel({ kind: "event", eventId, label });
  }

  function openProfile(person: HomeRosterPerson) {
    if (!person.slug) return;
    profilePop.current = null;
    setProfileTitle(null);
    setProfile({ name: person.name, slug: person.slug });
  }

  const handleProfileChrome = useCallback((chrome: TalentProfileChrome) => {
    profilePop.current = chrome.pop;
    setProfileTitle((current) => current === chrome.title ? current : chrome.title);
  }, []);

  function closeOrPopProfile() {
    if (profilePop.current) {
      profilePop.current();
      return;
    }
    profilePop.current = null;
    setProfileTitle(null);
    setProfile(null);
  }

  async function shareEvent() {
    if (!selectedEvent) return;
    const url = `${window.location.origin}/event/${selectedEvent.id}`;
    const title = eventDetail?.title ?? selectedEvent.title;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    setShareLabel("Link copied");
    window.setTimeout(() => setShareLabel("Share"), 2000);
  }

  const panelTitle = profile
    ? profileTitle || profile.name
    : panel?.kind === "roster"
      ? rosterCard ? rosterTitle(rosterCard) : "Community"
      : panel?.kind === "event"
        ? panel.label
        : "";

  return (
    <>
      <div className="talent-home-discovery">
        <section aria-labelledby="home-community-title">
          <div className="talent-section-heading">
            <div>
              <h2 id="home-community-title">Your community</h2>
              <p>People, inspiration, and what’s happening next.</p>
            </div>
            <Link href={navigatorHref}>
              Open Navigator <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="talent-discovery-cards">
            {cards.map((card, index) => (
              <button
                key={card.id}
                type="button"
                className={`talent-discovery-card talent-discovery-card--${index}`}
                aria-expanded={panel?.kind === "roster" && panel.cardId === card.id}
                aria-controls={PANEL_ID}
                onClick={() => openRoster(card.id)}
              >
                {card.image ? (
                  <Image src={card.image} alt="" fill sizes="(max-width: 700px) 85vw, 33vw" unoptimized />
                ) : (
                  <Users size={64} strokeWidth={1} aria-hidden className="talent-discovery-card-icon" />
                )}
                <div>
                  <span>{card.eyebrow}</span>
                  <h3>{card.title}</h3>
                  <span className="talent-discovery-card-action">
                    Explore <ArrowUpRight size={16} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
        <EventRail events={sponsored} label="Motiion Events" onOpen={openEvent} activeId={panel?.kind === "event" ? panel.eventId : null} />
        <CastRail events={cast} onOpen={openEvent} activeId={panel?.kind === "event" ? panel.eventId : null} />
      </div>

      <WorkspaceSidePanel
        id={PANEL_ID}
        open={panel !== null && !notifications.open}
        title={panelTitle}
        onClose={() => {
          profilePop.current = null;
          setProfileTitle(null);
          setProfile(null);
          setPanel(null);
        }}
        leading={profile ? (
          <button type="button" className="workspace-notifications__close" aria-label={profileTitle ? "Back" : "Back to the list"} onClick={closeOrPopProfile}>
            <ChevronLeft size={18} aria-hidden />
          </button>
        ) : null}
        actions={!profile && panel?.kind === "event" ? (
          <button type="button" className="workspace-notifications__mark" onClick={() => void shareEvent()}>
            {shareLabel}
          </button>
        ) : null}
      >
        {profile ? <TalentProfileSheet key={profile.slug} slug={profile.slug} onChrome={handleProfileChrome} /> : null}
        {!profile && panel?.kind === "roster" ? (
          <PersonList
            people={roster ?? []}
            loading={loading}
            error={error}
            empty="No one to show in this list yet."
            roleFor={rosterCard ? (person) => rosterRole(rosterCard, person) : undefined}
            onOpen={openProfile}
          />
        ) : null}
        {!profile && panel?.kind === "event" && selectedEvent ? (
          <EventDetail
            event={selectedEvent}
            detail={eventDetail}
            loading={loading}
            error={error}
            onOpen={openProfile}
          />
        ) : null}
      </WorkspaceSidePanel>
    </>
  );
}

function CastRail({
  events,
  onOpen,
  activeId,
}: {
  events: HomeEvent[];
  onOpen: (eventId: string, label: string) => void;
  activeId: string | null;
}) {
  if (!events.length) return null;
  return (
    <section aria-labelledby="home-cast-title">
      <div className="talent-section-heading">
        <div>
          <h2 id="home-cast-title">Meet the Cast</h2>
          <p>Explore the people behind upcoming and featured events.</p>
        </div>
      </div>
      <CoverRail events={events} label="Meet the Cast" onOpen={onOpen} activeId={activeId} />
    </section>
  );
}

function EventRail({
  events,
  label,
  onOpen,
  activeId,
}: {
  events: HomeEvent[];
  label: string;
  onOpen: (eventId: string, label: string) => void;
  activeId: string | null;
}) {
  if (!events.length) return null;
  return (
    <section aria-labelledby="home-events-title">
      <div className="talent-section-heading">
        <div>
          <h2 id="home-events-title">Motiion Events</h2>
          <p>Get together with the Motiion community.</p>
        </div>
      </div>
      <CoverRail events={events} label={label} sponsored onOpen={onOpen} activeId={activeId} />
    </section>
  );
}

function CoverRail({
  events,
  label,
  sponsored = false,
  onOpen,
  activeId,
}: {
  events: HomeEvent[];
  label: string;
  sponsored?: boolean;
  onOpen: (eventId: string, label: string) => void;
  activeId: string | null;
}) {
  return (
    <div className="talent-cast-rail">
      {events.slice(0, 8).map((event) => {
        const people = event.people ?? [];
        const shown = people.slice(0, CAST_AVATAR_LIMIT);
        const extra = Math.max(0, people.length - shown.length);
        return (
          <button
            type="button"
            className="talent-cast-card"
            key={event.id}
            aria-expanded={activeId === event.id}
            aria-controls={PANEL_ID}
            onClick={() => onOpen(event.id, label)}
          >
            {event.cover_image_url ? (
              <Image src={event.cover_image_url} alt="" fill sizes="(max-width: 767px) 220px, 280px" unoptimized />
            ) : null}
            {sponsored ? (
              <span className="talent-cast-card__chip">
                <Sparkles size={12} aria-hidden />
                Motiion
              </span>
            ) : null}
            <div className="talent-cast-card__copy">
              <p className="talent-cast-card__eyebrow">{cardDateLabel(event.activity_date)}</p>
              <h3 className="talent-cast-card__title">{event.title}</h3>
              {shown.length ? (
                <div className="talent-cast-card__people" aria-label={people.map((person) => person.name).join(", ")}>
                  {shown.map((person) =>
                    person.src ? (
                      <Image key={person.userId} src={person.src} alt="" width={36} height={36} unoptimized />
                    ) : (
                      <span key={person.userId} aria-hidden>
                        {person.name.charAt(0).toUpperCase()}
                      </span>
                    ),
                  )}
                  {extra > 0 ? <span aria-hidden>+{extra}</span> : null}
                </div>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function EventDetail({
  event,
  detail,
  loading,
  error,
  onOpen,
}: {
  event: HomeEvent;
  detail: HomeEventDetail | null;
  loading: boolean;
  error: string | null;
  onOpen: (person: HomeRosterPerson) => void;
}) {
  const title = detail?.title ?? event.title;
  const cover = detail?.coverUrl ?? event.cover_image_url;
  const dateLabel = detail?.dateLabel ?? homeEventDateLabel(event.activity_date, event.start_time);

  return (
    <div className="home-event-panel">
      <div className="home-event-panel__cover">
        {cover ? (
          <Image src={cover} alt="" fill sizes="480px" unoptimized style={{ objectPosition: "center bottom" }} />
        ) : null}
        <h3>{title}</h3>
      </div>
      <p className="home-event-panel__date">{dateLabel}</p>
      {error ? <p className="home-panel-status">{error}</p> : null}
      {loading && !detail ? <p className="home-panel-status">Loading cast…</p> : null}
      {detail?.emptyMessage ? <p className="home-panel-status">{detail.emptyMessage}</p> : null}
      {detail?.sections.map((section) =>
        section.people.length ? (
          <section key={section.id}>
            {section.title ? (
              <div className="home-event-panel__section">
                <h4>{section.title}</h4>
                {section.detail ? <p>{section.detail}</p> : null}
              </div>
            ) : null}
            <PersonRows people={section.people} onOpen={onOpen} />
          </section>
        ) : null,
      )}
    </div>
  );
}

function PersonList({
  people,
  loading,
  error,
  empty,
  roleFor,
  onOpen,
}: {
  people: HomeRosterPerson[];
  loading: boolean;
  error: string | null;
  empty: string;
  roleFor?: (person: HomeRosterPerson) => string | null;
  onOpen: (person: HomeRosterPerson) => void;
}) {
  if (loading && !people.length) return <p className="home-panel-status">Loading…</p>;
  if (error) return <p className="home-panel-status">{error}</p>;
  if (!people.length) return <p className="home-panel-status">{empty}</p>;
  return <PersonRows people={people} roleFor={roleFor} onOpen={onOpen} />;
}

function PersonRows({
  people,
  roleFor,
  onOpen,
}: {
  people: HomeRosterPerson[];
  roleFor?: (person: HomeRosterPerson) => string | null;
  onOpen: (person: HomeRosterPerson) => void;
}) {
  return (
    <ul className="home-panel-people">
      {people.map((person) => {
        const meta = personMeta(roleFor ? roleFor(person) : person.role, person.location);
        return (
          <li key={person.id}>
            <button type="button" className="home-panel-row" onClick={() => onOpen(person)} disabled={!person.slug}>
              {person.avatarUrl ? (
                <Image className="home-panel-row__avatar" src={person.avatarUrl} alt="" width={40} height={40} unoptimized />
              ) : (
                <span className="home-panel-row__avatar" aria-hidden>{getProfileInitials(person.name) || "?"}</span>
              )}
              <span className="home-panel-row__copy">
                <span className="home-panel-row__name">{person.name}</span>
                {meta ? <span className="home-panel-row__meta">{meta}</span> : null}
              </span>
              <ChevronRight className="home-panel-row__chevron" size={16} aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
