"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Bookmark,
  Building2,
  CalendarClock,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Download,
  Instagram,
  Mail,
  MoreHorizontal,
  Music,
  Send,
} from "lucide-react";

import { buildAttributeStrip, type AttributeStripItem } from "@/lib/profile/attribute-strip";
import {
  COLLAPSED_CHIP_LIMIT,
  type CreditChipItem,
  type ProfileCredits,
} from "@/lib/profile/profile-credits";
import {
  buildResumeExperienceItems,
  groupResumeExperienceItems,
  visibleResumeCategories,
  type GroupedResumeExperience,
  type ResumeExperienceCategory,
} from "@/lib/profile/resume-experience";
import type {
  ProfileExperience,
  ProfileHighlight,
  ProfileVisual,
  PublicTalentProfile,
} from "@/types/public";

import "./buyer-talent-profile.css";

type ProfileTab = "about" | "resume" | "visuals";

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "about", label: "About" },
  { id: "resume", label: "Resume" },
  { id: "visuals", label: "Visuals" },
];

type BuyerTalentProfileViewProps = {
  profile: PublicTalentProfile;
};

export function BuyerTalentProfileView({ profile }: BuyerTalentProfileViewProps) {
  const [tab, setTab] = useState<ProfileTab>("about");

  const displayName = profile.full_name?.trim() || "Talent profile";
  const headshots = collectHeadshots(profile);
  const styleTags = useMemo(
    () => uniqueTags([...profile.styles, ...profile.talent_types]),
    [profile.styles, profile.talent_types],
  );
  const highlights = profile.profile_highlights ?? [];
  const attributeStrip = useMemo(() => buildAttributeStrip(profile), [profile]);

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div className="buyer-talent-profile">
      <div className="buyer-talent-profile__layout">
        <div className="buyer-talent-profile__content">
          <div className="buyer-talent-profile__content-header">
            <ProfileIdentityHeader profile={profile} displayName={displayName} />

            {attributeStrip.length > 0 ? (
              <div className="buyer-talent-profile__attribute-strip-wrap">
                <AttributeStrip items={attributeStrip} />
              </div>
            ) : null}

            <nav className="buyer-talent-profile__tabs" aria-label="Profile sections">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="buyer-talent-profile__tab"
                  data-active={tab === item.id}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div
            className={`buyer-talent-profile__content-scroll${
              tab === "visuals" ? " buyer-talent-profile__content-scroll--visuals" : ""
            }`}
          >
            <div
              className={`buyer-talent-profile__panel${
                tab === "visuals" ? " buyer-talent-profile__panel--visuals" : ""
              }`}
            >
              {tab === "about" ? (
                <AboutTab
                  profile={profile}
                  styleTags={styleTags}
                  highlights={highlights}
                  experiences={profile.experiences}
                />
              ) : null}
              {tab === "resume" ? (
                <ResumeTab experiences={profile.experiences} />
              ) : null}
              {tab === "visuals" ? (
                <VisualsTab visuals={orderVisuals(profile.profile_visuals)} />
              ) : null}
            </div>
          </div>
        </div>

        <PortraitPanel
          key={profile.id}
          displayName={displayName}
          headshots={headshots}
          initials={initials}
        />

        <TalentSidebarPanel profile={profile} />
      </div>
    </div>
  );
}

function TalentSidebarPanel({ profile }: { profile: PublicTalentProfile }) {
  const resumeUrl = profile.resume_url?.trim() || null;

  return (
    <aside className="buyer-talent-profile__sidebar" aria-label="Talent actions">
      <div className="buyer-talent-profile__sidebar-inner">
        <section className="buyer-talent-profile__sidebar-section">
          <h2 className="buyer-talent-profile__sidebar-title">Actions</h2>
          <div className="buyer-talent-profile__sidebar-actions">
            <button type="button" className="btp-action-btn btp-action-btn--block">
              <Bookmark className="size-3.5" aria-hidden />
              Save to Roster
            </button>
            <button type="button" className="btp-action-btn btp-action-btn--block">
              <CalendarPlus className="size-3.5" aria-hidden />
              Add to Project
            </button>
            <button type="button" className="btp-action-btn btp-action-btn--block">
              <Send className="size-3.5" aria-hidden />
              Just Invite
            </button>
            <button type="button" className="btp-action-btn btp-action-btn--block">
              <CalendarClock className="size-3.5" aria-hidden />
              Ask Availability
            </button>
            <button type="button" className="btp-action-btn btp-action-btn--block">
              <ClipboardList className="size-3.5" aria-hidden />
              Request Size Sheet
            </button>
            {resumeUrl ? (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btp-action-btn btp-action-btn--block btp-action-btn--accent"
                download
              >
                <Download className="size-3.5" aria-hidden />
                Download Resume
              </a>
            ) : (
              <button
                type="button"
                className="btp-action-btn btp-action-btn--block"
                disabled
                aria-disabled="true"
              >
                <Download className="size-3.5" aria-hidden />
                Download Resume
              </button>
            )}
            <button type="button" className="btp-action-btn btp-action-btn--block">
              <Mail className="size-3.5" aria-hidden />
              Contact
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
}

function PortraitPanel({
  displayName,
  headshots,
  initials,
}: {
  displayName: string;
  headshots: string[];
  initials: string;
}) {
  const portraitRef = useRef<HTMLElement>(null);
  const isSlidingRef = useRef(false);
  const [headshotIndex, setHeadshotIndex] = useState(0);
  const [trackOffsetX, setTrackOffsetX] = useState(0);
  const [slideInstant, setSlideInstant] = useState(false);

  const navigateHeadshot = useCallback(
    (delta: number) => {
      if (headshots.length <= 1 || isSlidingRef.current) return;
      isSlidingRef.current = true;

      const width = portraitRef.current?.clientWidth ?? 320;
      const startOffset = delta > 0 ? width : -width;

      setSlideInstant(true);
      setTrackOffsetX(startOffset);
      setHeadshotIndex((index) => (index + delta + headshots.length) % headshots.length);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSlideInstant(false);
          setTrackOffsetX(0);
        });
      });
    },
    [headshots.length],
  );

  function handleTrackTransitionEnd(event: React.TransitionEvent<HTMLDivElement>) {
    if (event.propertyName !== "transform" || slideInstant) return;
    if (trackOffsetX === 0) {
      isSlidingRef.current = false;
    }
  }

  const activeHeadshot = headshots[headshotIndex];

  return (
    <aside
      ref={portraitRef}
      className="buyer-talent-profile__portrait"
      aria-label={`${displayName} portrait`}
    >
      {headshots.length > 1 ? (
        <>
          <button
            type="button"
            className="buyer-talent-profile__nav-arrow buyer-talent-profile__nav-arrow--left"
            onClick={() => navigateHeadshot(-1)}
            aria-label="Previous headshot"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            className="buyer-talent-profile__nav-arrow buyer-talent-profile__nav-arrow--right"
            onClick={() => navigateHeadshot(1)}
            aria-label="Next headshot"
          >
            <ChevronRight className="size-4" />
          </button>
        </>
      ) : null}

      {activeHeadshot ? (
        <div
          className={`buyer-talent-profile__portrait-track${slideInstant ? " buyer-talent-profile__portrait-track--instant" : ""}`}
          style={{ transform: `translateX(${trackOffsetX}px)` }}
          onTransitionEnd={handleTrackTransitionEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={activeHeadshot} src={activeHeadshot} alt="" />
        </div>
      ) : (
        <div className="buyer-talent-profile__portrait-fallback" aria-hidden>
          {initials}
        </div>
      )}

      {headshots.length > 1 ? (
        <p className="buyer-talent-profile__portrait-count" aria-live="polite">
          {headshotIndex + 1} / {headshots.length}
        </p>
      ) : null}

      <div className="buyer-talent-profile__portrait-vignette" aria-hidden />
    </aside>
  );
}

function collectHeadshots(profile: PublicTalentProfile): string[] {
  const urls = [profile.headshot_url, ...(profile.headshot_urls ?? [])].filter(
    (url): url is string => Boolean(url?.trim()),
  );
  return [...new Set(urls)];
}

function ProfileIdentityHeader({
  profile,
  displayName,
}: {
  profile: PublicTalentProfile;
  displayName: string;
}) {
  const agencyLogo = profile.agency_logo_url?.trim() || null;
  const instagramUrl = profile.instagram_url?.trim() || null;
  const unionStatus = profile.union_status?.trim() || null;
  const agencyInitial =
    profile.representation?.trim().charAt(0).toUpperCase() ||
    displayName.charAt(0).toUpperCase() ||
    "?";

  return (
    <div className="buyer-talent-profile__identity">
      <div className="buyer-talent-profile__identity-copy">
        <h1 className="buyer-talent-profile__name-row">
          <span className="buyer-talent-profile__name">{displayName}</span>
          {profile.username ? (
            <span className="buyer-talent-profile__username">@{profile.username}</span>
          ) : null}
        </h1>
        {profile.location ? (
          <p className="buyer-talent-profile__meta">{profile.location}</p>
        ) : null}
      </div>

      <div className="buyer-talent-profile__identity-badges">
        <div
          className="buyer-talent-profile__agency-avatar"
          title={profile.representation?.trim() || "Agency"}
          aria-label={profile.representation?.trim() || "Agency"}
        >
          {agencyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={agencyLogo} alt="" />
          ) : (
            <span className="buyer-talent-profile__agency-fallback" aria-hidden>
              {profile.representation?.trim() ? (
                agencyInitial
              ) : (
                <Building2 className="size-4" strokeWidth={1.75} />
              )}
            </span>
          )}
        </div>

        {unionStatus ? (
          <div
            className="buyer-talent-profile__union-avatar"
            title={`Union: ${unionStatus}`}
            aria-label={`Union status: ${unionStatus}`}
          >
            <span className="buyer-talent-profile__agency-fallback" aria-hidden>
              <BadgeCheck className="size-4" strokeWidth={1.75} />
            </span>
          </div>
        ) : null}

        {instagramUrl ? (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="buyer-talent-profile__social-badge"
            aria-label="Instagram"
          >
            <Instagram className="size-4" strokeWidth={1.75} aria-hidden />
          </a>
        ) : (
          <span
            className="buyer-talent-profile__social-badge buyer-talent-profile__social-badge--disabled"
            aria-label="Instagram unavailable"
            aria-disabled="true"
          >
            <Instagram className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
        )}
      </div>
    </div>
  );
}

function AboutTab({
  profile,
  styleTags,
  highlights,
  experiences,
}: {
  profile: PublicTalentProfile;
  styleTags: string[];
  highlights: ProfileHighlight[];
  experiences: ProfileExperience[];
}) {
  const skills = profile.skills ?? [];
  const credits = profile.credits ?? { artists: [], companies: [] };
  const socialLinks = [
    { label: "YouTube", url: profile.youtube_url },
  ].filter((link) => link.url?.trim());

  const hasCredits = credits.artists.length > 0 || credits.companies.length > 0;

  const hasContent =
    highlights.length > 0 ||
    hasCredits ||
    styleTags.length > 0 ||
    skills.length > 0 ||
    socialLinks.length > 0;

  return (
    <>
      {highlights.length > 0 ? (
        <section>
          <h2 className="buyer-talent-profile__section-title">Highlights</h2>
          <div className="buyer-talent-profile__highlights">
            {highlights.map((highlight) => (
              <HighlightCard
                key={highlight.id}
                highlight={highlight}
                experiences={experiences}
              />
            ))}
          </div>
        </section>
      ) : null}

      {hasCredits ? <CreditsSection credits={credits} /> : null}

      {styleTags.length > 0 ? (
        <section>
          <h2 className="buyer-talent-profile__section-title">Styles</h2>
          <TextPillChipGroup items={styleTags} />
        </section>
      ) : null}

      {skills.length > 0 ? (
        <section>
          <h2 className="buyer-talent-profile__section-title">Skills</h2>
          <TextPillChipGroup items={skills} />
        </section>
      ) : null}

      {socialLinks.length > 0 ? (
        <section className="buyer-talent-profile__card">
          <h2 className="buyer-talent-profile__section-title">Links</h2>
          <div className="buyer-talent-profile__chip-list">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.url!}
                target="_blank"
                rel="noopener noreferrer"
                className="buyer-talent-profile__chip"
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {hasContent ? null : (
        <EmptyPanel message="Profile details will appear here when added in Motiion." />
      )}
    </>
  );
}

function TextPillChipGroup({ items }: { items: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = items.length > COLLAPSED_CHIP_LIMIT;
  const visibleItems = !expanded && truncated ? items.slice(0, COLLAPSED_CHIP_LIMIT) : items;

  return (
    <div className="buyer-talent-profile__pill-chips">
      {visibleItems.map((item) => (
        <span key={item} className="buyer-talent-profile__pill-chip">
          {item}
        </span>
      ))}
      {!expanded && truncated ? <SeeAllChip onClick={() => setExpanded(true)} /> : null}
    </div>
  );
}

function SeeAllChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="buyer-talent-profile__credit-chip buyer-talent-profile__credit-chip--outline"
      onClick={onClick}
    >
      <span className="buyer-talent-profile__credit-chip-fallback" aria-hidden>
        <MoreHorizontal className="size-2.5" />
      </span>
      See all
    </button>
  );
}

function CreditsSection({ credits }: { credits: ProfileCredits }) {
  return (
    <section className="buyer-talent-profile__credits">
      <h2 className="buyer-talent-profile__section-title">Credits</h2>
      {credits.artists.length > 0 ? (
        <CreditChipGroup title="Artists" items={credits.artists} />
      ) : null}
      {credits.companies.length > 0 ? (
        <CreditChipGroup title="Companies" items={credits.companies} />
      ) : null}
    </section>
  );
}

function CreditChipGroup({ title, items }: { title: string; items: CreditChipItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = items.length > COLLAPSED_CHIP_LIMIT;
  const visibleItems = !expanded && truncated ? items.slice(0, COLLAPSED_CHIP_LIMIT) : items;

  return (
    <div className="buyer-talent-profile__credits-group">
      <h3 className="buyer-talent-profile__credits-subtitle">{title}</h3>
      <div className="buyer-talent-profile__credit-chips">
        {visibleItems.map((item) => (
          <CreditPillChip key={item.id} item={item} />
        ))}
        {!expanded && truncated ? <SeeAllChip onClick={() => setExpanded(true)} /> : null}
      </div>
    </div>
  );
}

function CreditPillChip({ item }: { item: CreditChipItem }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = item.imageUrl?.trim();
  const showImage = Boolean(image) && !imageFailed;
  const FallbackIcon = item.fallbackCategory === "musicVideos" ? Music : Building2;

  return (
    <span className="buyer-talent-profile__credit-chip">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="buyer-talent-profile__credit-chip-avatar"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="buyer-talent-profile__credit-chip-fallback" aria-hidden>
          <FallbackIcon className="size-2.5" />
        </span>
      )}
      <span className="buyer-talent-profile__credit-chip-label">{item.title}</span>
    </span>
  );
}

function AttributeStrip({ items }: { items: AttributeStripItem[] }) {
  return (
    <section className="buyer-talent-profile__attribute-strip">
      <dl className="buyer-talent-profile__attribute-strip-track">
        {items.map((stat) => (
          <div key={stat.label} className="buyer-talent-profile__attribute">
            <dd>{stat.value}</dd>
            <dt>{stat.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

function HighlightCard({
  highlight,
}: {
  highlight: ProfileHighlight;
  experiences: ProfileExperience[];
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = highlight.image_url?.trim();

  return (
    <article className="buyer-talent-profile__highlight">
      {image && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="buyer-talent-profile__highlight-placeholder" aria-hidden />
      )}
      <div className="buyer-talent-profile__highlight-body">
        <p className="buyer-talent-profile__highlight-title">{highlight.title}</p>
        {highlight.subtitle ? (
          <p className="buyer-talent-profile__highlight-sub">{highlight.subtitle}</p>
        ) : null}
      </div>
    </article>
  );
}

function ResumeTab({ experiences }: { experiences: ProfileExperience[] }) {
  const categories = useMemo(() => visibleResumeCategories(experiences), [experiences]);
  const [selectedCategory, setSelectedCategory] = useState<ResumeExperienceCategory | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategory(null);
      return;
    }
    setSelectedCategory((current) =>
      current && categories.some(({ key }) => key === current) ? current : categories[0]!.key,
    );
  }, [categories]);

  const groupedItems = useMemo(() => {
    if (!selectedCategory) return [];
    const items = buildResumeExperienceItems(experiences, selectedCategory);
    return groupResumeExperienceItems(items);
  }, [experiences, selectedCategory]);

  useEffect(() => {
    setExpandedGroupIds(new Set());
  }, [selectedCategory]);

  if (categories.length === 0) {
    return <EmptyPanel message="Resume credits will appear here when added in Motiion." />;
  }

  function toggleGroup(group: GroupedResumeExperience) {
    if (group.children.length <= 1) return;
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(group.id)) next.delete(group.id);
      else next.add(group.id);
      return next;
    });
  }

  return (
    <>
      {categories.length > 0 && selectedCategory ? (
        <section>
          <div className="buyer-talent-profile__resume-header">
            <h2 className="buyer-talent-profile__section-title">Professional Experience</h2>
            <div className="buyer-talent-profile__category-filter">
              <label className="sr-only" htmlFor="resume-category">
                Experience category
              </label>
              <select
                id="resume-category"
                className="buyer-talent-profile__category-select"
                value={selectedCategory}
                onChange={(event) =>
                  setSelectedCategory(event.target.value as ResumeExperienceCategory)
                }
              >
                {categories.map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="buyer-talent-profile__category-chevron size-3.5" aria-hidden />
            </div>
          </div>

          {groupedItems.length === 0 ? (
            <p className="buyer-talent-profile__empty">No experiences in this category.</p>
          ) : (
            <ul className="buyer-talent-profile__experience-list">
              {groupedItems.map((group, index) => {
                const expanded = expandedGroupIds.has(group.id);
                const multi = group.children.length > 1;

                return (
                  <li key={group.id}>
                    <button
                      type="button"
                      className="buyer-talent-profile__experience-row"
                      onClick={() => toggleGroup(group)}
                      disabled={!multi}
                    >
                      <ExperienceThumb src={group.imageUrl} />
                      <div className="buyer-talent-profile__experience-copy">
                        <p className="buyer-talent-profile__experience-caption">
                          {group.companyLabel.toUpperCase()}
                        </p>
                        {multi ? (
                          <p className="buyer-talent-profile__experience-title">
                            Tap to view all projects
                          </p>
                        ) : (
                          <p className="buyer-talent-profile__experience-title">
                            {group.children[0]?.title}
                          </p>
                        )}
                      </div>
                      {multi ? (
                        expanded ? (
                          <ChevronUp className="buyer-talent-profile__experience-chevron size-3.5" aria-hidden />
                        ) : (
                          <ChevronDown className="buyer-talent-profile__experience-chevron size-3.5" aria-hidden />
                        )
                      ) : null}
                    </button>

                    {multi && expanded ? (
                      <ul className="buyer-talent-profile__experience-children">
                        {group.children.map((child) => (
                          <li key={child.id} className="buyer-talent-profile__experience-child">
                            <p className="buyer-talent-profile__experience-title">{child.title}</p>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {index < groupedItems.length - 1 ? (
                      <hr className="buyer-talent-profile__experience-divider" />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </>
  );
}

function ExperienceThumb({ src }: { src: string | null }) {
  if (!src) {
    return <div className="buyer-talent-profile__thumb" aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="buyer-talent-profile__thumb" />
  );
}

function VisualsTab({ visuals }: { visuals: ProfileVisual[] }) {
  if (visuals.length === 0) {
    return <EmptyPanel message="Reel and visual slots will appear here when added in Motiion." />;
  }

  return (
    <div className="buyer-talent-profile__visuals-panel">
      <div className="buyer-talent-profile__visuals-row">
        {visuals.map((visual) => (
          <article key={visual.id} className="buyer-talent-profile__video-card">
            <div className="buyer-talent-profile__video-wrap">
              <video src={visual.url} controls playsInline preload="metadata" />
              <span className="buyer-talent-profile__chip buyer-talent-profile__video-label">
                {visualChipLabel(visual)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="buyer-talent-profile__card">
      <p className="buyer-talent-profile__empty">{message}</p>
    </div>
  );
}

function uniqueTags(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function orderVisuals(visuals: ProfileVisual[]): ProfileVisual[] {
  const order: Record<ProfileVisual["kind"], number> = {
    reel: 0,
    skill: 1,
    style: 2,
    slate: 3,
    other: 4,
  };
  return [...visuals].sort((a, b) => {
    const kindDiff = order[a.kind] - order[b.kind];
    if (kindDiff !== 0) return kindDiff;
    return (a.sort ?? 0) - (b.sort ?? 0);
  });
}

function visualChipLabel(visual: ProfileVisual): string {
  switch (visual.kind) {
    case "reel":
      return "Reel";
    case "slate":
      return "Slate";
    case "other":
      return "Other";
    case "skill":
      return visual.ref?.trim() ? `Skill: ${visual.ref}` : "Skill";
    case "style":
      return visual.ref?.trim() ? `Style: ${visual.ref}` : "Style";
  }
}
