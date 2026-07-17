"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  FolderKanban,
  Images,
  LayoutDashboard,
  ListChecks,
  Mail,
  MessageSquare,
  Search,
  Sparkles,
  UserCircle,
  Users,
} from "lucide-react";

import { AppPreviewMock } from "@/components/landing/AppPreviewMocks";
import { Reveal } from "@/components/landing/Reveal";
import type { AudienceBenefit, BenefitIconKey } from "@/lib/marketing/marketing-pages";

import "./audience-benefits-showcase.css";

const benefitIcons: Record<BenefitIconKey, LucideIcon> = {
  images: Images,
  search: Search,
  mail: Mail,
  "user-circle": UserCircle,
  users: Users,
  sparkles: Sparkles,
  "folder-kanban": FolderKanban,
  bookmark: Bookmark,
  "list-checks": ListChecks,
  "layout-dashboard": LayoutDashboard,
  "message-square": MessageSquare,
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function BenefitIcon({ icon }: { icon: BenefitIconKey }) {
  const Icon = benefitIcons[icon];
  return <Icon className="audience-benefits__icon size-5" aria-hidden />;
}

function FeaturedBenefitCard({
  benefit,
  dark,
  showDivider = false,
  insetStart = false,
}: {
  benefit: AudienceBenefit;
  dark: boolean;
  showDivider?: boolean;
  insetStart?: boolean;
}) {
  const isBlankPreview =
    benefit.preview === "talent-portfolio" ||
    benefit.preview === "talent-discovery" ||
    benefit.preview === "industry-navigator" ||
    benefit.preview === "industry-projects";

  return (
    <article
      className={cn(
        "audience-benefits__featured-card",
        showDivider && "audience-benefits__featured-card--divider",
        insetStart && "audience-benefits__featured-card--inset",
      )}
    >
      <div className="audience-benefits__featured-copy">
        <BenefitIcon icon={benefit.icon} />
        <h3 className={cn("audience-benefits__featured-title", !dark && "text-[var(--ink)]")}>
          {benefit.title}
        </h3>
        <p className={cn("audience-benefits__featured-description", !dark && "text-[var(--ink-soft)]")}>
          {benefit.description}
        </p>
      </div>

      {benefit.preview ? (
        <div
          className={cn(
            "audience-benefits__preview",
            isBlankPreview && "audience-benefits__preview--blank",
          )}
          aria-hidden={isBlankPreview ? true : undefined}
        >
          {!isBlankPreview ? (
            <div className="audience-benefits__preview-inner">
              <AppPreviewMock kind={benefit.preview} />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function CompactBenefitCard({
  benefit,
  dark,
}: {
  benefit: AudienceBenefit;
  dark: boolean;
}) {
  return (
    <article className="audience-benefits__compact-card">
      <BenefitIcon icon={benefit.icon} />
      <h3 className={cn("audience-benefits__compact-title", !dark && "text-[var(--ink)]")}>
        {benefit.title}
      </h3>
      <p className={cn("audience-benefits__compact-description", !dark && "text-[var(--ink-soft)]")}>
        {benefit.description}
      </p>
    </article>
  );
}

export function AudienceBenefitsShowcase({
  title,
  benefits,
  dark = false,
}: {
  title: string;
  benefits: AudienceBenefit[];
  dark?: boolean;
}) {
  const featured = benefits.filter((benefit) => benefit.featured);
  const compact = benefits.filter((benefit) => !benefit.featured);

  return (
    <div className={cn("audience-benefits", dark && "text-white")}>
      <div className="audience-benefits__header">
        <h2
          className={cn(
            "type-heading-1 mx-auto max-w-3xl text-center text-balance",
            dark ? "text-on-dark-primary" : "text-[var(--ink)]",
          )}
        >
          {title}
        </h2>
      </div>

      {featured.length > 0 ? (
        <div className="audience-benefits__featured">
          {featured.map((benefit, index) => (
            <Reveal key={benefit.title} delay={index * 0.06} amount={0.12} distance={20}>
              <FeaturedBenefitCard
                benefit={benefit}
                dark={dark}
                showDivider={index === 0 && featured.length > 1}
                insetStart={index === 1}
              />
            </Reveal>
          ))}
        </div>
      ) : null}

      {compact.length > 0 ? (
        <div className="audience-benefits__compact">
          {compact.map((benefit, index) => (
            <Reveal key={benefit.title} delay={index * 0.04} amount={0.1} distance={14}>
              <CompactBenefitCard benefit={benefit} dark={dark} />
            </Reveal>
          ))}
        </div>
      ) : null}
    </div>
  );
}
