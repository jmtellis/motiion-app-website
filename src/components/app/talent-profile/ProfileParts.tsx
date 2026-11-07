"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, ExternalLink, Play, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { getProfileInitials } from "@/lib/auth/avatar";
import type { CreditChipItem } from "@/lib/profile/profile-credits";
import type { ProfileExperience, ProfileHighlight, ProfileVisual, PublicTalentProfile } from "@/types/public";

import {
  categoryLabel,
  embedUrl,
  experienceFacts,
  experienceImage,
  skillVisuals,
} from "./profile-model";

export function displayName(profile: PublicTalentProfile) {
  return profile.full_name?.trim() || "Talent";
}

export function HeroPager({
  name,
  meta,
  shots,
  onOpen,
  onClose,
  overlayIdentity = true,
  overlayCaption = null,
}: {
  name: string;
  meta: string;
  shots: string[];
  onOpen: (index: number) => void;
  onClose?: () => void;
  /** When false, omit the name/meta overlay (public page shows identity beside the hero). */
  overlayIdentity?: boolean;
  /** Optional caption (e.g. talent type · location) overlaid on the hero without the name. */
  overlayCaption?: string | null;
}) {
  const [index, setIndex] = useState(0);
  const count = shots.length;
  const current = shots[index];
  const caption = overlayCaption?.trim() || null;
  const showIdentity = overlayIdentity || Boolean(caption);

  return (
    <div className={`talent-profile__hero${showIdentity ? "" : " talent-profile__hero--bare"}${caption && !overlayIdentity ? " talent-profile__hero--caption" : ""}`}>
      {current ? (
        <button type="button" className="talent-profile__hero-card" aria-label={`Open ${name}'s headshots`} onClick={() => onOpen(index)}>
          <Image key={current} src={current} alt="" fill sizes="480px" unoptimized />
        </button>
      ) : (
        <span className="talent-profile__hero-initials" aria-hidden>{getProfileInitials(name) || "?"}</span>
      )}
      {onClose ? (
        <button type="button" className="talent-profile__close" aria-label="Close profile" onClick={onClose}>
          <X size={18} aria-hidden />
        </button>
      ) : null}
      {count > 1 ? (
        <>
          <button type="button" className="talent-profile__hero-nav talent-profile__hero-nav--prev" aria-label="Previous headshot" onClick={() => setIndex((index - 1 + count) % count)}>
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button type="button" className="talent-profile__hero-nav talent-profile__hero-nav--next" aria-label="Next headshot" onClick={() => setIndex((index + 1) % count)}>
            <ChevronRight size={18} aria-hidden />
          </button>
          <span className="talent-profile__hero-dots" aria-hidden>
            {shots.map((shot, dot) => <i key={shot} data-on={dot === index} />)}
          </span>
        </>
      ) : null}
      {overlayIdentity ? (
        <div className="talent-profile__identity">
          <h3>{name}</h3>
          {meta ? <p>{meta}</p> : null}
        </div>
      ) : caption ? (
        <div className="talent-profile__identity talent-profile__identity--caption">
          <p>{caption}</p>
        </div>
      ) : null}
    </div>
  );
}

export function CreditAvatar({
  chip,
  onClick,
}: {
  chip: CreditChipItem;
  onClick?: () => void;
}) {
  const [failedImage, setFailedImage] = useState(false);
  const showImage = Boolean(chip.imageUrl) && !failedImage;
  const content = (
    <>
      {showImage ? (
        // Plain img: credit art comes from Apple Music / Brandfetch hosts outside next/image allowlists.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={chip.imageUrl!}
          alt=""
          width={72}
          height={72}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedImage(true)}
        />
      ) : (
        <span className="talent-profile__credit-initials" aria-hidden>{getProfileInitials(chip.title) || "?"}</span>
      )}
      <span className="talent-profile__credit-name">{chip.title}</span>
    </>
  );

  if (!onClick) {
    return <span className="talent-profile__credit">{content}</span>;
  }

  return (
    <button type="button" className="talent-profile__credit" onClick={onClick}>
      {content}
    </button>
  );
}

export function HighlightCard({
  highlight,
  onClick,
}: {
  highlight: ProfileHighlight;
  onClick?: () => void;
}) {
  const copy = (
    <span className="talent-profile__highlight-copy">
      <small>{highlight.subtitle?.trim() || "Studio"}</small>
      <strong>{highlight.title}</strong>
    </span>
  );
  const media = highlight.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={highlight.image_url} alt="" width={148} height={196} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
  ) : (
    <span aria-hidden />
  );

  if (!onClick) {
    return (
      <div className="talent-profile__highlight-card">
        {media}
        {copy}
      </div>
    );
  }

  return (
    <button type="button" className="talent-profile__highlight-card" onClick={onClick}>
      {media}
      {copy}
    </button>
  );
}

export function ExperienceThumb({ experience }: { experience: ProfileExperience }) {
  const src = experienceImage(experience);
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <span className="home-profile-row__thumb" aria-hidden>{experience.title.charAt(0)}</span>;
  }
  return (
    <Image
      className="home-profile-row__thumb"
      src={src}
      alt=""
      width={44}
      height={44}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function ExperienceDetail({ experience }: { experience: ProfileExperience }) {
  const image = experienceImage(experience);
  const facts = experienceFacts(experience);
  const embed = embedUrl(experience.link_url);
  return (
    <article className="talent-profile__experience">
      <header className="talent-profile__experience-head">
        {image ? (
          <Image className="talent-profile__experience-thumb" src={image} alt="" width={64} height={64} unoptimized />
        ) : (
          <span className="talent-profile__experience-thumb" aria-hidden>{experience.title.charAt(0)}</span>
        )}
        <div>
          <p>{categoryLabel(experience)}</p>
          <h3>{experience.title}</h3>
          {experience.role ? <span>{experience.role}</span> : null}
        </div>
      </header>
      {embed ? (
        <div className="talent-profile__embed">
          <iframe src={embed} title={experience.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
        </div>
      ) : experience.link_url ? (
        <a className="talent-profile__link-card" href={experience.link_url} target="_blank" rel="noopener noreferrer">
          <span className="home-profile-row__icon"><Play size={16} aria-hidden /></span>
          <span className="home-profile-row__copy">
            <span className="home-profile-row__label">Watch</span>
            <span className="talent-profile__link-host">{hostOf(experience.link_url)}</span>
          </span>
          <ExternalLink size={16} aria-hidden />
        </a>
      ) : null}
      {facts.length ? (
        <dl className="talent-profile__facts">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

export function VisualPlayer({ visual }: { visual: ProfileVisual | null }) {
  if (!visual?.url) return <p className="home-panel-status">Nothing here yet.</p>;
  return (
    <div className="talent-profile__player">
      <video src={visual.url} controls playsInline autoPlay />
    </div>
  );
}

export function SkillClips({ profile }: { profile: PublicTalentProfile }) {
  const visuals = skillVisuals(profile);
  if (!visuals.length) return null;
  return (
    <div className="talent-profile__clips">
      {visuals.map((item) => (
        <figure key={item.id}>
          <video src={item.url} controls playsInline muted preload="metadata" />
          {item.ref ? <figcaption>{item.ref}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}

export function TagGroup({ title, tags }: { title: string; tags: string[] }) {
  if (!tags.length) return null;
  return (
    <section>
      <div className="talent-profile__section-head"><h4>{title}</h4></div>
      <div className="talent-profile__tags ui-chip-group__row">
        {tags.map((tag) => (
          <span key={tag} className="ui-chip" aria-disabled="true">
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}

export function SkillsPage({ profile }: { profile: PublicTalentProfile }) {
  const visuals = skillVisuals(profile);
  const shown = new Set(visuals.map((item) => item.ref?.trim().toLowerCase()).filter(Boolean));
  const styles = (profile.styles ?? []).filter((tag) => !shown.has(tag.toLowerCase()));
  const skills = (profile.skills ?? []).filter((tag) => !shown.has(tag.toLowerCase()));
  return (
    <div className="talent-profile__body">
      <SkillClips profile={profile} />
      <TagGroup title="Styles" tags={styles} />
      <TagGroup title="Skills" tags={skills} />
    </div>
  );
}

export function SectionHead({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="talent-profile__section-head">
      <h4>{title}</h4>
      {action}
    </div>
  );
}
