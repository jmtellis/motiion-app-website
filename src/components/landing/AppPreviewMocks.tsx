"use client";

import { TalentNavigatorPreview } from "@/components/landing/TalentNavigatorPreview";
import { portraitWallImages } from "@/lib/mock-data";
import type { BenefitPreviewKind } from "@/lib/marketing/marketing-pages";

function PreviewChip({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return <span className={`app-preview-chip${accent ? " app-preview-chip--accent" : ""}`}>{children}</span>;
}

function PortfolioPreview() {
  return (
    <div className="app-preview-panel">
      <div className="app-preview-toolbar">
        <span className="app-preview-toolbar__title">Portfolio</span>
        <PreviewChip accent>Verified</PreviewChip>
      </div>
      <div className="app-preview-portfolio">
        <div className="app-preview-portfolio__thumb">
          {portraitWallImages.slice(0, 3).map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" />
          ))}
        </div>
        <div className="app-preview-portfolio__body">
          <p className="app-preview-portfolio__name">Ari Miles</p>
          <p className="app-preview-portfolio__meta">Los Angeles · Dancer · 5&apos;7&quot;</p>
          <div className="app-preview-portfolio__tags">
            <PreviewChip>Contemporary</PreviewChip>
            <PreviewChip>Commercial</PreviewChip>
            <PreviewChip>Heels</PreviewChip>
          </div>
          <div className="app-preview-portfolio__tags">
            <PreviewChip accent>Reel updated</PreviewChip>
            <PreviewChip>SAG-AFTRA</PreviewChip>
          </div>
        </div>
      </div>
    </div>
  );
}

function InboxPreview() {
  const rows = [
    { name: "Commercial casting", subtitle: "Role · Callback requested", active: true },
    { name: "Studio session", subtitle: "Class invite · Saturday 2pm", active: false },
    { name: "Tour rehearsal", subtitle: "Project · Availability check", active: false },
  ];

  return (
    <div className="app-preview-panel">
      <div className="app-preview-toolbar">
        <span className="app-preview-toolbar__title">Inbox</span>
        <PreviewChip accent>3 new</PreviewChip>
      </div>
      <div className="app-preview-list">
        {rows.map((row) => (
          <div
            key={row.name}
            className={`app-preview-list__row${row.active ? " app-preview-list__row--active" : ""}`}
          >
            <div className="app-preview-list__copy">
              <p className="app-preview-list__title">{row.name}</p>
              <p className="app-preview-list__subtitle">{row.subtitle}</p>
            </div>
            <PreviewChip>{row.active ? "Respond" : "View"}</PreviewChip>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectsPreview() {
  const rows = [
    { name: "Summer campaign", status: "Live", roles: "4 roles" },
    { name: "Tour ensemble", status: "Draft", roles: "2 roles" },
    { name: "Music video", status: "Review", roles: "Shortlist" },
  ];

  return (
    <div className="app-preview-panel">
      <div className="app-preview-toolbar">
        <span className="app-preview-toolbar__title">Projects</span>
        <PreviewChip>Workspace</PreviewChip>
      </div>
      <div className="app-preview-projects">
        {rows.map((row) => (
          <div key={row.name} className="app-preview-projects__row">
            <div>
              <p className="app-preview-projects__name">{row.name}</p>
              <p className="app-preview-projects__meta">{row.roles}</p>
            </div>
            <PreviewChip>{row.status}</PreviewChip>
          </div>
        ))}
      </div>
    </div>
  );
}

function RosterPreview() {
  const names = ["Ari M.", "Jordan K.", "Maya L.", "Devon S.", "Noah P.", "Sienna R.", "Kai T.", "Elena V."];

  return (
    <div className="app-preview-panel">
      <div className="app-preview-toolbar">
        <span className="app-preview-toolbar__title">Roster</span>
        <PreviewChip accent>12 saved</PreviewChip>
      </div>
      <div className="app-preview-roster">
        {names.map((name, index) => (
          <div key={name} className="app-preview-roster__cell">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portraitWallImages[index % portraitWallImages.length]} alt="" />
            <span className="app-preview-roster__label">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShortlistPreview() {
  const picks = portraitWallImages.slice(0, 3);

  return (
    <div className="app-preview-panel">
      <div className="app-preview-toolbar">
        <span className="app-preview-toolbar__title">Shortlist</span>
        <PreviewChip accent>Compare</PreviewChip>
      </div>
      <div className="app-preview-list">
        {picks.map((src, index) => (
          <div key={src} className={`app-preview-list__row${index === 0 ? " app-preview-list__row--active" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="app-preview-list__avatar" />
            <div className="app-preview-list__copy">
              <p className="app-preview-list__title">Lead {index + 1}</p>
              <p className="app-preview-list__subtitle">Style match · Available</p>
            </div>
            <PreviewChip>{index === 0 ? "Selected" : "Review"}</PreviewChip>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiscoveryPreview() {
  return (
    <div className="app-preview-panel">
      <div className="app-preview-toolbar">
        <span className="app-preview-toolbar__title">Search results</span>
        <PreviewChip accent>Style match</PreviewChip>
      </div>
      <div className="app-preview-roster">
        {portraitWallImages.slice(0, 8).map((src, index) => (
          <div
            key={src}
            className="app-preview-roster__cell"
            style={
              index === 2
                ? { borderColor: "rgb(45 212 191 / 0.35)", background: "rgb(45 212 191 / 0.08)" }
                : undefined
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" />
            <span className="app-preview-roster__label">Talent {index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NavigatorPreview() {
  return (
    <div className="marketing-hero-panel h-full">
      <TalentNavigatorPreview />
    </div>
  );
}

export function AppPreviewMock({ kind }: { kind: BenefitPreviewKind }) {
  switch (kind) {
    case "talent-portfolio":
      return <PortfolioPreview />;
    case "talent-discovery":
      return <DiscoveryPreview />;
    case "talent-inbox":
      return <InboxPreview />;
    case "industry-navigator":
      return <NavigatorPreview />;
    case "industry-projects":
      return <ProjectsPreview />;
    case "industry-roster":
      return <RosterPreview />;
    case "industry-shortlist":
      return <ShortlistPreview />;
    default:
      return null;
  }
}
