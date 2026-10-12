"use client";

import { Instagram, Youtube } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { fetchProgramTalentSpotlight } from "@/app/event/[id]/program/actions";
import { MotiionProfileLink } from "@/components/event/MotiionProfileLink";
import { talentProfileSlug } from "@/lib/app-links/motiion-profile";
import { formatFeaturedPerformerMetaLine } from "@/lib/publicActivity";
import type { TalentSpotlight, TalentSpotlightSocialKind } from "@/lib/program/talentSpotlight";
import type { PublicFeaturedTalent } from "@/types/public";

function initial(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

function featuredPerformerMetaLine(talent: PublicFeaturedTalent): string | null {
  const raw = talent as PublicFeaturedTalent & { talent_types?: string[] | null };
  return formatFeaturedPerformerMetaLine(talent.talentTypes ?? raw.talent_types, talent.representation);
}

export function ProgramTalentSheet({
  talent,
  onClose,
}: {
  talent: PublicFeaturedTalent;
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
      <div className="event-program-spotlight" onClick={(event) => event.stopPropagation()}>
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
              {metaLine ? <p className="event-program-spotlight-meta">{metaLine}</p> : null}
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
                      <span className="event-program-spotlight-credit-title">{credit.title}</span>
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
                            <p className="event-program-modal-performer-name">{child.displayName}</p>
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
          <MotiionProfileLink slug={slug} className="event-program-spotlight-footer">
            See their full profile on Motiion
          </MotiionProfileLink>
        ) : null}
      </div>
    </div>
  );
}

function SocialGlyph({ kind }: { kind: TalentSpotlightSocialKind }) {
  const Glyph = kind === "instagram" ? Instagram : Youtube;
  return <Glyph className="event-program-spotlight-social-glyph" aria-hidden />;
}
