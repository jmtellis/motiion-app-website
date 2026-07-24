"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  ExternalLink,
  Loader2,
  MoreHorizontal,
} from "lucide-react";

import { fetchReviewTalentProfile } from "@/app/(buyer-app)/(paid)/talent/actions";
import { buildAttributeStrip, type AttributeStripItem } from "@/lib/profile/attribute-strip";
import { COLLAPSED_CHIP_LIMIT } from "@/lib/profile/profile-credits";
import {
  buildResumeExperienceItems,
  groupResumeExperienceItems,
  visibleResumeCategories,
  type GroupedResumeExperience,
  type ResumeExperienceItem,
} from "@/lib/profile/resume-experience";
import type { ProfileExperience, ProfileVisual, PublicTalentProfile } from "@/types/public";

import "../buyer-talent-profile.css";

export type FocusMediaPreview =
  | { kind: "image"; id: string; url: string }
  | { kind: "video"; id: string; url: string };

export type ProfileTab = "about" | "resume" | "visuals";

export const PROFILE_VIEW_OPTIONS: { id: ProfileTab; label: string }[] = [
  { id: "about", label: "About" },
  { id: "resume", label: "Resume" },
  { id: "visuals", label: "Visuals" },
];

type BrowseFocusProfileSectionsProps = {
  slugOrId: string;
  selectedMediaId?: string | null;
  primaryPreview?: FocusMediaPreview | null;
  onSelectMedia?: (preview: FocusMediaPreview) => void;
  onProjectDetailOpenChange?: (open: boolean) => void;
  tab?: ProfileTab;
  onTabChange?: (tab: ProfileTab) => void;
  onProfileMeta?: (meta: { resumeUrl: string | null; talentUserId: string }) => void;
};

type PhotoRailItem =
  | { kind: "headshot"; id: string; url: string }
  | { kind: "visual"; id: string; label: string; url: string };

type HighlightRailItem = {
  id: string;
  title: string;
  imageUrl: string | null;
};

export function BrowseFocusProfileSections({
  slugOrId,
  selectedMediaId = null,
  primaryPreview = null,
  onSelectMedia,
  onProjectDetailOpenChange,
  tab: tabControlled,
  onTabChange,
  onProfileMeta,
}: BrowseFocusProfileSectionsProps) {
  const [profile, setProfile] = useState<PublicTalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabInternal, setTabInternal] = useState<ProfileTab>("about");
  const [activeProject, setActiveProject] = useState<ResumeExperienceItem | null>(null);
  const tab = tabControlled ?? tabInternal;

  function setTab(next: ProfileTab) {
    if (onTabChange) onTabChange(next);
    else setTabInternal(next);
  }

  useEffect(() => {
    setActiveProject(null);
    onProjectDetailOpenChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clear nested project when view changes
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    const key = slugOrId.trim();
    if (!key) {
      setProfile(null);
      setLoading(false);
      setError("Missing profile.");
      return;
    }

    setLoading(true);
    setError(null);
    setTab("about");
    setActiveProject(null);
    onProjectDetailOpenChange?.(false);
    void fetchReviewTalentProfile(key).then((result) => {
      if (cancelled) return;
      if (result.error || !result.profile) {
        setProfile(null);
        setError(result.error ?? "Could not load profile.");
        onProfileMeta?.({ resumeUrl: null, talentUserId: "" });
      } else {
        setProfile(result.profile);
        onProfileMeta?.({
          resumeUrl: result.profile.resume_url?.trim() || null,
          talentUserId: result.profile.user_id?.trim() || result.profile.id,
        });
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on talent key only
  }, [slugOrId]);

  const attributeStrip = useMemo(
    () => (profile ? buildAttributeStrip(profile) : []),
    [profile],
  );

  const styleTags = useMemo(() => {
    if (!profile) return [] as string[];
    return uniqueTags([...profile.styles, ...profile.talent_types]);
  }, [profile]);

  const photoRailItems = useMemo(() => {
    if (!profile) return [] as PhotoRailItem[];

    const headshots = collectHeadshots(profile).map((url, index) => ({
      kind: "headshot" as const,
      id: `headshot-${index}`,
      url,
    }));

    const visuals: PhotoRailItem[] = orderReelAndSlate(
      (profile.profile_visuals ?? []).filter(
        (visual) => visual.kind === "reel" || visual.kind === "slate",
      ),
    ).map((visual) => ({
      kind: "visual" as const,
      id: visual.id,
      label: visual.kind === "slate" ? "Slate" : "Reel",
      url: visual.url,
    }));

    return [...headshots, ...visuals];
  }, [profile]);

  const highlightItems = useMemo(() => {
    if (!profile) return [] as HighlightRailItem[];
    return (profile.profile_highlights ?? []).map((highlight) => ({
      id: highlight.id,
      title: highlight.title,
      imageUrl: highlight.image_url?.trim() || null,
    }));
  }, [profile]);

  const orderedVisuals = useMemo(
    () => (profile ? orderVisuals(profile.profile_visuals ?? []) : []),
    [profile],
  );

  function openProject(item: ResumeExperienceItem) {
    setActiveProject(item);
    onProjectDetailOpenChange?.(true);
    const preview = projectMediaPreview(item);
    if (preview && onSelectMedia) onSelectMedia(preview);
  }

  function closeProject() {
    setActiveProject(null);
    onProjectDetailOpenChange?.(false);
    if (primaryPreview && onSelectMedia) onSelectMedia(primaryPreview);
  }

  if (loading) {
    return (
      <div className="talent-navigator__focus-profile-status">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        <span>Loading profile…</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <p className="talent-navigator__focus-profile-status talent-navigator__focus-profile-status--muted">
        {error ?? "Profile details unavailable."}
      </p>
    );
  }

  if (activeProject) {
    return <ProjectDetailPanel item={activeProject} onBack={closeProject} />;
  }

  const skills = profile.skills ?? [];

  const hasAboutContent = photoRailItems.length > 0 || highlightItems.length > 0;

  return (
    <div className="talent-navigator__focus-profile-sections">
      <div className="talent-navigator__focus-profile-scroll" data-lenis-prevent>
        {attributeStrip.length > 0 ? (
          <div className="talent-navigator__focus-attribute-wrap">
            <AttributeStrip items={attributeStrip} />
          </div>
        ) : null}

        <div className="talent-navigator__focus-profile-panel">
        {tab === "about" ? (
          hasAboutContent ? (
            <div className="talent-navigator__focus-about">
              {photoRailItems.length > 0 ? (
                <FocusMediaSection title="Media" count={photoRailItems.length} ariaLabel="Media">
                  {photoRailItems.map((item) =>
                    item.kind === "headshot" ? (
                      <ImageTile
                        key={item.id}
                        url={item.url}
                        label="Headshot"
                        selected={selectedMediaId === item.id}
                        onSelect={
                          onSelectMedia
                            ? () => onSelectMedia({ kind: "image", id: item.id, url: item.url })
                            : undefined
                        }
                      />
                    ) : (
                      <VisualTile
                        key={item.id}
                        label={item.label}
                        url={item.url}
                        selected={selectedMediaId === item.id}
                        hideCaption
                        showVideoBadge
                        onSelect={
                          onSelectMedia
                            ? () => onSelectMedia({ kind: "video", id: item.id, url: item.url })
                            : undefined
                        }
                      />
                    ),
                  )}
                </FocusMediaSection>
              ) : null}

              {highlightItems.length > 0 ? (
                <FocusMediaSection
                  title="Career Highlights"
                  count={highlightItems.length}
                  ariaLabel="Career Highlights"
                >
                  {highlightItems.map((item) => (
                    <HighlightTile key={item.id} highlight={item} />
                  ))}
                </FocusMediaSection>
              ) : null}
            </div>
          ) : (
            <p className="talent-navigator__focus-profile-status talent-navigator__focus-profile-status--muted">
              Profile details will appear here when added in Motiion.
            </p>
          )
        ) : null}

        {tab === "resume" ? (
          <ResumePanel
            experiences={profile.experiences}
            styleTags={styleTags}
            skills={skills}
            onOpenProject={openProject}
          />
        ) : null}

        {tab === "visuals" ? (
          <VisualsPanel
            visuals={orderedVisuals}
            selectedMediaId={selectedMediaId}
            onSelectMedia={onSelectMedia}
          />
        ) : null}
        </div>
      </div>
    </div>
  );
}

function AttributeStrip({ items }: { items: AttributeStripItem[] }) {
  return (
    <section className="buyer-talent-profile__attribute-strip">
      <dl className="buyer-talent-profile__attribute-strip-track" data-lenis-prevent>
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

function ResumePanel({
  experiences,
  styleTags,
  skills,
  onOpenProject,
}: {
  experiences: PublicTalentProfile["experiences"];
  styleTags: string[];
  skills: string[];
  onOpenProject: (item: ResumeExperienceItem) => void;
}) {
  const categories = useMemo(() => visibleResumeCategories(experiences), [experiences]);

  const categoryRows = useMemo(() => {
    const rows = categories.map(({ key, label }) => {
      const items = buildResumeExperienceItems(experiences, key);
      return {
        key,
        label,
        groups: groupResumeExperienceItems(items),
        count: items.length,
      };
    });
    return rows.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [categories, experiences]);

  const hasContent = categoryRows.length > 0 || styleTags.length > 0 || skills.length > 0;

  if (!hasContent) {
    return (
      <p className="talent-navigator__focus-profile-status talent-navigator__focus-profile-status--muted">
        Resume details will appear here when added in Motiion.
      </p>
    );
  }

  return (
    <>
      {styleTags.length > 0 ? (
        <section className="talent-navigator__focus-section">
          <h2 className="talent-navigator__focus-section-heading">
            <span>Styles</span>
            <span className="talent-navigator__focus-section-count">{styleTags.length}</span>
          </h2>
          <TextPillChipGroup items={styleTags} />
        </section>
      ) : null}

      {categoryRows.length > 0 ? (
        <div className="talent-navigator__focus-experience-rows">
          {categoryRows.map((row) => (
            <ExperienceCategoryRow
              key={row.key}
              label={row.label}
              count={row.count}
              groups={row.groups}
              onOpenProject={onOpenProject}
            />
          ))}
        </div>
      ) : null}

      {skills.length > 0 ? (
        <section className="talent-navigator__focus-section">
          <h2 className="talent-navigator__focus-section-heading">
            <span>Skills</span>
            <span className="talent-navigator__focus-section-count">{skills.length}</span>
          </h2>
          <TextPillChipGroup items={skills} />
        </section>
      ) : null}
    </>
  );
}

function ExperienceCategoryRow({
  label,
  count,
  groups,
  onOpenProject,
}: {
  label: string;
  count: number;
  groups: GroupedResumeExperience[];
  onOpenProject: (item: ResumeExperienceItem) => void;
}) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  return (
    <FocusMediaSection title={label} count={count} ariaLabel={label}>
      {groups.map((group) => (
        <ArtistExperienceTile
          key={group.id}
          group={group}
          menuOpen={openGroupId === group.id}
          onToggleMenu={() =>
            setOpenGroupId((current) => (current === group.id ? null : group.id))
          }
          onCloseMenu={() => setOpenGroupId(null)}
          onOpenProject={(item) => {
            setOpenGroupId(null);
            onOpenProject(item);
          }}
        />
      ))}
    </FocusMediaSection>
  );
}

function ArtistExperienceTile({
  group,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onOpenProject,
}: {
  group: GroupedResumeExperience;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onOpenProject: (item: ResumeExperienceItem) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const image = group.imageUrl;
  const multi = group.children.length > 1;
  const single = group.children[0];

  useLayoutEffect(() => {
    if (!menuOpen || !wrapRef.current) {
      setMenuPos(null);
      return;
    }

    function updatePosition() {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.min(16.5 * 16, window.innerWidth * 0.7);
      let left = rect.left;
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8);
      }

      const preferredTop = rect.bottom + 8;
      const estimatedHeight = Math.min(14 * 16 + 48, group.children.length * 48 + 48);
      const top =
        preferredTop + estimatedHeight > window.innerHeight - 8
          ? Math.max(8, rect.top - estimatedHeight - 8)
          : preferredTop;

      setMenuPos({ top, left, width });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen, group.children.length]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onCloseMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseMenu();
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, onCloseMenu]);

  return (
    <div className="talent-navigator__focus-artist-tile-wrap" ref={wrapRef}>
      <figure className="talent-navigator__focus-media-item talent-navigator__focus-media-item--lg">
        <button
          type="button"
          className="talent-navigator__focus-media-btn"
          onClick={() => {
            if (multi) {
              onToggleMenu();
              return;
            }
            if (single) onOpenProject(single);
          }}
          aria-expanded={multi ? menuOpen : undefined}
          aria-haspopup={multi ? "menu" : undefined}
          aria-label={
            multi
              ? `${group.companyLabel}, ${group.children.length} projects`
              : `${single?.title ?? group.companyLabel}`
          }
        >
          <div className="talent-navigator__focus-media-tile">
            {image && !imageFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" onError={() => setImageFailed(true)} />
            ) : (
              <div className="talent-navigator__focus-media-tile-fallback" aria-hidden />
            )}
            {multi ? (
              <span className="talent-navigator__focus-artist-count-badge">
                {group.children.length}
              </span>
            ) : null}
          </div>
          <span className="talent-navigator__focus-experience-caption">
            <span className="talent-navigator__focus-experience-tile-title">
              {multi ? group.companyLabel : (single?.title ?? group.companyLabel)}
            </span>
            <span className="talent-navigator__focus-experience-tile-company">
              {multi
                ? `${group.children.length} projects`
                : (single?.companyLabel ?? group.companyLabel)}
            </span>
          </span>
        </button>
      </figure>

      {menuOpen && multi && menuPos
        ? createPortal(
            <div
              ref={menuRef}
              className="talent-navigator__focus-artist-menu talent-navigator__focus-artist-menu--portal"
              role="menu"
              aria-label={group.companyLabel}
              style={{
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
              }}
            >
              <p className="talent-navigator__focus-artist-menu-title">{group.companyLabel}</p>
              <ul className="talent-navigator__focus-artist-menu-list">
                {group.children.map((child) => (
                  <li key={child.id}>
                    <button
                      type="button"
                      role="menuitem"
                      className="talent-navigator__focus-artist-menu-item"
                      onClick={() => onOpenProject(child)}
                    >
                      <ExperienceThumb src={child.imageUrl} />
                      <span className="talent-navigator__focus-artist-menu-item-copy">
                        <span className="talent-navigator__focus-artist-menu-item-title">
                          {child.title}
                        </span>
                        {formatRoles(child.entry) ? (
                          <span className="talent-navigator__focus-artist-menu-item-meta">
                            {formatRoles(child.entry)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function ExperienceThumb({ src }: { src: string | null }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!src || imageFailed) {
    return <div className="talent-navigator__focus-artist-menu-thumb" aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="talent-navigator__focus-artist-menu-thumb"
      onError={() => setImageFailed(true)}
    />
  );
}

function ProjectDetailPanel({
  item,
  onBack,
}: {
  item: ResumeExperienceItem;
  onBack: () => void;
}) {
  const details = buildProjectDetailRows(item.entry, item);

  return (
    <div className="talent-navigator__focus-project">
      <button type="button" className="talent-navigator__focus-project-back" onClick={onBack}>
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to profile
      </button>

      <div className="talent-navigator__focus-project-header">
        <h2 className="talent-navigator__focus-project-title">{item.title}</h2>
        <p className="talent-navigator__focus-project-company">{item.companyLabel}</p>
      </div>

      {details.length > 0 ? (
        <dl className="talent-navigator__focus-project-meta">
          {details.map((row) => (
            <div key={row.label} className="talent-navigator__focus-project-meta-row">
              <dt>{row.label}</dt>
              <dd>
                {row.href ? (
                  <a href={row.href} target="_blank" rel="noopener noreferrer">
                    {row.value}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="talent-navigator__focus-profile-status talent-navigator__focus-profile-status--muted">
          No additional project details available.
        </p>
      )}
    </div>
  );
}

function VisualsPanel({
  visuals,
  selectedMediaId,
  onSelectMedia,
}: {
  visuals: ProfileVisual[];
  selectedMediaId?: string | null;
  onSelectMedia?: (preview: FocusMediaPreview) => void;
}) {
  if (visuals.length === 0) {
    return (
      <p className="talent-navigator__focus-profile-status talent-navigator__focus-profile-status--muted">
        Reel and visual slots will appear here when added in Motiion.
      </p>
    );
  }

  return (
    <FocusMediaSection title="Visuals" count={visuals.length} ariaLabel="Visuals">
      {visuals.map((visual) => (
        <VisualTile
          key={visual.id}
          label={visualChipLabel(visual)}
          url={visual.url}
          large
          selected={selectedMediaId === visual.id}
          showVideoBadge
          onSelect={
            onSelectMedia
              ? () => onSelectMedia({ kind: "video", id: visual.id, url: visual.url })
              : undefined
          }
        />
      ))}
    </FocusMediaSection>
  );
}

function FocusMediaSection({
  title,
  count,
  ariaLabel,
  children,
}: {
  title: string;
  count?: number;
  ariaLabel: string;
  children: ReactNode;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  function updateScrollState() {
    const el = railRef.current;
    if (!el) {
      setCanPrev(false);
      setCanNext(false);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 2);
    setCanNext(maxScroll - el.scrollLeft > 2);
  }

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [children]);

  function scrollByDirection(direction: -1 | 1) {
    const el = railRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.72, 200);
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  return (
    <section className="talent-navigator__focus-section">
      <div className="talent-navigator__focus-section-header">
        <h2 className="talent-navigator__focus-section-heading">
          <span>{title}</span>
          {count != null ? (
            <span className="talent-navigator__focus-section-count">{count}</span>
          ) : null}
        </h2>
        <div className="talent-navigator__focus-section-nav" aria-label={`${title} navigation`}>
          <button
            type="button"
            className="talent-navigator__focus-section-nav-btn"
            onClick={() => scrollByDirection(-1)}
            disabled={!canPrev}
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className="talent-navigator__focus-section-nav-btn"
            onClick={() => scrollByDirection(1)}
            disabled={!canNext}
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
      <div
        ref={railRef}
        className="talent-navigator__focus-media-rail"
        data-lenis-prevent
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </section>
  );
}

function ImageTile({
  url,
  label,
  selected = false,
  onSelect,
}: {
  url: string;
  label: string;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const media = (
    <div
      className={`talent-navigator__focus-media-tile${
        selected ? " talent-navigator__focus-media-tile--selected" : ""
      }`}
    >
      {!imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" onError={() => setImageFailed(true)} />
      ) : (
        <div className="talent-navigator__focus-media-tile-fallback" aria-hidden />
      )}
    </div>
  );

  return (
    <figure className="talent-navigator__focus-media-item talent-navigator__focus-media-item--lg">
      {onSelect ? (
        <button
          type="button"
          className="talent-navigator__focus-media-btn"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`Show ${label.toLowerCase()}`}
        >
          {media}
        </button>
      ) : (
        media
      )}
    </figure>
  );
}

function HighlightTile({ highlight }: { highlight: HighlightRailItem }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = highlight.imageUrl;

  return (
    <figure className="talent-navigator__focus-media-item talent-navigator__focus-media-item--lg">
      <div className="talent-navigator__focus-media-tile">
        {image && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" onError={() => setImageFailed(true)} />
        ) : (
          <div className="talent-navigator__focus-media-tile-fallback" aria-hidden />
        )}
      </div>
      <figcaption className="talent-navigator__focus-media-caption">{highlight.title}</figcaption>
    </figure>
  );
}

function VisualTile({
  label,
  url,
  selected = false,
  hideCaption = false,
  showVideoBadge = false,
  large = false,
  onSelect,
}: {
  label: string;
  url: string;
  selected?: boolean;
  hideCaption?: boolean;
  showVideoBadge?: boolean;
  large?: boolean;
  onSelect?: () => void;
}) {
  const media = (
    <div
      className={`talent-navigator__focus-media-tile${
        selected ? " talent-navigator__focus-media-tile--selected" : ""
      }`}
    >
      <video
        src={url}
        muted
        playsInline
        preload="metadata"
        controls={!onSelect && !showVideoBadge}
      />
      {showVideoBadge ? (
        <span className="talent-navigator__focus-video-badge" aria-hidden>
          <Clapperboard className="size-4" strokeWidth={1.75} />
        </span>
      ) : null}
    </div>
  );

  const useLarge = large || hideCaption;

  return (
    <figure
      className={`talent-navigator__focus-media-item${
        useLarge ? " talent-navigator__focus-media-item--lg" : ""
      }`}
    >
      {onSelect ? (
        <button
          type="button"
          className="talent-navigator__focus-media-btn"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`Show ${label.toLowerCase()}`}
        >
          {media}
          {hideCaption ? null : (
            <span className="talent-navigator__focus-media-caption">{label}</span>
          )}
        </button>
      ) : (
        <>
          {media}
          {hideCaption ? null : (
            <figcaption className="talent-navigator__focus-media-caption">{label}</figcaption>
          )}
        </>
      )}
    </figure>
  );
}

function projectMediaPreview(item: ResumeExperienceItem): FocusMediaPreview | null {
  const link = item.entry.link_url?.trim() || "";
  if (link && isDirectVideoUrl(link)) {
    return { kind: "video", id: `experience-${item.id}`, url: link };
  }
  if (item.imageUrl) {
    return { kind: "image", id: `experience-${item.id}`, url: item.imageUrl };
  }
  return null;
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function formatRoles(entry: ProfileExperience): string | null {
  if (entry.roles?.length) return entry.roles.filter(Boolean).join(", ");
  return entry.role?.trim() || null;
}

function formatDateRange(entry: ProfileExperience): string | null {
  const start = entry.start_date?.trim();
  const end = entry.end_date?.trim();
  if (start && end) return `${start} – ${end}`;
  return start || end || null;
}

function buildProjectDetailRows(
  entry: ProfileExperience,
  item: ResumeExperienceItem,
): { label: string; value: string; href?: string }[] {
  const rows: { label: string; value: string; href?: string }[] = [];

  if (item.companyLabel) rows.push({ label: "With", value: item.companyLabel });

  const roles = formatRoles(entry);
  if (roles) rows.push({ label: "Role", value: roles });
  if (entry.director?.trim()) rows.push({ label: "Director", value: entry.director.trim() });
  if (entry.main_talent?.trim()) rows.push({ label: "Talent", value: entry.main_talent.trim() });
  if (entry.production_company?.trim()) {
    rows.push({ label: "Production", value: entry.production_company.trim() });
  }
  if (entry.theater_name?.trim()) rows.push({ label: "Venue", value: entry.theater_name.trim() });
  if (entry.song_artists?.length) {
    rows.push({ label: "Artists", value: entry.song_artists.filter(Boolean).join(", ") });
  }
  if (entry.choreographers?.length) {
    rows.push({ label: "Choreographers", value: entry.choreographers.filter(Boolean).join(", ") });
  }
  if (entry.associate_choreographers?.length) {
    rows.push({
      label: "Associate Choreographers",
      value: entry.associate_choreographers.filter(Boolean).join(", "),
    });
  }
  if (entry.assistants?.length) {
    rows.push({ label: "Assistants", value: entry.assistants.filter(Boolean).join(", ") });
  }

  const dates = formatDateRange(entry);
  if (dates) rows.push({ label: "Dates", value: dates });

  if (entry.alternate_title?.trim() && entry.alternate_title.trim() !== item.title) {
    rows.push({ label: "Also known as", value: entry.alternate_title.trim() });
  }

  const link = entry.link_url?.trim();
  if (link) rows.push({ label: "Link", value: "Open project link", href: link });

  return rows;
}

function collectHeadshots(profile: PublicTalentProfile): string[] {
  const urls = [profile.headshot_url, ...(profile.headshot_urls ?? [])].filter(
    (url): url is string => Boolean(url?.trim()),
  );
  return [...new Set(urls)];
}

function orderReelAndSlate(visuals: ProfileVisual[]): ProfileVisual[] {
  return [...visuals].sort((a, b) => {
    if (a.kind === b.kind) return (a.sort ?? 0) - (b.sort ?? 0);
    return a.kind === "reel" ? -1 : 1;
  });
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
