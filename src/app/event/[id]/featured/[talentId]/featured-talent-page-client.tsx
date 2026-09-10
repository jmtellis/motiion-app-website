"use client";

import Link from "next/link";

import { CastingPublicShell } from "@/components/casting/CastingPublicShell";
import { OpenInAppBar } from "@/components/product/OpenInAppBar";
import { PublicPageAnalytics } from "@/components/analytics/PublicPageAnalytics";
import {
  featuredTalentPath,
  formatActivityDateTime,
  formatTalentTypeDisplayLine,
} from "@/lib/publicActivity";
import type { PublicActivity, PublicFeaturedTalent } from "@/types/public";

function youtubeEmbedUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
      if (parts[0] === "shorts" && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}

function vimeoEmbedUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts.find((part) => /^\d+$/.test(part));
    return id ? `https://player.vimeo.com/video/${id}` : null;
  } catch {
    return null;
  }
}

export default function FeaturedTalentPageClient({
  activity,
  talent,
  sharePath,
}: {
  activity: PublicActivity;
  talent: PublicFeaturedTalent;
  sharePath: string;
}) {
  const profileHref = talent.username
    ? `/profile/${encodeURIComponent(talent.username)}`
    : `/profile/${encodeURIComponent(talent.userId)}`;
  const eventHref = `/event/${encodeURIComponent(activity.id)}`;
  const videoUrl = talent.videoUrl?.trim() ?? "";
  const embed =
    videoUrl.length > 0 ? youtubeEmbedUrl(videoUrl) ?? vimeoEmbedUrl(videoUrl) : null;
  const isDirectVideo =
    !embed &&
    videoUrl.length > 0 &&
    /\.(mp4|webm|mov)(\?|$)/i.test(videoUrl);
  const roleLine = formatTalentTypeDisplayLine(talent.talentTypes);

  return (
    <CastingPublicShell>
      <PublicPageAnalytics
        eventName="featured_talent_viewed"
        properties={{
          activity_id: activity.id,
          talent_user_id: talent.userId,
        }}
        path={sharePath}
      />

      <article className="featured-talent-page">
        <div className="featured-talent-video">
          {embed ? (
            <iframe
              src={embed}
              title={`${talent.displayName} showcase`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : isDirectVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={videoUrl} controls playsInline />
          ) : videoUrl ? (
            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
              className="casting-inline-link"
              style={{ padding: 24 }}
            >
              Watch showcase
            </a>
          ) : (
            <div className="featured-talent-video-empty">
              <p style={{ margin: 0, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>
                Footage coming soon
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 14 }}>Check back after the event.</p>
            </div>
          )}
        </div>

        <Link href={profileHref} className="featured-talent-header">
          {talent.headshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={talent.headshotUrl} alt="" className="featured-talent-avatar" />
          ) : (
            <span className="featured-talent-avatar featured-talent-avatar-fallback">
              {talent.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{talent.displayName}</p>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
              {roleLine}
            </p>
          </div>
          <span className="featured-talent-chevron" aria-hidden="true">
            ›
          </span>
        </Link>

        <hr className="featured-talent-divider" />

        <section className="featured-talent-performers-section">
          <h2 className="casting-section-title">Featured Performers</h2>
          {talent.children.length === 0 ? (
            <p className="casting-body-copy" style={{ marginTop: 8, color: "rgba(255,255,255,0.55)" }}>
              No featured performers yet.
            </p>
          ) : (
            <div style={{ marginTop: 4 }}>
              {talent.children.map((child) => (
                <Link
                  key={child.id}
                  href={featuredTalentPath(activity.id, child.userId)}
                  className="featured-performer-row"
                >
                  {child.headshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={child.headshotUrl}
                      alt=""
                      className="featured-performer-avatar"
                    />
                  ) : (
                    <span
                      className="featured-performer-avatar"
                      style={{ display: "grid", placeItems: "center", fontSize: 14 }}
                    >
                      {child.displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{child.displayName}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                      {formatTalentTypeDisplayLine(child.talentTypes)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="casting-glass-card">
          <h2 className="casting-section-title">Event</h2>
          <p className="casting-body-copy" style={{ marginTop: 8 }}>
            <Link href={eventHref} className="casting-inline-link" style={{ fontWeight: 600 }}>
              {activity.title}
            </Link>
          </p>
          <p className="casting-body-copy" style={{ marginTop: 6, color: "rgba(255,255,255,0.55)" }}>
            {formatActivityDateTime(activity)}
            {activity.location?.trim() ? ` · ${activity.location.trim()}` : ""}
          </p>
        </section>
      </article>

      <OpenInAppBar
        href={sharePath}
        label="Open in Motiion"
        hint="Download Motiion to watch showcases, follow talent, and get event updates."
      />
    </CastingPublicShell>
  );
}
