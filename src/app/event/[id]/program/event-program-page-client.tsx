"use client";

import { Instagram, Youtube } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MotiionWordmark } from "@/components/brand/MotiionWordmark";
import { EventProgramShell } from "@/components/event/EventProgramShell";
import { PublicPageAnalytics } from "@/components/analytics/PublicPageAnalytics";
import type { TalentSpotlight, TalentSpotlightSocialKind } from "@/lib/program/talentSpotlight";
import {
  featuredTalentEmptyMessage,
  featuredTalentSectionTitle,
  formatFeaturedPerformerMetaLine,
  programCastNodes,
  programHeroEyebrow,
  resolveTalentAppearance,
} from "@/lib/publicActivity";
import { getIosAppStoreUrl } from "@/lib/referrals/app-store";
import type { PublicActivity, PublicFeaturedTalent } from "@/types/public";

import { fetchProgramTalentSpotlight } from "./actions";

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

/** Placeholder cast rows carry no account, so they have no public profile to load. */
function talentProfileSlug(talent: PublicFeaturedTalent): string | null {
  const username = talent.username?.trim();
  if (username) return username;
  const userId = talent.userId?.trim();
  return userId ? userId : null;
}

function initial(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

export default function EventProgramPageClient({
  activity,
  sharePath,
}: {
  activity: PublicActivity;
  sharePath: string;
}) {
  const [selected, setSelected] = useState<PublicFeaturedTalent | null>(null);
  const appearance = resolveTalentAppearance(activity);
  const featured = useMemo(() => programCastNodes(activity), [activity]);
  const appStoreUrl = getIosAppStoreUrl();
  const heroUrl = heroImageUrl(activity);
  const eyebrow = programHeroEyebrow(activity);
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
              {initial(activity.title)}
            </div>
          )}
          <div className="event-program-showcase-hero-overlay" />
          <div className="event-program-showcase-hero-content">
            <p className="event-program-eyebrow">{eyebrow}</p>
            <h1 className="event-program-showcase-title">{activity.title}</h1>
          </div>
        </div>

        <section className="event-program-cast-section">
          <h2 className="event-program-cast-heading">
            {featuredTalentSectionTitle(appearance)}
          </h2>
          {featured.length === 0 ? (
            <p className="event-program-empty-copy">
              {featuredTalentEmptyMessage(appearance)}
            </p>
          ) : (
            <div className="event-program-cast-grid">
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
                        {initial(talent.displayName)}
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
          Download Motiion
        </a>
      </div>

      {selected ? (
        <ProgramTalentSheet
          key={selected.id}
          talent={selected}
          appStoreUrl={appStoreUrl}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </EventProgramShell>
  );
}

function ProgramTalentSheet({
  talent,
  appStoreUrl,
  onClose,
}: {
  talent: PublicFeaturedTalent;
  appStoreUrl: string;
  onClose: () => void;
}) {
  const slug = talentProfileSlug(talent);
  const children = useMemo(() => talent.children ?? [], [talent.children]);
  const [spotlight, setSpotlight] = useState<TalentSpotlight | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(slug));

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Keep the program page from scrolling behind the modal.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (!slug) return;

    let active = true;
    fetchProgramTalentSpotlight(slug)
      .then((result) => {
        if (active) setSpotlight(result);
      })
      .catch(() => {
        if (active) setSpotlight(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const portraitUrl = spotlight?.headshotUrl ?? talent.headshotUrl;
  const metaLine = spotlight?.metaLine ?? featuredPerformerMetaLine(talent);
  const credits = spotlight?.credits ?? [];
  const socials = spotlight?.socials ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="program-talent-title"
      className="event-program-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="event-program-spotlight"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="event-program-spotlight-close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" aria-hidden focusable="false">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="event-program-spotlight-scroll">
          <div className="event-program-spotlight-portrait">
            {portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={portraitUrl} alt="" />
            ) : (
              <div className="event-program-spotlight-portrait-fallback">
                {initial(talent.displayName)}
              </div>
            )}
            <div className="event-program-spotlight-portrait-scrim" />
            <div className="event-program-spotlight-identity">
              <h2 id="program-talent-title" className="event-program-spotlight-name">
                {talent.displayName}
              </h2>
              {metaLine ? (
                <p className="event-program-spotlight-meta">{metaLine}</p>
              ) : null}
            </div>
          </div>

          <div className="event-program-spotlight-body">
            {isLoading ? (
              <div className="event-program-spotlight-loading" aria-hidden>
                <span />
                <span />
                <span />
              </div>
            ) : null}

            {credits.length > 0 ? (
              <section className="event-program-spotlight-section">
                <h3 className="event-program-spotlight-section-title">Credits</h3>
                <ul className="event-program-spotlight-credits">
                  {credits.map((credit) => (
                    <li key={credit.id} className="event-program-spotlight-credit">
                      <span className="event-program-spotlight-credit-avatar">
                        {credit.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={credit.imageUrl} alt="" />
                        ) : (
                          <span aria-hidden>{initial(credit.title)}</span>
                        )}
                      </span>
                      <span className="event-program-spotlight-credit-title">
                        {credit.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {socials.length > 0 ? (
              <section className="event-program-spotlight-section">
                <h3 className="event-program-spotlight-section-title">Socials</h3>
                <div className="event-program-spotlight-socials">
                  {socials.map((social) => (
                    <a
                      key={social.kind}
                      href={social.url}
                      target="_blank"
                      rel="noreferrer"
                      className="event-program-spotlight-social"
                    >
                      <SocialGlyph kind={social.kind} />
                      {social.label}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            {children.length > 0 ? (
              <section className="event-program-spotlight-section">
                <h3 className="event-program-spotlight-section-title">In this piece</h3>
                <div className="event-program-modal-performer-list">
                  {children.map((child, index) => {
                    const childMeta = featuredPerformerMetaLine(child);

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
                              {initial(child.displayName)}
                            </div>
                          )}
                          <div className="event-program-modal-performer-copy">
                            <p className="event-program-modal-performer-name">
                              {child.displayName}
                            </p>
                            {childMeta ? (
                              <p className="event-program-modal-performer-meta">{childMeta}</p>
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
              </section>
            ) : null}
          </div>
        </div>

        {slug ? (
          <a
            className="event-program-spotlight-footer"
            href={appStoreUrl}
            target="_blank"
            rel="noreferrer"
          >
            See their full profile on Motiion
          </a>
        ) : null}
      </div>
    </div>
  );
}

function SocialGlyph({ kind }: { kind: TalentSpotlightSocialKind }) {
  const Glyph = kind === "instagram" ? Instagram : Youtube;
  return <Glyph className="event-program-spotlight-social-glyph" aria-hidden />;
}
