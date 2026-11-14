"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { discoverDetailHref } from "@/lib/app/discover-paths";

import { DiscoverBackHeader } from "@/components/app/DiscoverBackHeader";
import { EventProgramHero, eventProgramHeroImageUrl } from "@/components/event/EventProgramHero";
import {
  featuredTalentEmptyMessage,
  featuredTalentSectionTitle,
  programCastNodes,
  programHeroEyebrow,
  resolveTalentAppearance,
} from "@/lib/publicActivity";
import type { Talent } from "@/lib/talent-navigator/types";
import type { PublicActivity, PublicFeaturedTalent } from "@/types/public";

import "@/app/casting/casting.css";

function initial(name: string) {
  return name.slice(0, 1).toUpperCase();
}

function talentFromFeatured(node: PublicFeaturedTalent): Talent | null {
  const id = node.userId || node.id;
  if (!id) return null;
  return {
    id,
    slug: node.username?.trim() || node.userId || node.id,
    name: node.displayName,
    imageUrl: node.headshotUrl || "",
    styles: [],
    location: node.location?.trim() || undefined,
    talentTypes: node.talentTypes ?? undefined,
  };
}

function StudioCastGrid({
  featured,
  appearance,
  profileBasePath,
  from,
}: {
  featured: PublicFeaturedTalent[];
  appearance: ReturnType<typeof resolveTalentAppearance>;
  profileBasePath: "/discover" | "/talent";
  from: string;
}) {
  return (
    <section className="event-program-cast-section">
      <h2 className="event-program-cast-heading">{featuredTalentSectionTitle(appearance)}</h2>
      {featured.length === 0 ? (
        <p className="event-program-empty-copy">{featuredTalentEmptyMessage(appearance)}</p>
      ) : (
        <div className="discover-browse__grid event-program-cast-browse">
          {featured.map((talent) => {
            const person = talentFromFeatured(talent);
            const photo = (
              <span className="discover-browse-card__photo">
                {talent.headshotUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={talent.headshotUrl} alt="" loading="lazy" />
                ) : (
                  <span className="discover-browse-card__initial">{initial(talent.displayName)}</span>
                )}
              </span>
            );
            const copy = (
              <span className="discover-browse-card__copy">
                <strong>{talent.displayName}</strong>
                <small>
                  <MapPin size={12} aria-hidden />
                  {talent.location?.trim() || "Location TBD"}
                </small>
              </span>
            );
            return person ? (
              <Link
                key={talent.id}
                href={discoverDetailHref(profileBasePath, "profile", person.slug, from)}
                className="discover-browse-card"
                aria-label={`Open ${talent.displayName} profile`}
              >
                {photo}
                {copy}
              </Link>
            ) : (
              <div key={talent.id} className="discover-browse-card">
                {photo}
                {copy}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Public event program layout, light theme, inside the studio shell. */
export function DiscoverStudioEventView({
  activity,
  backHref,
  profileBasePath = "/discover",
}: {
  activity: PublicActivity;
  backHref: string;
  profileBasePath?: "/discover" | "/talent";
}) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const from = `${pathname}${query ? `?${query}` : ""}`;
  const appearance = resolveTalentAppearance(activity);
  const featured = programCastNodes(activity);
  const ctaLabel =
    activity.requirePayment || activity.externalTicketUrl
      ? "Event details & tickets"
      : "View event details";

  return (
    <div className="discover-detail discover-detail--event discover-skel-enter">
      <DiscoverBackHeader href={backHref} title={activity.title} subtitle={programHeroEyebrow(activity)} />
      <div className="discover-detail__split event-program-page event-program-page--studio">
        <aside className="discover-detail__cover">
          <EventProgramHero
            title={activity.title}
            eyebrow={programHeroEyebrow(activity)}
            imageUrl={eventProgramHeroImageUrl(activity)}
          />
        </aside>
        <div className="discover-detail__scroll">
          <StudioCastGrid
            featured={featured}
            appearance={appearance}
            profileBasePath={profileBasePath}
            from={from}
          />
          <div className="discover-studio-event__cta">
            <Link className="discover-studio-event__button" href={`/activity/${encodeURIComponent(activity.id)}`}>
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
