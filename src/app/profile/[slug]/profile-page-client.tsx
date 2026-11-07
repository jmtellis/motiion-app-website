"use client";

import Link from "next/link";
import { Apple, ChevronDown, Download, Share } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { PublicPageAnalytics } from "@/components/analytics/PublicPageAnalytics";
import { DiscoverBackHeader } from "@/components/app/DiscoverBackHeader";
import {
  HeadshotViewer,
  PanelSheet,
  VideoViewer,
  type ProfileVideoClip,
} from "@/components/app/talent-profile/ProfileOverlays";
import {
  ListsSheet,
  MessageSheet,
  ProfileActions,
} from "@/components/app/talent-profile/TalentProfileSheet";
import {
  CreditAvatar,
  ExperienceDetail,
  HeroPager,
  HighlightCard,
  TagGroup,
  displayName,
} from "@/components/app/talent-profile/ProfileParts";
import { ProfileWorkBadges } from "@/components/app/talent-profile/ProfileWorkBadges";
import {
  creditChips,
  experienceImage,
  experienceIndexForHighlight,
  experienceIndexesForChip,
  headshots,
  skillVisuals,
  visualOf,
} from "@/components/app/talent-profile/profile-model";
import "@/components/app/talent-profile/talent-profile.css";
import "@/components/ui/chips.css";
import { ProductShell } from "@/components/product/ProductShell";
import { WorkspaceSidePanel } from "@/components/workspace/WorkspaceSidePanel";
import { primaryTalentLabel } from "@/lib/app/talent-label";
import { publicWebUrl } from "@/lib/links/external-url";
import type { CreditChipItem } from "@/lib/profile/profile-credits";
import {
  RESUME_EXPERIENCE_CATEGORIES,
  experienceDisplayTitle,
  parseResumeExperienceCategory,
} from "@/lib/profile/resume-experience";
import { getIosAppStoreUrl } from "@/lib/referrals/app-store";
import type { ProfileExperience, PublicTalentProfile } from "@/types/public";

import "./public-profile.css";

const CREDIT_RAIL_LIMIT = 10;
const PROFILE_SIDE_PANEL_ID = "public-talent-detail-panel";

type Overlay =
  | { kind: "credit"; chip: CreditChipItem }
  | { kind: "credits" }
  | { kind: "experience"; index: number }
  | { kind: "message" }
  | { kind: "lists" };

type RightTab = "resume" | "visuals";

export default function ProfilePageClient({
  profile,
  viewerNavigation = null,
  embedded = false,
  backHref = null,
}: {
  profile: PublicTalentProfile;
  viewerNavigation?: { href: string; label: string } | null;
  /** Inside the signed-in Discover/Talent full profile — no public chrome or join footer. */
  embedded?: boolean;
  /** When embedded, render Discover back chrome inside this client (so tabs can live in the header). */
  backHref?: string | null;
}) {
  const router = useRouter();
  const shellRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [videoIndex, setVideoIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const tabId = useId();

  const name = displayName(profile);
  const firstName = name.split(" ")[0] || name;
  const meta = [primaryTalentLabel(profile.talent_types), profile.location].filter(Boolean).join(" · ");
  const shots = headshots(profile);
  const chips = creditChips(profile);
  const highlights = profile.profile_highlights ?? [];
  const reel = visualOf(profile, "reel");
  const slate = visualOf(profile, "slate");
  const skillsMedia = skillVisuals(profile);
  const resumeUrl = publicWebUrl(profile.resume_url);
  const experiences = profile.experiences ?? [];
  const training = (profile.training ?? []).filter(
    (row) => Boolean(row.title?.trim() || row.organization?.trim() || row.year?.trim()),
  );
  const resumeSections = useMemo(() => buildResumeSections(experiences), [experiences]);

  const shownSkillRefs = new Set(
    skillsMedia.map((item) => item.ref?.trim().toLowerCase()).filter(Boolean),
  );
  const styleTags = (profile.styles ?? []).filter((tag) => !shownSkillRefs.has(tag.toLowerCase()));
  const skillTags = (profile.skills ?? []).filter((tag) => !shownSkillRefs.has(tag.toLowerCase()));

  const visualClips = useMemo<ProfileVideoClip[]>(() => {
    const clips: ProfileVideoClip[] = [];
    if (reel?.url) clips.push({ id: reel.id || "reel", url: reel.url, label: "Reel" });
    if (slate?.url) clips.push({ id: slate.id || "slate", url: slate.url, label: "Slate" });
    for (const item of skillsMedia) {
      if (!item.url) continue;
      clips.push({
        id: item.id,
        url: item.url,
        label: item.ref?.trim() || (item.kind === "style" ? "Style" : "Skill"),
      });
    }
    return clips;
  }, [reel, slate, skillsMedia]);

  const hasVisuals = visualClips.length > 0;
  const [tab, setTab] = useState<RightTab>("resume");
  const [collapsedResumeSections, setCollapsedResumeSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!hasVisuals && tab === "visuals") setTab("resume");
  }, [hasVisuals, tab]);

  const toggleResumeSection = useCallback((key: string) => {
    setCollapsedResumeSections((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  useEffect(() => {
    if (!notice) return;
    const handle = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(handle);
  }, [notice]);

  // Only the right column scrolls — gutters, header, and left column must not move the page.
  useEffect(() => {
    const shell = shellRef.current;
    const scroll = scrollRef.current;
    if (!shell) return;
    const onWheel = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        event.preventDefault();
        return;
      }
      if (scroll?.contains(target)) return;
      event.preventDefault();
    };
    shell.addEventListener("wheel", onWheel, { passive: false });
    return () => shell.removeEventListener("wheel", onWheel);
  }, []);

  const openExperience = useCallback((index: number) => {
    setOverlay({ kind: "experience", index });
  }, []);

  const openCredit = useCallback((chip: CreditChipItem) => {
    const indexes = experienceIndexesForChip(profile, chip);
    if (!indexes.length) {
      setNotice("There's no experience tied to this credit.");
      return;
    }
    if (indexes.length === 1) {
      setOverlay({ kind: "experience", index: indexes[0] });
      return;
    }
    setOverlay({ kind: "credit", chip });
  }, [profile]);

  async function share() {
    const path = `/profile/${encodeURIComponent(profile.username || profile.id)}`;
    const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Profile link copied.");
    } catch {
      setNotice("Copy is unavailable in this browser.");
    }
  }

  const sectionTabs = hasVisuals ? (
    <div className="public-talent__tabs" role="tablist" aria-label="Profile sections">
      <button
        type="button"
        role="tab"
        id={`${tabId}-resume`}
        aria-selected={tab === "resume"}
        aria-controls={`${tabId}-panel`}
        data-active={tab === "resume"}
        onClick={() => setTab("resume")}
      >
        Resume
      </button>
      <button
        type="button"
        role="tab"
        id={`${tabId}-visuals`}
        aria-selected={tab === "visuals"}
        aria-controls={`${tabId}-panel`}
        data-active={tab === "visuals"}
        onClick={() => setTab("visuals")}
      >
        Visuals
      </button>
    </div>
  ) : null;

  const workBadges = <ProfileWorkBadges profile={profile} className="public-talent__work-chips--header" />;

  const profileHeader = !embedded ? (
    <header className="public-talent__topbar">
      <div className="public-talent__topbar-leading">
        <h1 className="public-talent__topbar-title">{name}</h1>
        {workBadges}
      </div>
      {sectionTabs}
    </header>
  ) : backHref ? (
    <DiscoverBackHeader
      href={backHref}
      title={name}
      beside={workBadges}
      trailing={sectionTabs}
    />
  ) : null;

  const publicActions = (
    <div className="talent-profile__actions public-talent__actions">
      <button type="button" className="talent-profile__action" onClick={() => void share()}>
        <Share size={16} aria-hidden />
        Share
      </button>
      <a className="talent-profile__action talent-profile__action--primary" href={getIosAppStoreUrl()}>
        <Apple size={16} aria-hidden />
        Get the app
      </a>
    </div>
  );

  const leftColumn = (
    <aside className="public-talent__sidebar">
      <HeroPager
        name={name}
        meta={meta}
        shots={shots}
        onOpen={setViewer}
        overlayIdentity={false}
        overlayCaption={meta || null}
      />
      {embedded ? (
        <ProfileActions
          profile={profile}
          onNotice={setNotice}
          onLists={() => setOverlay({ kind: "lists" })}
          onMessage={() => setOverlay({ kind: "message" })}
          onBlocked={() => router.back()}
        />
      ) : (
        publicActions
      )}
    </aside>
  );

  const resumeTab = (
    <div className="public-talent__tab-panel talent-profile__body">
      {highlights.length ? (
        <section>
          <div className="talent-profile__section-head"><h4>Highlights</h4></div>
          <div className="talent-profile__rail public-talent__highlight-rail">
            {highlights.map((item) => {
              const index = experienceIndexForHighlight(profile, item);
              return (
                <HighlightCard
                  key={item.id}
                  highlight={item}
                  onClick={index === null ? undefined : () => openExperience(index)}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {styleTags.length ? (
        <section className="public-talent__skills">
          <TagGroup title="Styles" tags={styleTags} />
        </section>
      ) : null}

      {chips.length ? (
        <section className="public-talent__credits">
          <div className="talent-profile__section-head">
            <h4>Credits</h4>
            {chips.length > CREDIT_RAIL_LIMIT ? (
              <button type="button" onClick={() => setOverlay({ kind: "credits" })}>
                See all {chips.length}
              </button>
            ) : null}
          </div>
          <ul className="talent-profile__credit-rail">
            {chips.slice(0, CREDIT_RAIL_LIMIT).map((chip) => (
              <li key={chip.id}>
                <CreditAvatar chip={chip} onClick={() => openCredit(chip)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {resumeSections.length || training.length || resumeUrl ? (
        <section className="public-talent__resume">
          <div className="talent-profile__section-head">
            <h4>Resume</h4>
            {resumeUrl ? (
              <a className="public-talent__download" href={resumeUrl} target="_blank" rel="noopener noreferrer">
                <Download size={15} aria-hidden />
                Download
              </a>
            ) : null}
          </div>
          {resumeSections.length ? (
            <div className="public-resume">
              <div className="public-resume__head" aria-hidden>
                <span>Project</span>
                <span>Role</span>
                <span>Credit</span>
              </div>
              {resumeSections.map((section) => {
                const collapsed = Boolean(collapsedResumeSections[section.key]);
                return (
                  <section
                    key={section.key}
                    className="public-resume__section"
                    aria-label={section.heading}
                    data-collapsed={collapsed}
                  >
                    <button
                      type="button"
                      className="public-resume__section-toggle"
                      aria-expanded={!collapsed}
                      onClick={() => toggleResumeSection(section.key)}
                    >
                      <h5>{section.heading}</h5>
                      <ChevronDown size={16} aria-hidden />
                    </button>
                    <ul>
                      {section.items.map(({ experience, index }) => (
                        <li key={experience.id || `${experience.title}-${index}`}>
                          <button
                            type="button"
                            className="public-resume__row"
                            onClick={() => openExperience(index)}
                          >
                            <span className="public-resume__project">
                              <ResumeThumb experience={experience} />
                              <span>
                                {experienceDisplayTitle(
                                  experience,
                                  parseResumeExperienceCategory(experience.category) ?? "televisionFilm",
                                )}
                              </span>
                            </span>
                            <span className="public-resume__role">{rolesOf(experience) || "—"}</span>
                            <span className="public-resume__credit">{creditOf(experience) || "—"}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : null}
          {training.length ? (
            <div className="public-talent__resume-group">
              <h5>Training</h5>
              <ul className="public-talent__training">
                {training.map((row, index) => (
                  <li key={`${row.title}-${row.organization}-${index}`}>
                    <strong>{row.title || row.organization || "Training"}</strong>
                    {row.organization && row.title ? <span> · {row.organization}</span> : null}
                    {row.year ? <span> · {row.year}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {skillTags.length ? (
        <section className="public-talent__skills">
          <TagGroup title="Skills" tags={skillTags} />
        </section>
      ) : null}

      {!highlights.length && !chips.length && !resumeSections.length && !training.length && !styleTags.length && !skillTags.length ? (
        <div className="public-talent__empty">
          <p>This profile is getting started. Credits and resume details will appear here as they are added.</p>
        </div>
      ) : null}
    </div>
  );

  const visualsTab = (
    <div className="public-talent__tab-panel talent-profile__body">
      <section>
        <div className="talent-profile__section-head"><h4>Visuals</h4></div>
        <ul className="public-talent__visual-rail">
          {visualClips.map((clip, index) => (
            <li key={clip.id}>
              <button
                type="button"
                className="public-talent__visual-card"
                onClick={() => setVideoIndex(index)}
                aria-label={`Open ${clip.label}`}
              >
                <video src={clip.url} muted playsInline preload="metadata" />
                <span>{clip.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );

  const rightColumn = (
    <div ref={scrollRef} className="public-talent__scroll">
      <div role="tabpanel" id={`${tabId}-panel`} aria-labelledby={`${tabId}-${hasVisuals ? tab : "resume"}`}>
        {tab === "visuals" && hasVisuals ? visualsTab : resumeTab}
      </div>

      {!embedded ? (
        <footer className="public-talent__cta">
          <div>
            <h2>See more of {firstName} on Motiion</h2>
            <p>Explore talent, opportunities, and the dance industry in the Motiion app.</p>
          </div>
          <div className="public-talent__cta-actions">
            <a className="ui-button" href={getIosAppStoreUrl()}>
              Get the iOS app
            </a>
            <Link className="ui-button ui-button--secondary" href={viewerNavigation?.href ?? "/signup"}>
              {viewerNavigation?.label ?? "Join Motiion"}
            </Link>
          </div>
        </footer>
      ) : null}
    </div>
  );

  const detailOverlay =
    overlay?.kind === "credits" || overlay?.kind === "credit" || overlay?.kind === "experience"
      ? overlay
      : null;

  const detailTitle =
    detailOverlay?.kind === "credits"
      ? "Credits"
      : detailOverlay?.kind === "credit"
        ? detailOverlay.chip.title
        : detailOverlay?.kind === "experience"
          ? experiences[detailOverlay.index]?.title?.trim() || "Experience"
          : "Details";

  const detailContent =
    detailOverlay?.kind === "credits" ? (
      <ul className="talent-profile__credit-grid talent-profile__credit-grid--panel">
        {chips.map((chip) => (
          <li key={chip.id}>
            <CreditAvatar chip={chip} onClick={() => openCredit(chip)} />
          </li>
        ))}
      </ul>
    ) : detailOverlay?.kind === "credit" ? (
      <ul className="public-talent__panel-list">
        {experienceIndexesForChip(profile, detailOverlay.chip).map((index) => {
          const experience = experiences[index];
          return (
            <li key={experience.id || `${experience.title}-${index}`}>
              <button
                type="button"
                className="home-profile-row"
                onClick={() => setOverlay({ kind: "experience", index })}
              >
                <ResumeThumb experience={experience} />
                <span className="home-profile-row__copy">
                  <span className="home-profile-row__label">{experience.title}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    ) : detailOverlay?.kind === "experience" && experiences[detailOverlay.index] ? (
      <ExperienceDetail experience={experiences[detailOverlay.index]} />
    ) : null;

  // In-app: dock into the workspace third column and push the main frame
  // (same pattern as Portfolio headshots/visuals). Public pages keep the overlay sheet.
  const detailPanel = embedded ? (
    <WorkspaceSidePanel
      id={PROFILE_SIDE_PANEL_ID}
      open={detailOverlay !== null}
      title={detailTitle}
      onClose={() => setOverlay(null)}
    >
      {detailContent}
    </WorkspaceSidePanel>
  ) : detailOverlay ? (
    <PanelSheet title={detailTitle} onClose={() => setOverlay(null)}>
      {detailContent}
    </PanelSheet>
  ) : null;

  const body = (
    <div ref={shellRef} className={`public-talent${embedded ? " public-talent--embedded" : ""}`}>
      {profileHeader}
      <div className="public-talent__layout">
        {leftColumn}
        {rightColumn}
      </div>

      {!embedded && !viewerNavigation ? (
        <div className="public-talent__app-bar">
          <p>Open in the Motiion app</p>
          <a href={getIosAppStoreUrl()}>Get the app</a>
        </div>
      ) : null}

      {detailPanel}

      {overlay?.kind === "message" ? (
        <MessageSheet profile={profile} onClose={() => setOverlay(null)} onNotice={setNotice} />
      ) : null}

      {overlay?.kind === "lists" ? (
        <ListsSheet profile={profile} onClose={() => setOverlay(null)} onNotice={setNotice} />
      ) : null}

      {viewer !== null && shots.length ? (
        <HeadshotViewer
          urls={shots}
          name={name}
          initialIndex={Math.min(viewer, shots.length - 1)}
          onClose={() => setViewer(null)}
        />
      ) : null}

      {videoIndex !== null && visualClips.length ? (
        <VideoViewer
          clips={visualClips}
          name={name}
          initialIndex={Math.min(videoIndex, visualClips.length - 1)}
          onClose={() => setVideoIndex(null)}
        />
      ) : null}

      {notice ? <p className="talent-profile__toast" role="status">{notice}</p> : null}
    </div>
  );

  if (embedded) {
    return (
      <div className="public-profile-theme public-profile-embedded">
        <PublicPageAnalytics
          eventName="profile_viewed"
          properties={{ slug: profile.username ?? profile.id, embedded: true }}
          path={`/profile/${profile.username ?? profile.id}`}
        />
        {body}
      </div>
    );
  }

  return (
    <ProductShell className="public-profile-theme" appearance="light">
      <PublicPageAnalytics
        eventName="profile_viewed"
        properties={{ slug: profile.username ?? profile.id }}
        path={`/profile/${profile.username ?? profile.id}`}
      />
      <nav className="public-profile-nav" aria-label="Motiion">
        <Link href={viewerNavigation?.href ?? "/"} className="public-profile-brand">
          Motiion
        </Link>
        <Link href={viewerNavigation?.href ?? "/login"}>
          {viewerNavigation?.label ?? "Log in"}
        </Link>
      </nav>
      {body}
    </ProductShell>
  );
}

function ResumeThumb({ experience }: { experience: ProfileExperience }) {
  const resolved = experienceImage(experience);
  // Defer the real URL until after mount so Brandfetch client-id refresh can't
  // mismatch server HTML (hydration) when env differs between server and client.
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setSrc(resolved);
  }, [resolved]);
  if (!src || failed) {
    return <span className="public-resume__thumb" aria-hidden>{experience.title.charAt(0)}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="public-resume__thumb"
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

function buildResumeSections(experiences: ProfileExperience[]) {
  return RESUME_EXPERIENCE_CATEGORIES.map((section) => ({
    ...section,
    heading: section.label.replace("/", " / "),
    items: experiences
      .map((experience, index) => ({ experience, index }))
      .filter(({ experience }) => parseResumeExperienceCategory(experience.category) === section.key),
  })).filter((section) => section.items.length > 0);
}

function rolesOf(experience: ProfileExperience) {
  const roles = (experience.roles ?? []).map((role) => role.trim()).filter(Boolean);
  if (roles.length) return roles.join(", ");
  return experience.role?.trim() || "";
}

function creditOf(experience: ProfileExperience) {
  const category = parseResumeExperienceCategory(experience.category);
  const names = [
    ...(experience.choreographers ?? []),
    ...(experience.associate_choreographers ?? []),
    ...(experience.assistants ?? []),
    experience.main_talent,
    category === "musicVideos" ? (experience.song_artists?.[0] ?? experience.credits_display_name ?? experience.credits) : null,
    experience.production_company || experience.theater_name,
    category !== "musicVideos" ? (experience.credits_display_name || experience.credits) : null,
  ]
    .map((value) => value?.trim())
    .filter(Boolean);
  return [...new Set(names)].join(", ");
}
