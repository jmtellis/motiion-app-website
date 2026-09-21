import Image from "next/image";

import {
  APP_SCREENSHOT_SIZE,
  APP_SCREENSHOTS,
  PREVIEW_HEADSHOT_HEIGHT,
  PREVIEW_HEADSHOT_WIDTH,
  previewHeadshot,
} from "@/lib/marketing/preview-media";
import type { BenefitPreviewKind } from "@/lib/marketing/marketing-pages";

/**
 * Static representations of real Motiion product surfaces (portfolio, talent
 * search, project workspace, roster, inbox, shortlist). They use the product's
 * own vocabulary with clearly illustrative records, render no interactive
 * controls, and mount no product code or live data.
 *
 * Every preview duplicates the adjacent feature copy, so callers hide it from
 * assistive technology rather than repeating decorative UI microcopy.
 */

function PreviewChip({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={`app-preview-chip${accent ? " app-preview-chip--accent" : ""}`}>{children}</span>
  );
}

function PreviewAvatar({
  index,
  shape = "square",
  sizes,
}: {
  index: number;
  shape?: "square" | "round";
  sizes: string;
}) {
  return (
    <Image
      src={previewHeadshot(index)}
      alt=""
      width={PREVIEW_HEADSHOT_WIDTH}
      height={PREVIEW_HEADSHOT_HEIGHT}
      sizes={sizes}
      loading="lazy"
      className={`app-preview-avatar app-preview-avatar--${shape}`}
    />
  );
}

function PreviewPanel({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="app-preview-panel">
      <div className="app-preview-toolbar">
        <span className="app-preview-toolbar__title">{title}</span>
        {meta}
      </div>
      <div className="app-preview-body">{children}</div>
    </div>
  );
}

/** Talent → "Living portfolio". Mirrors the portfolio fields talent maintain. */
function PortfolioPreview() {
  const fields = [
    { label: "Headshots", value: "6 current" },
    { label: "Reel", value: "Updated Aug" },
    { label: "Training", value: "4 programs" },
    { label: "Sizing", value: "Complete" },
  ];

  return (
    <PreviewPanel title="Portfolio" meta={<PreviewChip accent>Published</PreviewChip>}>
      <div className="app-preview-portfolio">
        <div className="app-preview-portfolio__media">
          <PreviewAvatar index={4} sizes="96px" />
        </div>
        <div className="app-preview-portfolio__body">
          <p className="app-preview-portfolio__name">Ari Miles</p>
          <p className="app-preview-portfolio__meta">Dancer · Los Angeles, CA</p>
          <div className="app-preview-tags">
            <PreviewChip>Commercial</PreviewChip>
            <PreviewChip>Contemporary</PreviewChip>
            <PreviewChip>Heels</PreviewChip>
          </div>
        </div>
      </div>
      <dl className="app-preview-fields">
        {fields.map((field) => (
          <div key={field.label} className="app-preview-fields__row">
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
      <div className="app-preview-credits">
        <p className="app-preview-credits__title">Highlighted credits</p>
        <ul>
          <li>
            <span>Arena tour — ensemble</span>
            <span className="app-preview-credits__year">2025</span>
          </li>
          <li>
            <span>National campaign — featured</span>
            <span className="app-preview-credits__year">2024</span>
          </li>
        </ul>
      </div>
    </PreviewPanel>
  );
}

/** Talent → "Right discovery". The filters industry teams search with. */
function DiscoveryPreview() {
  const results = [
    { name: "Ari M.", meta: "Commercial · LA", index: 4 },
    { name: "Jordan K.", meta: "Heels · LA", index: 9 },
    { name: "Maya L.", meta: "Contemporary · NY", index: 1 },
    { name: "Devon S.", meta: "Hip-hop · LA", index: 6 },
    { name: "Sienna R.", meta: "Jazz · ATL", index: 14 },
    { name: "Kai T.", meta: "Commercial · LA", index: 19 },
  ];

  return (
    <PreviewPanel title="Talent search" meta={<PreviewChip accent>128 results</PreviewChip>}>
      <div className="app-preview-filters">
        <PreviewChip>Style · Commercial</PreviewChip>
        <PreviewChip>Los Angeles</PreviewChip>
        <PreviewChip>5+ years</PreviewChip>
      </div>
      <div className="app-preview-grid">
        {results.map((result) => (
          <figure key={result.name} className="app-preview-grid__cell">
            <PreviewAvatar index={result.index} sizes="88px" />
            <figcaption>
              <span className="app-preview-grid__name">{result.name}</span>
              <span className="app-preview-grid__meta">{result.meta}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </PreviewPanel>
  );
}

/** Talent → "Faster invites". One inbox for every opportunity type. */
function InboxPreview() {
  const rows = [
    { name: "Music video — Male Dancers", subtitle: "Casting invite · Responds by Fri", state: "New" },
    { name: "Studio session", subtitle: "Class invite · Sat 2:00pm", state: "Accepted" },
    { name: "Arena tour rehearsal", subtitle: "Availability check · Mar 4–9", state: "Replied" },
  ];

  return (
    <PreviewPanel title="Inbox" meta={<PreviewChip accent>3 new</PreviewChip>}>
      <div className="app-preview-list">
        {rows.map((row, index) => (
          <div
            key={row.name}
            className={`app-preview-list__row${index === 0 ? " app-preview-list__row--active" : ""}`}
          >
            <div className="app-preview-list__copy">
              <p className="app-preview-list__title">{row.name}</p>
              <p className="app-preview-list__subtitle">{row.subtitle}</p>
            </div>
            <PreviewChip accent={index === 0}>{row.state}</PreviewChip>
          </div>
        ))}
      </div>
    </PreviewPanel>
  );
}

/** Industry → "Talent database". Browse-by-category search across profiles. */
function TalentDatabasePreview() {
  const rows = [
    { label: "Commercial dancers", offset: 0 },
    { label: "Choreographers", offset: 6 },
    { label: "Heels specialists", offset: 12 },
  ];

  return (
    <PreviewPanel title="Talent database" meta={<PreviewChip>Filters · 3 active</PreviewChip>}>
      <div className="app-preview-filters">
        <PreviewChip>Dancer</PreviewChip>
        <PreviewChip>Los Angeles</PreviewChip>
        <PreviewChip>Available</PreviewChip>
      </div>
      <div className="app-preview-rows">
        {rows.map((row, rowIndex) => (
          <div key={row.label} className="app-preview-rows__row">
            <p className="app-preview-rows__label">{row.label}</p>
            <div className="app-preview-rows__track">
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className={`app-preview-rows__cell${
                    rowIndex === 0 && index === 1 ? " app-preview-rows__cell--focused" : ""
                  }`}
                >
                  <PreviewAvatar index={row.offset + index} sizes="72px" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PreviewPanel>
  );
}

/** Industry → "Project workspace". Real project and candidate status vocabulary. */
function ProjectsPreview() {
  const projects = [
    { name: "Summer campaign", meta: "4 roles · 62 submissions", status: "Active", accent: true },
    { name: "Arena tour ensemble", meta: "2 roles · 18 submissions", status: "Active", accent: true },
    { name: "Music video", meta: "1 role · breakdown in progress", status: "Draft", accent: false },
    { name: "Brand shoot — heels", meta: "1 role · casting closed", status: "Closed", accent: false },
  ];
  const pipeline = [
    { label: "Submitted", value: "62" },
    { label: "In review", value: "24" },
    { label: "Shortlisted", value: "9" },
    { label: "Confirmed", value: "4" },
  ];

  return (
    <PreviewPanel title="Projects" meta={<PreviewChip>Workspace</PreviewChip>}>
      <div className="app-preview-list">
        {projects.map((project) => (
          <div key={project.name} className="app-preview-list__row">
            <div className="app-preview-list__copy">
              <p className="app-preview-list__title">{project.name}</p>
              <p className="app-preview-list__subtitle">{project.meta}</p>
            </div>
            <PreviewChip accent={project.accent}>{project.status}</PreviewChip>
          </div>
        ))}
      </div>
      <div className="app-preview-pipeline">
        {pipeline.map((stage) => (
          <div key={stage.label} className="app-preview-pipeline__stage">
            <span className="app-preview-pipeline__value">{stage.value}</span>
            <span className="app-preview-pipeline__label">{stage.label}</span>
          </div>
        ))}
      </div>
    </PreviewPanel>
  );
}

/** Industry → "Roster management". Saved talent organized into rosters. */
function RosterPreview() {
  const names = [
    "Ari M.",
    "Jordan K.",
    "Maya L.",
    "Devon S.",
    "Noah P.",
    "Sienna R.",
    "Kai T.",
    "Elena V.",
  ];

  return (
    <PreviewPanel title="Roster" meta={<PreviewChip accent>Commercial · 12 saved</PreviewChip>}>
      <div className="app-preview-grid app-preview-grid--dense">
        {names.map((name, index) => (
          <figure key={name} className="app-preview-grid__cell">
            <PreviewAvatar index={index} sizes="72px" />
            <figcaption>
              <span className="app-preview-grid__name">{name}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </PreviewPanel>
  );
}

/** Industry → "Faster shortlists". Candidate comparison inside one role. */
function ShortlistPreview() {
  const picks = [
    { name: "Ari M.", meta: "Shortlisted · Available Mar 4–9", index: 4, state: "Shortlisted" },
    { name: "Jordan K.", meta: "In review · Availability requested", index: 9, state: "In review" },
    { name: "Maya L.", meta: "Callback · Tue 11:00am", index: 1, state: "Callback" },
  ];

  return (
    <PreviewPanel title="Shortlist — Lead dancer" meta={<PreviewChip>3 of 62</PreviewChip>}>
      <div className="app-preview-list">
        {picks.map((pick, index) => (
          <div
            key={pick.name}
            className={`app-preview-list__row${index === 0 ? " app-preview-list__row--active" : ""}`}
          >
            <PreviewAvatar index={pick.index} shape="round" sizes="32px" />
            <div className="app-preview-list__copy">
              <p className="app-preview-list__title">{pick.name}</p>
              <p className="app-preview-list__subtitle">{pick.meta}</p>
            </div>
            <PreviewChip accent={index === 0}>{pick.state}</PreviewChip>
          </div>
        ))}
      </div>
    </PreviewPanel>
  );
}

function AppScreenshot({ src }: { src: string }) {
  return (
    <div className="app-preview-shot">
      <Image
        src={src}
        alt=""
        width={APP_SCREENSHOT_SIZE}
        height={APP_SCREENSHOT_SIZE}
        sizes="(max-width: 639px) 100vw, 36rem"
        loading="lazy"
        className="app-preview-shot__image"
      />
    </div>
  );
}

export function AppPreviewMock({ kind }: { kind: BenefitPreviewKind }) {
  switch (kind) {
    case "talent-portfolio":
      return <AppScreenshot src={APP_SCREENSHOTS.portfolio} />;
    case "talent-discovery":
      return <AppScreenshot src={APP_SCREENSHOTS.discovery} />;
    case "talent-identity":
      return <AppScreenshot src={APP_SCREENSHOTS.credential} />;
    case "talent-inbox":
      return <InboxPreview />;
    case "industry-navigator":
      return <AppScreenshot src={APP_SCREENSHOTS.talentDatabase} />;
    case "industry-projects":
      return <ProjectsPreview />;
    case "industry-roster":
      return <RosterPreview />;
    case "industry-shortlist":
      return <ShortlistPreview />;
    case "community-event":
      return <AppScreenshot src={APP_SCREENSHOTS.eventCast} />;
    default:
      return null;
  }
}
