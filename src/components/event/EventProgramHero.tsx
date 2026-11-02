import type { ReactNode } from "react";

function initial(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

export function EventProgramHero({
  title,
  eyebrow,
  imageUrl,
  children,
}: {
  title: string;
  eyebrow: string;
  imageUrl: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="event-program-showcase-hero">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" />
      ) : (
        <div className="event-program-showcase-hero-fallback">{initial(title)}</div>
      )}
      <div className="event-program-showcase-hero-overlay" />
      <div className="event-program-showcase-hero-content">
        <p className="event-program-eyebrow">{eyebrow}</p>
        <h1 className="event-program-showcase-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function eventProgramHeroImageUrl(activity: {
  coverImageURL?: string | null;
  featuredTalent?: { headshotUrl?: string | null }[] | null;
}): string | null {
  const cover = activity.coverImageURL?.trim();
  if (cover) return cover;
  const headshot = activity.featuredTalent?.[0]?.headshotUrl?.trim();
  if (headshot) return headshot;
  return null;
}
