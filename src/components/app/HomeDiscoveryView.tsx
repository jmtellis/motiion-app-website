"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { billedArtistsEyebrow } from "@/lib/app/event-artists";
import type { HomeEvent } from "@/lib/app/home-discovery";
import { refreshFeaturedHomeContent } from "@/app/(app)/home/actions";
import { discoverDetailHref } from "@/lib/app/discover-paths";

const CAST_AVATAR_LIMIT = 3;

export type HomeCommunityCard = {
  id: string;
  title: string;
  eyebrow: string;
  image: string | null;
  talentIds: string[];
  subtype: "dancer" | "choreographer" | "instructor" | null;
};

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
  upcomingSlot,
  cards,
  sponsored,
  cast,
  navigatorHref = "/discover",
  detailBasePath = "/discover",
  from = "discover",
}: {
  upcomingSlot?: ReactNode;
  cards: HomeCommunityCard[];
  sponsored: HomeEvent[];
  cast: HomeEvent[];
  navigatorHref?: string | null;
  /** Prefix for collection/event detail routes (`/discover` or `/talent`). */
  detailBasePath?: "/discover" | "/talent";
  /** Passed as `?from=` so detail pages know where Back should go. */
  from?: string;
}) {
  const router = useRouter();
  useEffect(() => {
    const key = "motiion:home-cms-refresh";
    try {
      const last = Number(window.sessionStorage.getItem(key) ?? 0);
      if (Date.now() - last < 5 * 60 * 1000) return;
      window.sessionStorage.setItem(key, String(Date.now()));
    } catch {
      return;
    }
    let cancelled = false;
    void refreshFeaturedHomeContent()
      .then((result) => {
        if (result.refreshed && !cancelled) router.refresh();
      })
      .catch(() => {
        /* Keep the last synced content visible. */
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="talent-home-discovery discover-skel-enter">
      <section aria-labelledby="home-community-title">
        <div className="talent-section-heading">
          <div>
            <h2 id="home-community-title">Talent</h2>
            <p>Discover the talent on Motiion.</p>
          </div>
          {navigatorHref ? (
            <Link href={navigatorHref}>
              Open Navigator <ArrowUpRight size={16} />
            </Link>
          ) : null}
        </div>
        <div className="talent-discovery-cards">
          {cards.map((card, index) => (
            <Link
              key={card.id}
              href={discoverDetailHref(detailBasePath, "collection", card.id, from)}
              className={`talent-discovery-card talent-discovery-card--${index}`}
            >
              {card.image ? (
                <Image
                  src={card.image}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 85vw, 33vw"
                  unoptimized
                />
              ) : (
                <Users
                  size={64}
                  strokeWidth={1}
                  aria-hidden
                  className="talent-discovery-card-icon"
                />
              )}
              <div>
                <span>{card.eyebrow}</span>
                <h3>{card.title}</h3>
                <span className="talent-discovery-card-action">
                  Explore <ArrowUpRight size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      {upcomingSlot}
      <EventRail
        events={sponsored}
        label="Featured events"
        detailBasePath={detailBasePath}
        from={from}
      />
      <CastRail events={cast} detailBasePath={detailBasePath} from={from} />
    </div>
  );
}

function CastRail({
  events,
  detailBasePath,
  from,
}: {
  events: HomeEvent[];
  detailBasePath: "/discover" | "/talent";
  from: string;
}) {
  if (!events.length) return null;
  return (
    <section aria-labelledby="home-cast-title">
      <div className="talent-section-heading">
        <div>
          <h2 id="home-cast-title">Featured cast</h2>
          <p>Explore the people behind upcoming and featured events.</p>
        </div>
      </div>
      <CoverRail
        events={events}
        sponsored={false}
        detailBasePath={detailBasePath}
        from={from}
      />
    </section>
  );
}

function EventRail({
  events,
  label,
  detailBasePath,
  from,
}: {
  events: HomeEvent[];
  label: string;
  detailBasePath: "/discover" | "/talent";
  from: string;
}) {
  if (!events.length) return null;
  return (
    <section aria-labelledby="home-events-title">
      <div className="talent-section-heading">
        <div>
          <h2 id="home-events-title">{label}</h2>
          <p>Get together with the Motiion community.</p>
        </div>
      </div>
      <CoverRail
        events={events}
        sponsored
        detailBasePath={detailBasePath}
        from={from}
      />
    </section>
  );
}

function CoverRail({
  events,
  sponsored = false,
  detailBasePath,
  from,
}: {
  events: HomeEvent[];
  sponsored?: boolean;
  detailBasePath: "/discover" | "/talent";
  from: string;
}) {
  return (
    <div className="talent-cast-rail">
      {events.slice(0, 8).map((event) => {
        const people = event.people ?? [];
        const shown = people.slice(0, CAST_AVATAR_LIMIT);
        const extra = Math.max(0, people.length - shown.length);
        const eyebrow = sponsored
          ? cardDateLabel(event.activity_date)
          : billedArtistsEyebrow(event.event_type_data);
        return (
          <Link
            key={event.id}
            href={discoverDetailHref(detailBasePath, "event", event.id, from)}
            className="ui-media-card"
          >
            <span className="ui-media-card__media">
              {event.cover_image_url ? (
                <Image
                  src={event.cover_image_url}
                  alt=""
                  fill
                  sizes="(max-width: 767px) 240px, 296px"
                  unoptimized
                />
              ) : (
                <CalendarDays size={28} strokeWidth={1.6} aria-hidden />
              )}
              {sponsored ? (
                <span className="ui-media-card__chip">
                  <Sparkles size={12} aria-hidden />
                  Motiion
                </span>
              ) : null}
            </span>
            <span className="ui-media-card__body">
              {eyebrow ? <span className="ui-media-card__eyebrow">{eyebrow}</span> : null}
              <h3 className="ui-media-card__title">{event.title}</h3>
              <span className="ui-media-card__footer">
                <span className="ui-media-card__cta">
                  {sponsored ? "View event" : "Meet the cast"}
                </span>
                {shown.length ? (
                  <span
                    className="ui-media-card__people"
                    aria-label={people.map((person) => person.name).join(", ")}
                  >
                    {shown.map((person) =>
                      person.src ? (
                        <Image
                          key={person.userId}
                          src={person.src}
                          alt=""
                          width={28}
                          height={28}
                          unoptimized
                        />
                      ) : (
                        <span key={person.userId} aria-hidden>
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                      ),
                    )}
                    {extra > 0 ? <span aria-hidden>+{extra}</span> : null}
                  </span>
                ) : null}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
