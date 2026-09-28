"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Film,
  Ruler,
  Share2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { HeadshotsPanel } from "@/components/portfolio/HeadshotsPanel";
import { HighlightsPanel } from "@/components/portfolio/HighlightsPanel";
import { PublicProfilePanel } from "@/components/portfolio/PublicProfilePanel";
import { ResumePanel } from "@/components/portfolio/ResumePanel";
import { SizeSheetPanel } from "@/components/portfolio/SizeSheetPanel";
import { VisualsPanel } from "@/components/portfolio/VisualsPanel";
import "@/components/portfolio/portfolio-panels.css";
import { PortfolioProfileTabs } from "@/components/talent/PortfolioProfileTabs";
import { useNotificationsPanel } from "@/components/workspace/WorkspaceNotifications";
import { WorkspaceSidePanel } from "@/components/workspace/WorkspaceSidePanel";
import type { TalentAgency } from "@/lib/agencies/fetch-talent-agencies";
import type { PortfolioEditorDraft } from "@/lib/app/portfolio-editor";
import type { PortfolioOwnerData } from "@/lib/app/portfolio-owner";
import { ResumePaper, SizeSheetPaper } from "@/components/portfolio/PortfolioPaper";
import { sizeSheetRows } from "@/components/portfolio/size-sheet";
import type { ProfileHighlight, PublicTalentProfile } from "@/types/public";

type PanelKey = "public" | "headshots" | "highlights" | "visuals" | "resume" | "sizing";

const PANEL_ID = "portfolio-editor-panel";
const PANEL_TITLES: Record<PanelKey, string> = {
  public: "Public profile",
  headshots: "Headshots",
  highlights: "Highlights",
  visuals: "Visuals",
  resume: "Resume",
  sizing: "Size sheet",
};

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function PortfolioView({
  profile,
  owner,
  editor,
  agencies,
  completion,
  underReview,
}: {
  profile: PublicTalentProfile;
  owner: PortfolioOwnerData;
  editor: PortfolioEditorDraft;
  agencies: TalentAgency[];
  completion: { completed: number; total: number; cta: string } | null;
  underReview: boolean;
}) {
  const router = useRouter();
  const notifications = useNotificationsPanel();
  const [active, setActive] = useState<PanelKey | null>(null);
  const [actionsHost, setActionsHost] = useState<HTMLDivElement | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dirtyRef = useRef(false);

  const displayName = editor.displayName || profile.full_name?.trim() || "Your portfolio";
  const headshot = owner.headshotUrls[0] ?? profile.headshot_url;
  const highlights = profile.profile_highlights ?? [];
  const location = editor.workingLocations[0] || profile.location;
  const publicPath = `/profile/${profile.username?.trim() || profile.id}`;

  const confirmDiscard = useCallback(() => !dirtyRef.current || window.confirm("Discard unsaved changes?"), []);

  const openPanel = useCallback(
    (key: PanelKey) => {
      if (active === key) {
        if (confirmDiscard()) setActive(null);
        return;
      }
      if (!confirmDiscard()) return;
      dirtyRef.current = false;
      notifications.setOpen(false);
      setActive(key);
    },
    [active, confirmDiscard, notifications],
  );

  const closePanel = useCallback(() => {
    if (confirmDiscard()) setActive(null);
  }, [confirmDiscard]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!active) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirtyRef.current) event.preventDefault();
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [active]);

  const onDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  const onSaved = useCallback(
    (message: string) => {
      setToast(message);
      router.refresh();
    },
    [router],
  );

  async function shareProfile() {
    const url = `${window.location.origin}${publicPath}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: displayName, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const creditCount = owner.experiences.length;
  const visuals = owner.visuals.filter((visual) => visual.kind !== "experience" && visual.url);
  const visualPreview = visuals.find((visual) => visual.kind === "reel") ?? visuals[0];
  const sizeRows = sizeSheetRows(owner.height, owner.sizing);
  const highlightCover = owner.highlights.find((item) => item.image_url)?.image_url ?? null;
  const lastHeadshot = owner.headshotUrls.at(-1) ?? null;

  const cards: { key: PanelKey; title: string; detail: string; Icon: LucideIcon; preview: ReactNode }[] = [
    {
      key: "public",
      title: "View public profile",
      detail: "See what casting teams see",
      Icon: Eye,
      preview: headshot ? <PreviewImage src={headshot} /> : null,
    },
    {
      key: "headshots",
      title: "Headshots",
      detail: owner.headshotUrls.length ? plural(owner.headshotUrls.length, "headshot") : "Add your first headshot",
      Icon: Camera,
      preview: lastHeadshot ? <PreviewImage src={lastHeadshot} /> : null,
    },
    {
      key: "highlights",
      title: "Highlights",
      detail: owner.highlights.length ? plural(owner.highlights.length, "highlight") : "Feature your standout credits",
      Icon: Sparkles,
      preview: highlightCover ? <PreviewImage src={highlightCover} /> : null,
    },
    {
      key: "visuals",
      title: "Visuals",
      detail: visuals.length ? plural(visuals.length, "video") : "Add your reel, slate, and clips",
      Icon: Film,
      preview: visualPreview?.url ? (
        <video src={`${visualPreview.url}#t=0.1`} muted playsInline preload="metadata" aria-hidden tabIndex={-1} />
      ) : null,
    },
    {
      key: "resume",
      title: "Resume",
      detail: creditCount ? plural(creditCount, "credit") : "Upload or add your credits",
      Icon: FileText,
      preview: creditCount ? (
        <ResumePaper
          className="is-thumbnail"
          name={displayName}
          stats={[owner.height ? `Height ${owner.height}` : "", location ?? ""].filter(Boolean)}
          experiences={owner.experiences}
        />
      ) : null,
    },
    {
      key: "sizing",
      title: "Size sheet",
      detail: sizeRows.length ? plural(sizeRows.length, "measurement") : "Measurements and wardrobe sizing",
      Icon: Ruler,
      preview: sizeRows.length ? (
        <SizeSheetPaper
          className="is-thumbnail"
          name={displayName}
          headshot={headshot}
          location={owner.location}
          representation={owner.representation}
          rows={sizeRows}
          profileUrl={publicPath}
        />
      ) : null,
    },
  ];

  const panelProps = { owner, actionsHost, onDirtyChange, onSaved };

  return (
    <div className="portfolio-page">
      <header className="portfolio-header">
        <div className="portfolio-header__inner">
          <div className="portfolio-header__identity">
            <Headshot url={headshot} name={displayName} />
            <div className="min-w-0">
              <h1>{displayName}</h1>
              <p>
                {[profile.username ? `@${profile.username}` : null, location].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="portfolio-header__actions">
            <button type="button" onClick={() => void shareProfile()}>
              {copied ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
              {copied ? "Link copied" : "Share profile"}
            </button>
          </div>
        </div>
      </header>

      <div className="portfolio-scroll" data-lenis-prevent>
        <div className="portfolio-scroll__inner">
          {underReview ? (
            <p className="portfolio-review-banner" role="status">
              <Clock3 size={16} aria-hidden />
              <span>
                <strong>Your profile is under review.</strong> We’ll let you know once Motiion approves it.
              </span>
            </p>
          ) : null}

          {completion ? <CompletionBanner {...completion} /> : null}

          <section aria-labelledby="portfolio-edit-title">
            <div className="talent-section-heading">
              <div>
                <h2 id="portfolio-edit-title">Build your portfolio</h2>
                <p>Keep the details casting teams look for up to date.</p>
              </div>
            </div>
            <div className="talent-portfolio-cards">
              {cards.map((card) => (
                <button
                  type="button"
                  className="talent-portfolio-card"
                  key={card.key}
                  aria-expanded={active === card.key}
                  aria-controls={PANEL_ID}
                  data-selected={active === card.key}
                  onClick={() => openPanel(card.key)}
                >
                  <span className="talent-portfolio-card-preview" data-empty={card.preview ? undefined : true} aria-hidden>
                    {card.preview ?? <card.Icon size={20} strokeWidth={1.6} aria-hidden />}
                  </span>
                  <div>
                    <h3>{card.title}</h3>
                    <p>{card.detail}</p>
                  </div>
                  <ChevronRight size={18} aria-hidden />
                </button>
              ))}
            </div>
          </section>

          {highlights.length > 0 ? (
            <section className="portfolio-highlights" aria-label="Highlights">
              <h2>Highlights</h2>
              <div className="portfolio-highlights__row">
                {highlights.map((item) => (
                  <HighlightCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ) : null}

          <PortfolioProfileTabs editor={editor} agencies={agencies} />
        </div>
      </div>

      <WorkspaceSidePanel
        id={PANEL_ID}
        open={active !== null && !notifications.open}
        title={active ? PANEL_TITLES[active] : "Portfolio"}
        onClose={closePanel}
        actions={<div ref={setActionsHost} className="workspace-side-panel__slot" />}
      >
        {active === "public" ? <PublicProfilePanel path={publicPath} actionsHost={actionsHost} /> : null}
        {active === "headshots" ? <HeadshotsPanel {...panelProps} /> : null}
        {active === "highlights" ? <HighlightsPanel {...panelProps} /> : null}
        {active === "visuals" ? <VisualsPanel {...panelProps} /> : null}
        {active === "resume" ? <ResumePanel {...panelProps} /> : null}
        {active === "sizing" ? <SizeSheetPanel {...panelProps} /> : null}
        {toast ? (
          <p className="portfolio-toast" role="status">
            <Check size={14} aria-hidden /> {toast}
          </p>
        ) : null}
      </WorkspaceSidePanel>
    </div>
  );
}

function Headshot({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <div className="portfolio-headshot" draggable={false} onDragStart={(event) => event.preventDefault()}>
        <Image src={url} alt="" fill draggable={false} className="object-cover" unoptimized />
      </div>
    );
  }

  return (
    <div className="portfolio-headshot portfolio-headshot--empty" aria-hidden>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function PreviewImage({ src }: { src: string }) {
  return <Image src={src} alt="" fill sizes="48px" className="object-cover" draggable={false} unoptimized />;
}

function CompletionBanner({ completed, total, cta }: { completed: number; total: number; cta: string }) {
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return (
    <section className="portfolio-completion" aria-label="Profile completion">
      <div className="portfolio-completion__copy">
        <h2>Complete your profile</h2>
        <p>
          {completed} of {total} complete · {percent}%
        </p>
      </div>
      <div className="portfolio-completion__bar" aria-hidden>
        <span style={{ width: `${percent}%` }} />
      </div>
      <Link href="/profile/setup">{cta}</Link>
    </section>
  );
}

function HighlightCard({ item }: { item: ProfileHighlight }) {
  return (
    <article className="portfolio-highlight">
      <p>{item.title}</p>
      {item.subtitle ? <p>{item.subtitle}</p> : null}
    </article>
  );
}
