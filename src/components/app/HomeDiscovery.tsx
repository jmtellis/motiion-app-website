import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Sparkles, Users } from "lucide-react";
import { fetchHomeCollections, fetchHomeEvents, type HomeEvent } from "@/lib/app/home-discovery";

const CAST_AVATAR_LIMIT = 3;

function eventDateLabel(date: string | null) {
  if (!date) return "Date to be announced";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export async function HomeDiscovery() {
  const [collections, events] = await Promise.all([fetchHomeCollections(), fetchHomeEvents()]);
  const cards = collections.length ? collections.slice(0, 3).map(row => ({ title: row.headline, eyebrow: row.eyebrow ?? "Featured", image: row.image_url, href: `/discover?collection=${row.id}` })) : [
    { title: "Discover dancers", eyebrow: "Find your community", image: null, href: "/discover?subtype=dancer" },
    { title: "Meet choreographers", eyebrow: "Explore creative voices", image: null, href: "/discover?subtype=choreographer" },
    { title: "Find instructors", eyebrow: "Keep growing", image: null, href: "/discover?subtype=instructor" },
  ];
  return <div className="talent-home-discovery">
    <section aria-labelledby="home-community-title">
      <div className="talent-section-heading"><div><h2 id="home-community-title">Your community</h2><p>People, inspiration, and what’s happening next.</p></div><Link href="/discover">Open Navigator <ArrowUpRight size={16}/></Link></div>
      <div className="talent-discovery-cards">{cards.map((card, index) => <Link key={card.href} href={card.href} className={`talent-discovery-card talent-discovery-card--${index}`}>
        {card.image ? <Image src={card.image} alt="" fill sizes="(max-width: 700px) 85vw, 33vw" unoptimized /> : <Users size={64} strokeWidth={1} aria-hidden className="talent-discovery-card-icon" />}
        <div><span>{card.eyebrow}</span><h3>{card.title}</h3><span className="talent-discovery-card-action">Explore <ArrowUpRight size={16}/></span></div>
      </Link>)}</div>
    </section>
    <EventRail events={events.sponsored} />
    <CastRail events={events.cast} />
  </div>;
}

function CastRail({ events }: { events: HomeEvent[] }) {
  if (!events.length) return null;
  return <section aria-labelledby="home-cast-title">
    <div className="talent-section-heading"><div><h2 id="home-cast-title">Meet the Cast</h2><p>Explore the people behind upcoming and featured events.</p></div></div>
    <CoverRail events={events} />
  </section>;
}

function EventRail({ events }: { events: HomeEvent[] }) {
  if (!events.length) return null;
  return <section aria-labelledby="home-events-title">
    <div className="talent-section-heading"><div><h2 id="home-events-title">Motiion Events</h2><p>Get together with the Motiion community.</p></div></div>
    <CoverRail events={events} sponsored />
  </section>;
}

function CoverRail({ events, sponsored = false }: { events: HomeEvent[]; sponsored?: boolean }) {
  return <div className="talent-cast-rail">{events.slice(0, 8).map(event => {
      const people = event.people ?? [];
      const shown = people.slice(0, CAST_AVATAR_LIMIT);
      const extra = Math.max(0, people.length - shown.length);
      return <Link href={`/event/${event.id}`} className="talent-cast-card" key={event.id}>
        {event.cover_image_url ? <Image src={event.cover_image_url} alt="" fill sizes="(max-width: 767px) 220px, 280px" unoptimized /> : null}
        {sponsored ? <span className="talent-cast-card__chip"><Sparkles size={12} aria-hidden />Motiion</span> : null}
        <div className="talent-cast-card__copy">
          <p className="talent-cast-card__eyebrow">{eventDateLabel(event.activity_date)}</p>
          <h3 className="talent-cast-card__title">{event.title}</h3>
          {shown.length ? <div className="talent-cast-card__people" aria-label={people.map(person => person.name).join(", ")}>
            {shown.map(person => person.src
              ? <Image key={person.userId} src={person.src} alt="" width={36} height={36} unoptimized />
              : <span key={person.userId} aria-hidden>{person.name.charAt(0).toUpperCase()}</span>)}
            {extra > 0 ? <span aria-hidden>+{extra}</span> : null}
          </div> : null}
        </div>
      </Link>;
    })}</div>;
}
