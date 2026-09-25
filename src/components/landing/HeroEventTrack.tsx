import type { HeroEventCard } from "@/lib/marketing/hero-events";

function EventCard({ card }: { card: HeroEventCard }) {
  return (
    <article className="home-split__event" data-live={card.live ? "true" : "false"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {card.image ? <img className="home-split__event-image" src={card.image} alt="" style={{ objectPosition: card.imagePosition }} /> : null}
      <div className="home-split__event-copy">
        <p className="home-split__event-eyebrow">{card.eyebrow}</p>
        <p className="home-split__event-title">{card.title}</p>
      <div className="home-split__event-people">
        {card.avatars.map((avatar, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          avatar.src ? <img key={`${card.id}-${index}`} src={avatar.src} alt="" /> : <span key={`${card.id}-${index}`}>{avatar.name.charAt(0).toUpperCase()}</span>
        ))}
        {card.extra > 0 ? <span>+{card.extra}</span> : null}
      </div>
      </div>
    </article>
  );
}

export function HeroEventTrack({ cards }: { cards: HeroEventCard[] }) {
  if (!cards.length) return null;
  const loop = [...cards, ...cards];
  return (
    <div className="home-split__events" aria-hidden>
      <div className="home-split__events-track">
        {loop.map((card, index) => (
          <EventCard key={`${card.id}-${index}`} card={card} />
        ))}
      </div>
    </div>
  );
}
