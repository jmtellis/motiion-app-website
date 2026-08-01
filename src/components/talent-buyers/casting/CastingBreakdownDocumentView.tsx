"use client";

import Link from "next/link";
import { createElement, Fragment, type ReactNode } from "react";
import {
  BadgeCheck,
  Calendar,
  Clapperboard,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Images,
  MapPin,
  Paperclip,
  Send,
  Settings,
  Users,
  Video,
} from "lucide-react";

import type {
  CastingBreakdownBlock,
  CastingBreakdownDocument,
  CastingBreakdownDocumentRole,
} from "@/lib/talent-buyers/casting/casting-breakdown-document";

function materialIcon(label: string) {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes("headshot") || normalized.includes("photo")) return ImageIcon;
  if (normalized.includes("resume") || normalized.includes("cv")) return FileText;
  if (normalized.includes("reel") || normalized.includes("video")) return Clapperboard;
  if (normalized.includes("self-tape") || normalized.includes("self tape")) return Video;
  if (normalized.includes("dance")) return Images;
  if (normalized.includes("availability")) return Calendar;
  return FileText;
}

function eligibilityIcon(label: string) {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes("local")) return MapPin;
  if (normalized.includes("18") || normalized.includes("age")) return BadgeCheck;
  if (normalized.includes("union") || normalized.includes("agency")) return BadgeCheck;
  return BadgeCheck;
}

function sectionIcon(title: string) {
  switch (title) {
    case "Overview":
      return FileText;
    case "Location & schedule":
    case "Production and schedule":
      return MapPin;
    case "Compensation":
      return DollarSign;
    case "How to apply":
      return Send;
    case "Casting settings":
      return Settings;
    case "Roles":
      return Users;
    case "Files":
      return Paperclip;
    default:
      return null;
  }
}

function CastingBreakdownBlockView({ block }: { block: CastingBreakdownBlock }) {
  if (block.type === "paragraph") {
    return <p className="casting-breakdown-doc__paragraph">{block.text}</p>;
  }

  if (block.type === "list") {
    const isMaterials = block.title?.toLowerCase() === "required materials";
    const isEligibility = block.title?.toLowerCase() === "eligibility";

    return (
      <div className="casting-breakdown-doc__list-block">
        {block.title ? <h4 className="casting-breakdown-doc__list-title">{block.title}</h4> : null}
        <ul className={`casting-breakdown-doc__list ${isMaterials || isEligibility ? "casting-breakdown-doc__list--icons" : ""}`}>
          {block.items.map((item) => {
            const Icon = isMaterials ? materialIcon(item) : isEligibility ? eligibilityIcon(item) : null;
            return (
              <li key={item} className={Icon ? "casting-breakdown-doc__list-item--icon" : undefined}>
                {Icon ? <Icon className="casting-breakdown-doc__list-icon" aria-hidden /> : null}
                <span>{item}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <blockquote className="casting-breakdown-doc__note">
      <p>{block.text}</p>
    </blockquote>
  );
}

function CastingBreakdownRoleArticle({ role }: { role: CastingBreakdownDocumentRole }) {
  return (
    <article className="casting-breakdown-doc__role">
      <h3 className="casting-breakdown-doc__role-title">{role.title}</h3>
      {role.description ? <p className="casting-breakdown-doc__role-description">{role.description}</p> : null}
      {role.summary ? <p className="casting-breakdown-doc__role-summary">{role.summary}</p> : null}
      {role.pipeline ? <p className="casting-breakdown-doc__role-pipeline">{role.pipeline}</p> : null}
      {role.reviewHref ? (
        <Link href={role.reviewHref} className="casting-breakdown-doc__role-link">
          Review submissions
        </Link>
      ) : null}
    </article>
  );
}

function SectionTitleIcon({ title }: { title: string }) {
  const Icon = sectionIcon(title);
  if (!Icon) return null;
  return createElement(Icon, { className: "casting-breakdown-doc__section-icon", "aria-hidden": true });
}

function CastingBreakdownDocSection({
  title,
  action,
  children,
  wide = false,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const headingId = `doc-${title}`;

  return (
    <section
      className={`casting-breakdown-doc__section${wide ? " casting-breakdown-doc__section--wide" : ""}`}
      aria-labelledby={headingId}
    >
      <div className="casting-breakdown-doc__section-heading">
        <h3 id={headingId} className="casting-breakdown-doc__section-title">
          <SectionTitleIcon title={title} />
          {title}
        </h3>
        {action}
      </div>
      <div className="casting-breakdown-doc__section-body">{children}</div>
    </section>
  );
}

export function CastingBreakdownDocumentView({
  document,
  headerAction,
  renderSectionAction,
  renderRoles,
  hideHeader = false,
  sectionsOnly = false,
  hideRoles = false,
  rolesAfterOverview = false,
}: {
  document: CastingBreakdownDocument;
  headerAction?: ReactNode;
  renderSectionAction?: (sectionTitle: string) => ReactNode;
  /** Replace the default static role articles (e.g. overview role cards). */
  renderRoles?: ReactNode;
  hideHeader?: boolean;
  /** Render only sections/roles/readiness — title, intro, and byline are owned by the parent. */
  sectionsOnly?: boolean;
  /** Omit the Roles section when the parent renders role cards separately. */
  hideRoles?: boolean;
  /** Place Roles immediately after Overview instead of at the end. */
  rolesAfterOverview?: boolean;
}) {
  const outstandingReadiness = document.readiness.filter((item) => !item.ok);
  const overviewIndex = document.sections.findIndex((section) => section.title === "Overview");
  const showRoles = !hideRoles;
  const insertRolesAfterOverview = showRoles && rolesAfterOverview && overviewIndex >= 0;

  function renderRolesSection() {
    return (
      <CastingBreakdownDocSection
        title="Roles"
        wide={renderRoles != null}
        action={renderSectionAction?.("Roles")}
      >
        {renderRoles != null ? (
          renderRoles
        ) : document.roles.length > 0 ? (
          <div className="casting-breakdown-doc__roles">
            {document.roles.map((role) => (
              <CastingBreakdownRoleArticle key={role.id} role={role} />
            ))}
          </div>
        ) : (
          <p className="casting-breakdown-doc__paragraph">No roles yet — add who you&apos;re casting for.</p>
        )}
      </CastingBreakdownDocSection>
    );
  }

  function renderProseSection(section: CastingBreakdownDocument["sections"][number]) {
    return (
      <CastingBreakdownDocSection
        key={section.title}
        title={section.title}
        action={renderSectionAction?.(section.title)}
      >
        {section.blocks.map((block, index) => (
          <CastingBreakdownBlockView key={`${section.title}-${index}`} block={block} />
        ))}
      </CastingBreakdownDocSection>
    );
  }

  return (
    <article className="casting-breakdown-doc">
      {!sectionsOnly ? (
        !hideHeader ? (
          <header className="casting-breakdown-doc__header">
            <div className="casting-breakdown-doc__header-row">
              <h2 className="casting-breakdown-doc__title">{document.title}</h2>
              {headerAction ? <div className="casting-breakdown-doc__header-action">{headerAction}</div> : null}
            </div>
            {document.byline.length > 0 ? (
              <p className="casting-breakdown-doc__byline">{document.byline.join(" · ")}</p>
            ) : null}
            {document.intro ? <p className="casting-breakdown-doc__intro">{document.intro}</p> : null}
          </header>
        ) : (
          <div className="casting-breakdown-doc__meta">
            <div className="casting-breakdown-doc__header-row">
              {document.byline.length > 0 ? (
                <p className="casting-breakdown-doc__byline casting-breakdown-doc__byline--meta">
                  {document.byline.join(" · ")}
                </p>
              ) : (
                <span />
              )}
              {headerAction ? <div className="casting-breakdown-doc__header-action">{headerAction}</div> : null}
            </div>
          </div>
        )
      ) : null}

      {document.sections.map((section, index) => (
        <Fragment key={section.title}>
          {renderProseSection(section)}
          {insertRolesAfterOverview && index === overviewIndex ? renderRolesSection() : null}
        </Fragment>
      ))}

      {showRoles && !insertRolesAfterOverview ? renderRolesSection() : null}

      {outstandingReadiness.length > 0 ? (
        <footer className="casting-breakdown-doc__footer">
          <p className="casting-breakdown-doc__footer-label">Still Needed</p>
          <ul className="casting-breakdown-doc__footer-list">
            {outstandingReadiness.map((item) => (
              <li key={item.label}>{item.label}</li>
            ))}
          </ul>
        </footer>
      ) : null}
    </article>
  );
}
