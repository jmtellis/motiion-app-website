"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroEventCard } from "@/lib/marketing/hero-events";

function EventCard({ card }: { card: HeroEventCard }) {
  return (
    <article className="home-split__event" data-live={card.live ? "true" : "false"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {card.image ? <img className="home-split__event-image" src={card.image} alt="" loading="eager" decoding="async" style={{ objectPosition: card.imagePosition }} /> : null}
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [minimumCards, setMinimumCards] = useState(8);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Each repeated half must cover the entire viewport, including wide screens.
    const observer = new ResizeObserver(([entry]) => {
      const cardWidth = window.matchMedia("(max-width: 767px)").matches ? 220 : 280;
      setMinimumCards(Math.ceil(entry.contentRect.width / (cardWidth + 16)) + 1);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [cards.length]);

  if (!cards.length) return null;
  const repeats = Math.max(1, Math.ceil(minimumCards / cards.length));
  const sequence = Array.from({ length: repeats }, () => cards).flat();

  return (
    <div ref={containerRef} className="home-split__events" aria-hidden>
      <div className="home-split__events-track">
        {[0, 1].map(copy => (
          <div className="home-split__events-group" key={copy}>
            {sequence.map((card, index) => <EventCard key={`${card.id}-${index}`} card={card} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
