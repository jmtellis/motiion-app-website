"use client";

import { useEffect, useMemo, useState } from "react";

import { MotiionWordmark } from "@/components/brand/MotiionWordmark";
import { EventProgramShell } from "@/components/event/EventProgramShell";
import { PublicPageAnalytics } from "@/components/analytics/PublicPageAnalytics";
import { formatFeaturedPerformerMetaLine, formatProgramDateTime } from "@/lib/publicActivity";
import { getIosAppStoreUrl } from "@/lib/referrals/app-store";
import type { PublicActivity, PublicFeaturedTalent } from "@/types/public";

import "@/app/casting/casting.css";

const POWERED_BY_REVEAL_HEIGHT = 56;

function heroImageUrl(activity: PublicActivity): string | null {
  const cover = activity.coverImageURL?.trim();
  if (cover) return cover;
  const headshot = activity.featuredTalent?.[0]?.headshotUrl?.trim();
  if (headshot) return headshot;
  return null;
}

function featuredPerformerMetaLine(talent: PublicFeaturedTalent): string | null {
  const raw = talent as PublicFeaturedTalent & { talent_types?: string[] | null };
  return formatFeaturedPerformerMetaLine(
    talent.talentTypes ?? raw.talent_types,
    talent.representation,
  );
}

export default function EventProgramPageClient({
  activity,
  sharePath,
}: {
  activity: PublicActivity;
  sharePath: string;
}) {
  const [selected, setSelected] = useState<PublicFeaturedTalent | null>(null);
  const featured = activity.featuredTalent ?? [];
  const dateLine = formatProgramDateTime(activity);
  const appStoreUrl = getIosAppStoreUrl();
  const heroUrl = heroImageUrl(activity);
  const [poweredByOpacity, setPoweredByOpacity] = useState(0);

  const analyticsPath = sharePath.startsWith("/") ? sharePath : `/${sharePath}`;

  useEffect(() => {
    document.documentElement.classList.add("event-program-page");
    return () => {
      document.documentElement.classList.remove("event-program-page");
    };
  }, []);

  useEffect(() => {
    function updatePoweredByOpacity() {
      const doc = document.documentElement;
      const remaining = Math.max(0, doc.scrollHeight - window.scrollY - window.innerHeight);

      if (doc.scrollHeight - window.innerHeight <= 8) {
        setPoweredByOpacity(1);
        return;
      }

      const opacity = 1 - Math.min(1, remaining / POWERED_BY_REVEAL_HEIGHT);
      setPoweredByOpacity((current) =>
        Math.abs(current - opacity) > 0.01 ? opacity : current,
      );
    }

    updatePoweredByOpacity();
    window.addEventListener("scroll", updatePoweredByOpacity, { passive: true });
    window.addEventListener("resize", updatePoweredByOpacity);
    return () => {
      window.removeEventListener("scroll", updatePoweredByOpacity);
      window.removeEventListener("resize", updatePoweredByOpacity);
    };
  }, []);

  return (
    <EventProgramShell>
      <PublicPageAnalytics
        eventName="activity_viewed"
        properties={{ activity_id: activity.id, kind: "event_program", activity_type: "event" }}
        path={analyticsPath}
      />

      <article className="event-program-page">
        <div className="event-program-showcase-hero">
          {heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroUrl} alt="" />
          ) : (
            <div className="event-program-showcase-hero-fallback">
              {activity.title.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="event-program-showcase-hero-overlay" />
          <div className="event-program-showcase-hero-content">
            <p className="event-program-eyebrow">Event</p>
            <h1 className="event-program-showcase-title">{activity.title}</h1>
            {dateLine ? <p className="event-program-showcase-date">{dateLine}</p> : null}
          </div>
        </div>

        <section className="event-program-cast-section">
          <h2 className="event-program-cast-heading">Featured Talent</h2>
          {featured.length === 0 ? (
            <p className="event-program-empty-copy">
              Featured talent will appear here once performers are confirmed.
            </p>
          ) : (
            <div className="event-program-cast-row">
              {featured.map((talent) => (
                <button
                  key={talent.id}
                  type="button"
                  className="event-program-cast-cell"
                  onClick={() => setSelected(talent)}
                >
                  <div className="event-program-cast-portrait">
                    {talent.headshotUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={talent.headshotUrl} alt="" />
                    ) : (
                      <div className="event-program-cast-portrait-fallback">
                        {talent.displayName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="event-program-cast-name">{talent.displayName}</p>
                  {talent.children.length > 0 ? (
                    <p className="event-program-cast-meta">
                      {talent.children.length === 1
                        ? "1 performer"
                        : `${talent.children.length} performers`}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="event-program-scroll-tail" aria-hidden />
      </article>

      <div
        className="event-program-powered-by"
        style={{ opacity: poweredByOpacity }}
        aria-label="Powered by Motiion"
        aria-hidden={poweredByOpacity < 0.2}
      >
        <p>Powered by</p>
        <MotiionWordmark height={10} />
      </div>

      <div className="event-program-fixed-cta">
        <a
          className="event-program-cta-glass event-program-cta-button"
          href={appStoreUrl}
          target="_blank"
          rel="noreferrer"
        >
          Download the app
        </a>
      </div>

      {selected ? (
        <ProgramTalentSheet
          eventTitle={activity.title}
          talent={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </EventProgramShell>
  );
}

function ProgramTalentSheet({
  eventTitle,
  talent,
  onClose,
}: {
  eventTitle: string;
  talent: PublicFeaturedTalent;
  onClose: () => void;
}) {
  const videoUrl = talent.videoUrl?.trim() ?? "";
  const children = useMemo(() => talent.children ?? [], [talent.children]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="program-talent-title"
      className="event-program-modal-backdrop"
      onClick={onClose}
    >
      <div className="event-program-modal" onClick={(event) => event.stopPropagation()}>
        <div className="event-program-modal-top">
          <p className="event-program-modal-eyebrow">Featured Talent</p>
          <button type="button" className="event-program-modal-close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="event-program-modal-scroll">
          <div className="event-program-modal-profile">
            {talent.headshotUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={talent.headshotUrl}
                alt=""
                className="event-program-modal-avatar"
              />
            ) : (
              <div className="event-program-modal-avatar event-program-modal-avatar-fallback">
                {talent.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="event-program-modal-profile-copy">
              <h2 id="program-talent-title" className="event-program-modal-name">
                {talent.displayName}
              </h2>
              <p className="event-program-modal-subtitle">Featured at {eventTitle}</p>
            </div>
          </div>

          {videoUrl ? (
            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
              className="event-program-modal-video-cta"
            >
              Watch showcase
            </a>
          ) : null}

          <section className="event-program-modal-section">
            <h3 className="event-program-modal-section-title">In this piece</h3>
            {children.length === 0 ? (
              <p className="event-program-modal-empty-copy">
                No additional featured talent listed for this piece yet.
              </p>
            ) : (
              <div className="event-program-modal-performer-list">
                {children.map((child, index) => {
                  const metaLine = featuredPerformerMetaLine(child);

                  return (
                    <div key={child.id}>
                      <div className="event-program-modal-performer-row">
                        {child.headshotUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={child.headshotUrl}
                            alt=""
                            className="event-program-modal-performer-avatar"
                          />
                        ) : (
                          <div className="event-program-modal-performer-avatar event-program-modal-performer-avatar-fallback">
                            {child.displayName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="event-program-modal-performer-copy">
                          <p className="event-program-modal-performer-name">{child.displayName}</p>
                          {metaLine ? (
                            <p className="event-program-modal-performer-meta">{metaLine}</p>
                          ) : null}
                        </div>
                      </div>
                      {index < children.length - 1 ? (
                        <div className="event-program-modal-divider" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
