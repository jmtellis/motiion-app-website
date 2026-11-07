"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { ReportContentDialog } from "@/components/settings/ReportContentDialog";
import { blockUser } from "@/app/settings/moderation-actions";
import {
  Bell,
  BellOff,
  Check,
  ChevronRight,
  ExternalLink,
  Heart,
  ImageIcon,
  Link2,
  ListPlus,
  Loader2,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Play,
  Plus,
  Share,
  Sparkles,
  Briefcase,
  Flag,
  ShieldOff,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { useIndustryProOptional, useIsIndustryWorkspace } from "@/components/talent-buyers/billing/IndustryProContext";
import { fetchIndustryTalentSaveState, setIndustryTalentSaved, setIndustryRosterMembership, createIndustryRosterForTalent } from "@/lib/talent-buyers/roster-profile-actions";
import { loadHomeProfile } from "@/app/(app)/home/actions";
import { useWorkspaceViewerId } from "@/components/workspace/WorkspaceNotifications";
import { primaryTalentLabel } from "@/lib/app/talent-label";
import { startConversationWith } from "@/lib/app/conversations";
import type { CreditChipItem } from "@/lib/profile/profile-credits";
import {
  addToDiscoverList,
  createDiscoverList,
  fetchTalentSaveState,
  recordProfileView,
  removeFromDiscoverList,
  toggleFavorite,
  toggleNotifyMe,
  type TalentSaveState,
} from "@/lib/talent/referrer-lists";
import type { PublicTalentProfile } from "@/types/public";

import { HeadshotViewer, PanelSheet } from "./ProfileOverlays";
import {
  CreditAvatar,
  ExperienceDetail,
  ExperienceThumb,
  HeroPager,
  HighlightCard,
  SkillsPage,
  VisualPlayer,
  displayName,
} from "./ProfileParts";
import {
  SECTION_LABEL,
  categoryLabel,
  creditChips,
  experienceIndexForHighlight,
  experienceIndexesForChip,
  hasWorkDetails,
  headshots,
  publicRepresentation,
  sectionAvailable,
  socialLinks,
  visualOf,
  type ProfileSection,
} from "./profile-model";
import "./talent-profile.css";

type ProfilePage =
  | { kind: "section"; section: ProfileSection }
  | { kind: "experience"; index: number };

type Overlay =
  | { kind: "credit"; chip: CreditChipItem }
  | { kind: "lists" }
  | { kind: "message" };

export type TalentProfileChrome = {
  title: string | null;
  pop: (() => void) | null;
};

const CREDIT_RAIL_LIMIT = 10;

export function TalentProfileSheet({
  slug,
  userId,
  onChrome,
  matchReason,
  variant = "sheet",
  onOpenFullProfile,
  onClose,
}: {
  slug: string;
  userId?: string;
  onChrome: (chrome: TalentProfileChrome) => void;
  matchReason?: string | null;
  /** Preview: actions, highlights, socials — no deep portfolio drill-in. */
  variant?: "sheet" | "preview";
  onOpenFullProfile?: (profile: PublicTalentProfile) => void;
  /** Overlay close control on the hero (headerless side panels). */
  onClose?: () => void;
}) {
  const preview = variant === "preview";
  const viewerId = useWorkspaceViewerId();
  const industryWorkspace = useIsIndustryWorkspace();
  const [blocked, setBlocked] = useState<{ slug: string; name: string } | null>(null);
  const [profile, setProfile] = useState<PublicTalentProfile | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [stack, setStack] = useState<ProfilePage[]>([]);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const scrollAnchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadHomeProfile(slug, userId).then((result) => {
      if (cancelled) return;
      setLoadError(null);
      setProfile(result.profile);
      if (result.profile) void recordProfileView(result.profile.id);
    }).catch(() => {
      if (!cancelled) setLoadError("We couldn’t load this profile. Check your connection and try again.");
    });
    return () => {
      cancelled = true;
    };
  }, [slug, userId, loadAttempt]);

  useEffect(() => {
    if (!notice) return;
    const handle = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(handle);
  }, [notice]);

  const page = stack.at(-1) ?? null;
  const title = profile && page ? pageTitle(profile, page) : null;

  useEffect(() => {
    onChrome({
      title: preview ? null : title,
      pop: preview || !stack.length ? null : () => setStack((current) => current.slice(0, -1)),
    });
  }, [onChrome, preview, stack.length, title]);

  useEffect(() => {
    scrollAnchor.current?.closest(".workspace-side-panel__body")?.scrollTo({ top: 0 });
  }, [stack.length]);

  const open = useCallback((next: ProfilePage) => setStack((current) => [...current, next]), []);

  if (blocked?.slug === slug) return <div className="ui-state" role="status"><h2>{blocked.name} is blocked</h2><p>This person is hidden from your messages, search, Discover, and feeds. You can unblock them in settings.</p><Link className="ui-button ui-button--secondary" href={industryWorkspace ? "/dashboard/settings?section=privacy" : "/settings?section=resources"}>Manage blocked users</Link></div>;
  if (loadError) return <div className="ui-state ui-state--error" role="alert"><h2>Profile unavailable</h2><p>{loadError}</p><button type="button" className="ui-button" onClick={() => { setLoadError(null); setLoadAttempt((value) => value + 1); }}>Try again</button></div>;
  if (profile === undefined) return <ProfileSkeleton />;
  if (!profile) return <div className="ui-state"><h2>Profile unavailable</h2><p>This person may have changed their profile’s visibility or removed their account.</p></div>;

  const isSelf = profile.id === viewerId;
  const shots = headshots(profile);

  function openCredit(chip: CreditChipItem) {
    if (!profile) return;
    if (!experienceIndexesForChip(profile, chip).length) {
      setNotice("There's no experience tied to this credit.");
      return;
    }
    setOverlay({ kind: "credit", chip });
  }

  return (
    <div className="talent-profile" ref={scrollAnchor}>
      {page && !preview ? (
        <ProfileDestination
          profile={profile}
          page={page}
          onCredit={openCredit}
          onHeadshot={setViewer}
        />
      ) : (
        <ProfileHome
          profile={profile}
          matchReason={matchReason}
          preview={preview}
          onClose={onClose}
          actions={isSelf ? null : (
            <ProfileActions
              profile={profile}
              onNotice={setNotice}
              onBlocked={() => { setBlocked({ slug, name: displayName(profile) }); setStack([]); setOverlay(null); setViewer(null); }}
              onLists={() => setOverlay({ kind: "lists" })}
              onMessage={() => setOverlay({ kind: "message" })}
              onOpenFullProfile={onOpenFullProfile ? () => onOpenFullProfile(profile) : undefined}
            />
          )}
          onOpen={preview ? () => undefined : open}
          onCredit={preview ? () => undefined : openCredit}
          onHeadshot={setViewer}
          footer={
            preview && onOpenFullProfile ? (
              <button
                type="button"
                className="talent-profile__full-profile"
                onClick={() => onOpenFullProfile(profile)}
              >
                View full profile
              </button>
            ) : null
          }
        />
      )}

      {overlay?.kind === "credit" && !preview ? (
        <CreditSheet
          profile={profile}
          chip={overlay.chip}
          onClose={() => setOverlay(null)}
          onPick={(index) => {
            setOverlay(null);
            open({ kind: "experience", index });
          }}
        />
      ) : null}
      {overlay?.kind === "lists" ? (
        <ListsSheet profile={profile} onClose={() => setOverlay(null)} onNotice={setNotice} />
      ) : null}
      {overlay?.kind === "message" ? (
        <MessageSheet profile={profile} onClose={() => setOverlay(null)} onNotice={setNotice} />
      ) : null}
      {viewer !== null && shots.length ? (
        <HeadshotViewer
          urls={shots}
          name={displayName(profile)}
          initialIndex={Math.min(viewer, shots.length - 1)}
          onClose={() => setViewer(null)}
        />
      ) : null}
      {notice ? <p className="talent-profile__toast" role="status">{notice}</p> : null}
    </div>
  );
}

function pageTitle(profile: PublicTalentProfile, page: ProfilePage) {
  if (page.kind === "section") return SECTION_LABEL[page.section];
  return profile.experiences?.[page.index]?.title?.trim() || "Experience";
}

function ProfileSkeleton() {
  return (
    <div className="talent-profile" aria-busy="true" aria-label="Loading profile">
      <div className="talent-profile__hero talent-profile__hero--loading" />
      <div className="talent-profile__body">
        <span className="talent-profile__bone" style={{ width: "55%", height: 22 }} />
        <span className="talent-profile__bone" style={{ width: "35%", height: 14 }} />
      </div>
    </div>
  );
}

/* ─── Home ─────────────────────────────────────────────────────────────── */

function ProfileHome({
  profile,
  matchReason,
  actions,
  onOpen,
  onCredit,
  onHeadshot,
  preview = false,
  footer = null,
  onClose,
}: {
  profile: PublicTalentProfile;
  matchReason?: string | null;
  actions: ReactNode;
  onOpen: (page: ProfilePage) => void;
  onCredit: (chip: CreditChipItem) => void;
  onHeadshot: (index: number) => void;
  preview?: boolean;
  footer?: ReactNode;
  onClose?: () => void;
}) {
  const name = displayName(profile);
  const meta = [primaryTalentLabel(profile.talent_types), profile.location].filter(Boolean).join(" · ");
  const highlights = profile.profile_highlights ?? [];
  const chips = creditChips(profile);
  const shots = headshots(profile);
  const socials = socialLinks(profile);
  const representation = publicRepresentation(profile);
  const union = profile.union_status?.trim();

  const mediaRows: ReactNode[] = [];
  if (!preview && sectionAvailable(profile, "headshots")) {
    mediaRows.push(<MenuRow key="headshots" icon={<ImageIcon size={16} aria-hidden />} label="Headshots" detail={String(shots.length)} onClick={() => onOpen({ kind: "section", section: "headshots" })} />);
  }
  if (!preview && sectionAvailable(profile, "reel")) {
    mediaRows.push(<MenuRow key="reel" icon={<Play size={16} aria-hidden />} label="Reel" onClick={() => onOpen({ kind: "section", section: "reel" })} />);
  }
  if (hasWorkDetails(profile)) {
    mediaRows.push(
      <div key="work" className="home-profile-row home-profile-row--static">
        <span className="home-profile-row__icon"><Briefcase size={16} aria-hidden /></span>
        <span className="home-profile-row__label">Work Details</span>
        <span className="talent-profile__badges">
          {representation ? (
            <span className="talent-profile__badge">
              {profile.agency_logo_url ? <Image src={profile.agency_logo_url} alt="" width={16} height={16} unoptimized /> : null}
              {representation}
            </span>
          ) : null}
          {union ? <span className="talent-profile__badge" data-muted={/non/i.test(union)}>{union}</span> : null}
        </span>
      </div>,
    );
  }
  const moreRows: ReactNode[] = [];
  if (!preview && sectionAvailable(profile, "slate")) {
    moreRows.push(<MenuRow key="slate" icon={<Mic size={16} aria-hidden />} label="Slate" onClick={() => onOpen({ kind: "section", section: "slate" })} />);
  }
  if (socials.length) {
    moreRows.push(
      <div key="socials" className="home-profile-row home-profile-row--static">
        <span className="home-profile-row__icon"><Link2 size={16} aria-hidden /></span>
        <span className="home-profile-row__label">Socials</span>
        <span className="talent-profile__badges">
          {socials.map((link) => (
            <a key={link.label} className="talent-profile__badge talent-profile__badge--link" href={link.url} target="_blank" rel="noopener noreferrer">
              {link.label} <ExternalLink size={12} aria-hidden />
            </a>
          ))}
        </span>
      </div>,
    );
  }
  if (!preview && sectionAvailable(profile, "skills")) {
    moreRows.push(<MenuRow key="skills" icon={<Sparkles size={16} aria-hidden />} label="Skills" onClick={() => onOpen({ kind: "section", section: "skills" })} />);
  }

  return (
    <>
      <HeroPager name={name} meta={meta} shots={shots} onOpen={onHeadshot} onClose={onClose} />
      {actions}
      <div className="talent-profile__body">
        {matchReason ? <p className="talent-profile__match">Why this matched: {matchReason}</p> : null}
        {chips.length ? (
          <section>
            <div className="talent-profile__section-head">
              <h4>Credits</h4>
              {!preview && chips.length > CREDIT_RAIL_LIMIT ? (
                <button type="button" onClick={() => onOpen({ kind: "section", section: "credits" })}>
                  See all {chips.length}
                </button>
              ) : null}
            </div>
            <ul className="talent-profile__credit-rail">
              {chips.slice(0, CREDIT_RAIL_LIMIT).map((chip) => (
                <li key={chip.id}>
                  <CreditAvatar chip={chip} onClick={preview ? undefined : () => onCredit(chip)} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {highlights.length ? (
          <section>
            <div className="talent-profile__section-head"><h4>Highlights</h4></div>
            <div className="talent-profile__rail">
              {highlights.map((item) => {
                const index = experienceIndexForHighlight(profile, item);
                return (
                  <HighlightCard
                    key={item.id}
                    highlight={item}
                    onClick={preview || index === null ? undefined : () => onOpen({ kind: "experience", index })}
                  />
                );
              })}
            </div>
          </section>
        ) : null}
        {mediaRows.length ? <div className="home-profile__menu">{mediaRows}</div> : null}
        {moreRows.length ? <div className="home-profile__menu">{moreRows}</div> : null}
        {footer}
      </div>
    </>
  );
}

function MenuRow({ icon, label, detail, onClick }: { icon: ReactNode; label: string; detail?: string; onClick: () => void }) {
  return (
    <button type="button" className="home-profile-row" onClick={onClick}>
      <span className="home-profile-row__icon">{icon}</span>
      <span className="home-profile-row__label">{label}</span>
      {detail ? <span className="home-profile-row__detail">{detail}</span> : null}
      <ChevronRight size={16} aria-hidden />
    </button>
  );
}

/* ─── Actions ──────────────────────────────────────────────────────────── */

export function ProfileActions({
  profile,
  onNotice,
  onLists,
  onMessage,
  onBlocked,
  onOpenFullProfile,
}: {
  profile: PublicTalentProfile;
  onNotice: (message: string) => void;
  onLists: () => void;
  onMessage: () => void;
  onBlocked: () => void;
  onOpenFullProfile?: () => void;
}) {
  const industry = useIsIndustryWorkspace();
  const viewerId = useWorkspaceViewerId();
  const router = useRouter();
  const disclosureId = useId();
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const canModerate = Boolean(viewerId && profile.id !== viewerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile.id));
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [state, setState] = useState<TalentSaveState | null>(null);
  const [busy, setBusy] = useState<"favorite" | "notify" | "block" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const path = `/profile/${encodeURIComponent(profile.username || profile.id)}`;

  useEffect(() => {
    let cancelled = false;
    void (industry ? fetchIndustryTalentSaveState(profile.id) : fetchTalentSaveState(profile.id)).then((next) => {
      if (!cancelled) setState(next);
    }).catch(() => { if (!cancelled) setState({ favorited: false, notifying: false, lists: [], error: "Saved state could not be loaded." }); });
    return () => {
      cancelled = true;
    };
  }, [profile.id, industry, loadAttempt]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [menuOpen]);

  async function favorite() {
    if (busy || !state || state.error) return;
    setBusy("favorite");
    try {
      const result = industry ? await setIndustryTalentSaved(profile.id, !state.favorited) : await toggleFavorite(profile.id);
      if (result.error) return onNotice(result.error);
      setState((current) => current ? { ...current, favorited: result.favorited } : current);
      onNotice(result.favorited ? "Added to Favorites." : "Removed from Favorites.");
    } catch { onNotice("Could not update Favorites. Please try again."); }
    finally { setBusy(null); }
  }

  async function notify() {
    if (busy || !state || state.error) return;
    setMenuOpen(false);
    setBusy("notify");
    try {
      const result = await toggleNotifyMe(profile.id);
      if (result.error) return onNotice(result.error);
      setState((current) => current ? { ...current, notifying: result.notifying } : current);
      onNotice(result.notifying ? `You'll be notified when ${displayName(profile).split(" ")[0]} posts.` : "Notifications turned off.");
    } catch { onNotice("Could not update notifications. Please try again."); }
    finally { setBusy(null); }
  }

  async function share() {
    const url = `${window.location.origin}${path}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: displayName(profile), url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try { await navigator.clipboard.writeText(url); onNotice("Profile link copied."); }
    catch { onNotice("Copy is unavailable. Open the full profile and copy its address."); }
  }

  async function copy() {
    setMenuOpen(false);
    try { await navigator.clipboard.writeText(`${window.location.origin}${path}`); onNotice("Profile link copied."); }
    catch { onNotice("Copy is unavailable. Open the full profile and copy its address."); }
  }

  async function confirmBlocking() {
    if (!canModerate || busy) return;
    setBusy("block"); setBlockError(null);
    try {
      const result = await blockUser(profile.id);
      if (!result.ok) { setBlockError(result.error); return; }
      setConfirmBlock(false);
      onBlocked();
      window.dispatchEvent(new Event("motiion:blocked-users-changed"));
      router.refresh();
    } catch { setBlockError("Couldn’t block this person. Check your connection and try again."); }
    finally { setBusy(null); }
  }

  const favorited = Boolean(state?.favorited);
  const notifying = Boolean(state?.notifying);

  return (
    <>
    {state?.error ? <p className="ui-notice" data-tone="error" role="alert">{state.error} <button type="button" onClick={() => setLoadAttempt(value => value + 1)}>Retry</button></p> : null}
    <div className="talent-profile__actions">
      <button
        type="button"
        className="talent-profile__action talent-profile__action--favorite"
        aria-pressed={favorited}
        disabled={Boolean(busy) || !state || Boolean(state.error)}
        onClick={() => void favorite()}
      >
        <Heart size={16} aria-hidden className="talent-profile__favorite-icon" fill={favorited ? "currentColor" : "none"} />
        Favorite
      </button>
      <button type="button" className="talent-profile__action" onClick={() => void share()}>
        <Share size={16} aria-hidden />
        Share
      </button>
      <button type="button" className="talent-profile__action" onClick={onMessage}>
        <MessageCircle size={16} aria-hidden />
        Message
      </button>
      <div className="talent-profile__more" ref={menuRef} onKeyDown={(event) => { if (event.key === "Escape" && menuOpen) { event.preventDefault(); event.stopPropagation(); setMenuOpen(false); menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); } }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false); }}>
        <button
          type="button"
          className="talent-profile__action talent-profile__action--icon"
          aria-label="More actions"
          aria-controls={disclosureId}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <MoreHorizontal size={18} aria-hidden />
        </button>
        {menuOpen ? (
          <div className="talent-profile__menu" id={disclosureId}>
            <button type="button" disabled={busy === "notify"} onClick={() => void notify()}>
              {notifying ? <BellOff size={16} aria-hidden /> : <Bell size={16} aria-hidden />}
              {notifying ? "Stop notifying" : "Notify me"}
            </button>
            {industry ? (
              <button type="button" onClick={() => { setMenuOpen(false); onLists(); }}>
                <ListPlus size={16} aria-hidden />
                Save to roster
              </button>
            ) : null}
            <button type="button" onClick={() => void copy()}>
              <Link2 size={16} aria-hidden />
              Copy profile link
            </button>
            {canModerate ? <>
              <button type="button" onClick={() => { setMenuOpen(false); setReportOpen(true); }}><Flag size={16} aria-hidden />Report profile</button>
              <button type="button" onClick={() => { setMenuOpen(false); setConfirmBlock(true); setBlockError(null); }}><ShieldOff size={16} aria-hidden />Block person</button>
            </> : null}
            {onOpenFullProfile ? (
              <button type="button" onClick={() => { setMenuOpen(false); onOpenFullProfile(); }}>
                <ExternalLink size={16} aria-hidden />
                Open full profile
              </button>
            ) : (
              <a href={path} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
                <ExternalLink size={16} aria-hidden />
                Open full profile
              </a>
            )}
          </div>
        ) : null}
      </div>
    </div>
    {canModerate ? <ReportContentDialog open={reportOpen} onClose={() => setReportOpen(false)} target={{ contentType: "profile", contentId: null, reportedUserId: profile.id, displayName: displayName(profile) }} /> : null}
    <Dialog open={confirmBlock && canModerate} onClose={() => { if (busy !== "block") setConfirmBlock(false); }} label={`Block ${displayName(profile)}?`} alert>
      <div className="ui-dialog-panel"><div className="ui-dialog-body space-y-4"><h2 className="text-lg font-semibold">Block {displayName(profile)}?</h2><p>You won’t see this person in your messages, search, Discover, or feeds. You can unblock them in settings.</p>{blockError ? <p className="ui-notice" data-tone="error" role="alert">{blockError}</p> : null}<div className="flex flex-wrap gap-3"><button type="button" className="ui-button ui-button--danger" disabled={busy === "block"} onClick={confirmBlocking}>{busy === "block" ? "Blocking…" : "Block person"}</button><button type="button" className="ui-button ui-button--secondary" disabled={busy === "block"} onClick={() => setConfirmBlock(false)}>Cancel</button></div></div></div>
    </Dialog>
    </>
  );
}

/* ─── Overlays ─────────────────────────────────────────────────────────── */

function CreditSheet({
  profile,
  chip,
  onClose,
  onPick,
}: {
  profile: PublicTalentProfile;
  chip: CreditChipItem;
  onClose: () => void;
  onPick: (index: number) => void;
}) {
  const indexes = experienceIndexesForChip(profile, chip);
  return (
    <PanelSheet title={chip.title} onClose={onClose}>
      <ul className="home-profile__picks">
        {indexes.map((index) => {
          const experience = profile.experiences[index];
          return (
            <li key={experience.id || `${experience.title}-${index}`}>
              <button type="button" className="home-profile-row" onClick={() => onPick(index)}>
                <ExperienceThumb experience={experience} />
                <span className="home-profile-row__copy">
                  <span className="home-profile-row__eyebrow">{categoryLabel(experience)}</span>
                  <span className="home-profile-row__label">{experience.title}</span>
                </span>
                <ChevronRight size={16} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </PanelSheet>
  );
}

export function ListsSheet({
  profile,
  onClose,
  onNotice,
}: {
  profile: PublicTalentProfile;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const industry = useIsIndustryWorkspace();
  const { requirePro } = useIndustryProOptional();
  const noun = industry ? "roster" : "list";
  const [attempt, setAttempt] = useState(0);
  const [lists, setLists] = useState<TalentSaveState["lists"] | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (industry ? fetchIndustryTalentSaveState(profile.id) : fetchTalentSaveState(profile.id)).then((state) => {
      if (cancelled) return;
      if (!state.error) setLists(state.lists);
      setError(state.error);
    }).catch(() => { if (!cancelled) setError("Could not load your saved lists. Please retry."); });
    return () => {
      cancelled = true;
    };
  }, [profile.id, industry, attempt]);

  async function toggle(listId: string, includes: boolean) {
    if (pending || (industry && !requirePro("roster_write"))) return;
    setPending(listId);
    try {
      const result = industry ? await setIndustryRosterMembership(profile.id, listId, !includes)
        : includes ? await removeFromDiscoverList(listId, profile.id) : await addToDiscoverList(listId, profile.id);
      setError(result.error);
      if (result.error) return;
      setLists(current => current?.map(list => list.id === listId ? { ...list, includes: !includes } : list) ?? current);
    } catch { setError("Could not update this selection. Please try again."); }
    finally { setPending(null); }
  }

  async function create() {
    const name = draft.trim();
    if (!name || pending || (industry && !requirePro("roster_write"))) return;
    setPending("new");
    try {
      if (industry) {
        const result = await createIndustryRosterForTalent(profile.id, name);
        setError(result.error);
        if (result.id) {
          setLists(current => [{ id: result.id!, name, includes: result.includes }, ...(current ?? [])]);
          setDraft("");
          if (result.includes) onNotice(`Saved to ${name}.`);
        }
      } else {
        const created = await createDiscoverList(name);
        if (!created.id) { setError(created.error); return; }
        const added = await addToDiscoverList(created.id, profile.id);
        setError(added.error);
        setDraft("");
        setLists(current => [{ id: created.id!, name, includes: !added.error }, ...(current ?? [])]);
        if (!added.error) onNotice(`Saved to ${name}.`);
      }
    } catch { setError("Could not save this list. Your name is still here; please try again."); }
    finally { setPending(null); }
  }

  return (
    <PanelSheet
      title={`Save to ${noun}`}
      onClose={() => { if (!pending) onClose(); }}
      footer={
        <form className="profile-sheet__compose" onSubmit={(event) => { event.preventDefault(); void create(); }}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`New ${noun} name`} aria-label={`New ${noun} name`} maxLength={80} />
          <button type="submit" disabled={!draft.trim() || Boolean(pending)}>
            {pending === "new" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Plus size={14} aria-hidden />}
            Create
          </button>
        </form>
      }
    >
      {error ? <p className="profile-sheet__error" role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry loading</button></p> : null}
      {lists === null && !error ? <p className="home-panel-status">Loading {noun}s…</p> : null}
      {lists?.length === 0 ? <p className="home-panel-status">No {noun}s yet. Create one below.</p> : null}
      {lists?.length ? (
        <ul className="home-profile__picks">
          {lists.map((list) => (
            <li key={list.id}>
              <button type="button" className="home-profile-row" aria-pressed={list.includes} disabled={Boolean(pending)} onClick={() => void toggle(list.id, list.includes)}>
                <span className="home-profile-row__label">{list.name}</span>
                <span className="profile-sheet__check" data-on={list.includes} aria-hidden>
                  {list.includes ? <Check size={14} /> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </PanelSheet>
  );
}

export function MessageSheet({
  profile,
  onClose,
  onNotice,
}: {
  profile: PublicTalentProfile;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<"conversation" | "request" | null>(null);
  const first = displayName(profile).split(" ")[0];

  async function send() {
    setSending(true);
    setError(null);
    const result = await startConversationWith({ targetUserId: profile.id, initialMessage: body.trim() || "Hi!" });
    setSending(false);
    if (!result.ok) {
      setError(result.error ?? "Could not send your message.");
      return;
    }
    setSent(result.pendingRequest ? "request" : "conversation");
    onNotice(result.pendingRequest ? "Message request sent." : "Message sent.");
  }

  return (
    <PanelSheet title={`Message ${first}`} onClose={onClose}>
      {sent ? (
        <div className="profile-sheet__sent">
          <p>{sent === "request" ? `${first} will see your message request in their inbox.` : `Your message to ${first} is in your inbox.`}</p>
          <Link href="/inbox" className="profile-sheet__primary">Open inbox</Link>
        </div>
      ) : (
        <form className="profile-sheet__message" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={`Say hi to ${first}…`} aria-label="Message" rows={5} autoFocus maxLength={2000} />
          {error ? <p className="profile-sheet__error">{error}</p> : null}
          <button type="submit" className="profile-sheet__primary" disabled={sending}>
            {sending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
            Send message
          </button>
        </form>
      )}
    </PanelSheet>
  );
}

/* ─── Destinations ─────────────────────────────────────────────────────── */

function ProfileDestination({
  profile,
  page,
  onCredit,
  onHeadshot,
}: {
  profile: PublicTalentProfile;
  page: ProfilePage;
  onCredit: (chip: CreditChipItem) => void;
  onHeadshot: (index: number) => void;
}) {
  if (page.kind === "experience") {
    const experience = profile.experiences?.[page.index];
    return experience ? <ExperienceDetail experience={experience} /> : <p className="home-panel-status">This experience could not be opened.</p>;
  }
  switch (page.section) {
    case "credits":
      return (
        <ul className="talent-profile__credit-grid">
          {creditChips(profile).map((chip) => (
            <li key={chip.id}><CreditAvatar chip={chip} onClick={() => onCredit(chip)} /></li>
          ))}
        </ul>
      );
    case "headshots":
      return (
        <ul className="talent-profile__photos">
          {headshots(profile).map((url, index) => (
            <li key={url}>
              <button type="button" className="talent-profile__photo-card" aria-label={`Open headshot ${index + 1}`} onClick={() => onHeadshot(index)}>
                <Image src={url} alt="" width={240} height={320} unoptimized />
              </button>
            </li>
          ))}
        </ul>
      );
    case "reel":
      return <VisualPlayer visual={visualOf(profile, "reel")} />;
    case "slate":
      return <VisualPlayer visual={visualOf(profile, "slate")} />;
    case "skills":
      return <SkillsPage profile={profile} />;
  }
}
