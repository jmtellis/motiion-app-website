"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BellOff,
  Check,
  ChevronLeft,
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
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { loadHomeProfile } from "@/app/(app)/home/actions";
import { useWorkspaceViewerId } from "@/components/workspace/WorkspaceNotifications";
import { getProfileInitials } from "@/lib/auth/avatar";
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
import type { ProfileExperience, ProfileVisual, PublicTalentProfile } from "@/types/public";

import { HeadshotViewer, PanelSheet } from "./ProfileOverlays";
import {
  SECTION_LABEL,
  categoryLabel,
  creditChips,
  embedUrl,
  experienceFacts,
  experienceImage,
  experienceIndexForHighlight,
  experienceIndexesForChip,
  hasWorkDetails,
  headshots,
  publicRepresentation,
  sectionAvailable,
  skillVisuals,
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
}: {
  slug: string;
  userId?: string;
  onChrome: (chrome: TalentProfileChrome) => void;
  matchReason?: string | null;
}) {
  const viewerId = useWorkspaceViewerId();
  const [profile, setProfile] = useState<PublicTalentProfile | null | undefined>(undefined);
  const [stack, setStack] = useState<ProfilePage[]>([]);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const scrollAnchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadHomeProfile(slug, userId).then((result) => {
      if (cancelled) return;
      setProfile(result.profile);
      if (result.profile) void recordProfileView(result.profile.id);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, userId]);

  useEffect(() => {
    if (!notice) return;
    const handle = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(handle);
  }, [notice]);

  const page = stack.at(-1) ?? null;
  const title = profile && page ? pageTitle(profile, page) : null;

  useEffect(() => {
    onChrome({
      title,
      pop: stack.length ? () => setStack((current) => current.slice(0, -1)) : null,
    });
  }, [onChrome, stack.length, title]);

  useEffect(() => {
    scrollAnchor.current?.closest(".workspace-side-panel__body")?.scrollTo({ top: 0 });
  }, [stack.length]);

  const open = useCallback((next: ProfilePage) => setStack((current) => [...current, next]), []);

  if (profile === undefined) return <ProfileSkeleton />;
  if (!profile) return <p className="home-panel-status">This profile could not be opened.</p>;

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
      {page ? (
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
          actions={isSelf ? null : (
            <ProfileActions
              profile={profile}
              onNotice={setNotice}
              onLists={() => setOverlay({ kind: "lists" })}
              onMessage={() => setOverlay({ kind: "message" })}
            />
          )}
          onOpen={open}
          onCredit={openCredit}
          onHeadshot={setViewer}
        />
      )}

      {overlay?.kind === "credit" ? (
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

function displayName(profile: PublicTalentProfile) {
  return profile.full_name?.trim() || "Talent";
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
}: {
  profile: PublicTalentProfile;
  matchReason?: string | null;
  actions: ReactNode;
  onOpen: (page: ProfilePage) => void;
  onCredit: (chip: CreditChipItem) => void;
  onHeadshot: (index: number) => void;
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
  if (sectionAvailable(profile, "headshots")) {
    mediaRows.push(<MenuRow key="headshots" icon={<ImageIcon size={16} aria-hidden />} label="Headshots" detail={String(shots.length)} onClick={() => onOpen({ kind: "section", section: "headshots" })} />);
  }
  if (sectionAvailable(profile, "reel")) {
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
  if (sectionAvailable(profile, "slate")) {
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
  if (sectionAvailable(profile, "skills")) {
    moreRows.push(<MenuRow key="skills" icon={<Sparkles size={16} aria-hidden />} label="Skills" onClick={() => onOpen({ kind: "section", section: "skills" })} />);
  }

  return (
    <>
      <HeroPager name={name} meta={meta} shots={shots} onOpen={onHeadshot} />
      {actions}
      <div className="talent-profile__body">
        {matchReason ? <p className="talent-profile__match">Why this matched: {matchReason}</p> : null}
        {chips.length ? (
          <section>
            <div className="talent-profile__section-head">
              <h4>Credits</h4>
              {chips.length > CREDIT_RAIL_LIMIT ? (
                <button type="button" onClick={() => onOpen({ kind: "section", section: "credits" })}>
                  See all {chips.length}
                </button>
              ) : null}
            </div>
            <ul className="talent-profile__credit-rail">
              {chips.slice(0, CREDIT_RAIL_LIMIT).map((chip) => (
                <li key={chip.id}>
                  <CreditAvatar chip={chip} onClick={() => onCredit(chip)} />
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
                  <button
                    key={item.id}
                    type="button"
                    className="talent-profile__highlight-card"
                    disabled={index === null}
                    onClick={() => index !== null && onOpen({ kind: "experience", index })}
                  >
                    {item.image_url ? <Image src={item.image_url} alt="" width={148} height={196} unoptimized /> : <span aria-hidden />}
                    <span className="talent-profile__highlight-copy">
                      <small>{item.subtitle?.trim() || "Studio"}</small>
                      <strong>{item.title}</strong>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
        {mediaRows.length ? <div className="home-profile__menu">{mediaRows}</div> : null}
        {moreRows.length ? <div className="home-profile__menu">{moreRows}</div> : null}
      </div>
    </>
  );
}

function HeroPager({
  name,
  meta,
  shots,
  onOpen,
}: {
  name: string;
  meta: string;
  shots: string[];
  onOpen: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const count = shots.length;
  const current = shots[index];

  return (
    <div className="talent-profile__hero">
      {current ? (
        <button type="button" className="talent-profile__hero-card" aria-label={`Open ${name}'s headshots`} onClick={() => onOpen(index)}>
          <Image key={current} src={current} alt="" fill sizes="480px" unoptimized />
        </button>
      ) : (
        <span className="talent-profile__hero-initials" aria-hidden>{getProfileInitials(name) || "?"}</span>
      )}
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
      <div className="talent-profile__identity">
        <h3>{name}</h3>
        {meta ? <p>{meta}</p> : null}
      </div>
    </div>
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

function CreditAvatar({ chip, onClick }: { chip: CreditChipItem; onClick: () => void }) {
  return (
    <button type="button" className="talent-profile__credit" onClick={onClick}>
      {chip.imageUrl ? (
        <Image src={chip.imageUrl} alt="" width={72} height={72} unoptimized />
      ) : (
        <span className="talent-profile__credit-initials" aria-hidden>{getProfileInitials(chip.title) || "?"}</span>
      )}
      <span className="talent-profile__credit-name">{chip.title}</span>
    </button>
  );
}

/* ─── Actions ──────────────────────────────────────────────────────────── */

function ProfileActions({
  profile,
  onNotice,
  onLists,
  onMessage,
}: {
  profile: PublicTalentProfile;
  onNotice: (message: string) => void;
  onLists: () => void;
  onMessage: () => void;
}) {
  const [state, setState] = useState<TalentSaveState | null>(null);
  const [busy, setBusy] = useState<"favorite" | "notify" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const path = `/profile/${encodeURIComponent(profile.username || profile.id)}`;

  useEffect(() => {
    let cancelled = false;
    void fetchTalentSaveState(profile.id).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [menuOpen]);

  async function favorite() {
    setBusy("favorite");
    const result = await toggleFavorite(profile.id);
    setBusy(null);
    if (result.error) return onNotice(result.error);
    setState((current) => (current ? { ...current, favorited: result.favorited } : current));
    onNotice(result.favorited ? "Added to Favorites." : "Removed from Favorites.");
  }

  async function notify() {
    setMenuOpen(false);
    setBusy("notify");
    const result = await toggleNotifyMe(profile.id);
    setBusy(null);
    if (result.error) return onNotice(result.error);
    setState((current) => (current ? { ...current, notifying: result.notifying } : current));
    onNotice(result.notifying ? `You'll be notified when ${displayName(profile).split(" ")[0]} posts.` : "Notifications turned off.");
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
    await navigator.clipboard.writeText(url);
    onNotice("Profile link copied.");
  }

  async function copy() {
    setMenuOpen(false);
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    onNotice("Profile link copied.");
  }

  const favorited = Boolean(state?.favorited);
  const notifying = Boolean(state?.notifying);

  return (
    <div className="talent-profile__actions">
      <button type="button" className="talent-profile__action" aria-pressed={favorited} disabled={busy === "favorite"} onClick={() => void favorite()}>
        <Heart size={16} aria-hidden fill={favorited ? "currentColor" : "none"} />
        {favorited ? "Favorited" : "Favorite"}
      </button>
      <button type="button" className="talent-profile__action" onClick={() => void share()}>
        <Share size={16} aria-hidden />
        Share
      </button>
      <button type="button" className="talent-profile__action" onClick={onMessage}>
        <MessageCircle size={16} aria-hidden />
        Message
      </button>
      <div className="talent-profile__more" ref={menuRef}>
        <button
          type="button"
          className="talent-profile__action talent-profile__action--icon"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <MoreHorizontal size={18} aria-hidden />
        </button>
        {menuOpen ? (
          <div className="talent-profile__menu" role="menu">
            <button type="button" role="menuitem" disabled={busy === "notify"} onClick={() => void notify()}>
              {notifying ? <BellOff size={16} aria-hidden /> : <Bell size={16} aria-hidden />}
              {notifying ? "Stop notifying" : "Notify me"}
            </button>
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onLists(); }}>
              <ListPlus size={16} aria-hidden />
              Save to list
            </button>
            <button type="button" role="menuitem" onClick={() => void copy()}>
              <Link2 size={16} aria-hidden />
              Copy profile link
            </button>
            <a role="menuitem" href={path} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
              <ExternalLink size={16} aria-hidden />
              Open full profile
            </a>
          </div>
        ) : null}
      </div>
    </div>
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

function ListsSheet({
  profile,
  onClose,
  onNotice,
}: {
  profile: PublicTalentProfile;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const [lists, setLists] = useState<TalentSaveState["lists"] | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchTalentSaveState(profile.id).then((state) => {
      if (cancelled) return;
      setLists(state.lists);
      setError(state.error);
    });
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  async function toggle(listId: string, includes: boolean) {
    setPending(listId);
    const result = includes
      ? await removeFromDiscoverList(listId, profile.id)
      : await addToDiscoverList(listId, profile.id);
    setPending(null);
    setError(result.error);
    if (result.error) return;
    setLists((current) => current?.map((list) => (list.id === listId ? { ...list, includes: !includes } : list)) ?? current);
  }

  async function create() {
    const name = draft.trim();
    if (!name) return;
    setPending("new");
    const created = await createDiscoverList(name);
    if (!created.id) {
      setPending(null);
      setError(created.error);
      return;
    }
    const added = await addToDiscoverList(created.id, profile.id);
    setPending(null);
    setError(added.error);
    setDraft("");
    setLists((current) => [{ id: created.id as string, name, includes: !added.error }, ...(current ?? [])]);
    if (!added.error) onNotice(`Saved to ${name}.`);
  }

  return (
    <PanelSheet
      title="Save to list"
      onClose={onClose}
      footer={
        <form className="profile-sheet__compose" onSubmit={(event) => { event.preventDefault(); void create(); }}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="New list name" aria-label="New list name" maxLength={80} />
          <button type="submit" disabled={!draft.trim() || pending === "new"}>
            {pending === "new" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Plus size={14} aria-hidden />}
            Create
          </button>
        </form>
      }
    >
      {error ? <p className="profile-sheet__error">{error}</p> : null}
      {lists === null ? <p className="home-panel-status">Loading lists…</p> : null}
      {lists?.length === 0 ? <p className="home-panel-status">No lists yet. Create one below.</p> : null}
      {lists?.length ? (
        <ul className="home-profile__picks">
          {lists.map((list) => (
            <li key={list.id}>
              <button type="button" className="home-profile-row" aria-pressed={list.includes} disabled={pending === list.id} onClick={() => void toggle(list.id, list.includes)}>
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

function MessageSheet({
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

function ExperienceDetail({ experience }: { experience: ProfileExperience }) {
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

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function VisualPlayer({ visual }: { visual: ProfileVisual | null }) {
  if (!visual?.url) return <p className="home-panel-status">Nothing here yet.</p>;
  return (
    <div className="talent-profile__player">
      <video src={visual.url} controls playsInline autoPlay />
    </div>
  );
}

function SkillsPage({ profile }: { profile: PublicTalentProfile }) {
  const visuals = skillVisuals(profile);
  const shown = new Set(visuals.map((item) => item.ref?.trim().toLowerCase()).filter(Boolean));
  const styles = (profile.styles ?? []).filter((tag) => !shown.has(tag.toLowerCase()));
  const skills = (profile.skills ?? []).filter((tag) => !shown.has(tag.toLowerCase()));
  return (
    <div className="talent-profile__body">
      {visuals.length ? (
        <div className="talent-profile__clips">
          {visuals.map((item) => (
            <figure key={item.id}>
              <video src={item.url} controls playsInline muted preload="metadata" />
              {item.ref ? <figcaption>{item.ref}</figcaption> : null}
            </figure>
          ))}
        </div>
      ) : null}
      {styles.length ? <TagGroup title="Styles" tags={styles} /> : null}
      {skills.length ? <TagGroup title="Skills" tags={skills} /> : null}
    </div>
  );
}

function TagGroup({ title, tags }: { title: string; tags: string[] }) {
  return (
    <section>
      <div className="talent-profile__section-head"><h4>{title}</h4></div>
      <div className="talent-profile__tags">
        {tags.map((tag) => <span key={tag}>{tag}</span>)}
      </div>
    </section>
  );
}

function ExperienceThumb({ experience }: { experience: ProfileExperience }) {
  const src = experienceImage(experience);
  if (!src) return <span className="home-profile-row__thumb" aria-hidden>{experience.title.charAt(0)}</span>;
  return <Image className="home-profile-row__thumb" src={src} alt="" width={44} height={44} unoptimized />;
}
