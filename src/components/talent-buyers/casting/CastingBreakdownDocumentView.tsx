"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  BadgeCheck,
  Calendar,
  Clapperboard,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Images,
  MapPin,
  Send,
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
    case "Location & schedule":
      return MapPin;
    case "Compensation":
      return DollarSign;
    case "How to apply":
      return Send;
    case "Roles":
      return Users;
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

export function CastingBreakdownDocumentView({
  document,
  headerAction,
  renderSectionAction,
  hideHeader = false,
  sectionsOnly = false,
}: {
  document: CastingBreakdownDocument;
  headerAction?: ReactNode;
  renderSectionAction?: (sectionTitle: string) => ReactNode;
  hideHeader?: boolean;
  /** Render only sections/roles/readiness — title, intro, and byline are owned by the parent. */
  sectionsOnly?: boolean;
}) {
  const outstandingReadiness = document.readiness.filter((item) => !item.ok);

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

      {document.sections.map((section) => {
        const SectionIcon = sectionIcon(section.title);
        return (
          <section key={section.title} className="casting-breakdown-doc__section" aria-labelledby={`doc-${section.title}`}>
            <div className="casting-breakdown-doc__section-heading">
              <h3 id={`doc-${section.title}`} className="casting-breakdown-doc__section-title">
                {SectionIcon ? <SectionIcon className="casting-breakdown-doc__section-icon" aria-hidden /> : null}
                {section.title}
              </h3>
              {renderSectionAction?.(section.title)}
            </div>
            <div className="casting-breakdown-doc__section-body">
              {section.blocks.map((block, index) => (
                <CastingBreakdownBlockView key={`${section.title}-${index}`} block={block} />
              ))}
            </div>
          </section>
        );
      })}

      <section className="casting-breakdown-doc__section" aria-labelledby="doc-roles">
        <div className="casting-breakdown-doc__section-heading">
          <h3 id="doc-roles" className="casting-breakdown-doc__section-title">
            <Users className="casting-breakdown-doc__section-icon" aria-hidden />
            Roles
          </h3>
          {renderSectionAction?.("Roles")}
        </div>
        {document.roles.length > 0 ? (
          <div className="casting-breakdown-doc__roles">
            {document.roles.map((role) => (
              <CastingBreakdownRoleArticle key={role.id} role={role} />
            ))}
          </div>
        ) : (
          <p className="casting-breakdown-doc__paragraph">No roles yet — add who you&apos;re casting for.</p>
        )}
      </section>

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
