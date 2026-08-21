"use client";

import { useMemo, useState } from "react";

import { EventProgramShell } from "@/components/event/EventProgramShell";
import { PublicPageAnalytics } from "@/components/analytics/PublicPageAnalytics";
import { formatActivityDateTime } from "@/lib/publicActivity";
import { getIosAppStoreUrl } from "@/lib/referrals/app-store";
import type { PublicActivity, PublicFeaturedTalent } from "@/types/public";

import "@/app/casting/casting.css";

function heroImageUrl(activity: PublicActivity): string | null {
  const cover = activity.coverImageURL?.trim();
  if (cover) return cover;
  const headshot = activity.featuredTalent?.[0]?.headshotUrl?.trim();
  if (headshot) return headshot;
  return null;
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
  const whenLine = formatActivityDateTime(activity);
  const appStoreUrl = getIosAppStoreUrl();
  const heroUrl = heroImageUrl(activity);

  const analyticsPath = sharePath.startsWith("/") ? sharePath : `/${sharePath}`;

  return (
    <EventProgramShell>
      <PublicPageAnalytics
        eventName="activity_viewed"
        properties={{ activity_id: activity.id, kind: "event_program", activity_type: "event" }}
        path={analyticsPath}
      />

      <article
        className="event-program-page"
        style={
          heroUrl
            ? ({
                "--event-program-bg-image": `url("${heroUrl}")`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <div className="event-program-hero">
          {heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroUrl} alt="" />
          ) : (
            <div className="event-program-hero-fallback">
              {activity.title.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="event-program-title">
          <h1>{activity.title}</h1>
          {whenLine ? <p>{whenLine}</p> : null}
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

        <p className="event-program-powered-by">
          Powered by <strong>Motiion</strong>
        </p>
      </article>

      <div className="event-program-sticky-cta">
        <a className="product-btn-primary event-program-cta-button" href={appStoreUrl}>
          Get Motiion
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
      className="casting-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="casting-modal-card"
        onClick={(event) => event.stopPropagation()}
        style={{ maxHeight: "85vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p className="casting-section-title">Featured Talent</p>
            <h2 id="program-talent-title" className="casting-page-title" style={{ fontSize: 24 }}>
              {talent.displayName}
            </h2>
            <p className="casting-page-subtitle">Featured at {eventTitle}</p>
          </div>
          <button type="button" className="casting-modal-dismiss" onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 16, alignItems: "center" }}>
          {talent.headshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={talent.headshotUrl}
              alt=""
              width={72}
              height={72}
              style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 12,
                background: "rgba(255,255,255,0.1)",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
              }}
            >
              {talent.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          {videoUrl ? (
            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
              className="casting-inline-link"
              style={{ fontWeight: 600 }}
            >
              Watch showcase
            </a>
          ) : null}
        </div>

        <section style={{ marginTop: 24 }}>
          <h3 className="casting-section-title">In this piece</h3>
          {children.length === 0 ? (
            <p className="casting-body-copy" style={{ marginTop: 10 }}>
              No additional featured talent listed for this piece yet.
            </p>
          ) : (
            <div style={{ marginTop: 8 }}>
              {children.map((child) => (
                <div key={child.id} className="featured-performer-row">
                  {child.headshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={child.headshotUrl}
                      alt=""
                      className="featured-talent-avatar"
                      style={{ width: 48, height: 48 }}
                    />
                  ) : (
                    <span
                      className="featured-talent-avatar featured-talent-avatar-fallback"
                      style={{ width: 48, height: 48 }}
                    >
                      {child.displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <p style={{ margin: 0, fontWeight: 600 }}>{child.displayName}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
