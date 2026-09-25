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
  return (
    <article
      className={cn(
        "audience-benefits__featured-card",
        showDivider && "audience-benefits__featured-card--divider",
        insetStart && "audience-benefits__featured-card--inset",
        !benefit.preview && "audience-benefits__featured-card--text",
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

      {/* The preview restates the copy above it visually, so it is hidden from
          assistive technology instead of duplicating decorative UI microcopy. */}
      {benefit.preview ? (
        <div className="audience-benefits__preview" aria-hidden>
          <div className="audience-benefits__preview-inner">
            <AppPreviewMock kind={benefit.preview} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function CompactBenefitCard({ benefit, dark }: { benefit: AudienceBenefit; dark: boolean }) {
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
  benefits,
  dark = false,
}: {
  benefits: AudienceBenefit[];
  dark?: boolean;
}) {
  const featured = benefits.filter((benefit) => benefit.featured);
  const compact = benefits.filter((benefit) => !benefit.featured);
  const featuredHasMedia = featured.some((benefit) => Boolean(benefit.preview));

  return (
    <div className={cn("audience-benefits", dark && "text-white")}>

      {featured.length > 0 ? (
        <div
          className={cn(
            "audience-benefits__featured",
            featured.length > 2 && "audience-benefits__featured--stack",
            !featuredHasMedia && "audience-benefits__featured--text",
          )}
        >
          {featured.map((benefit, index) => (
            <FeaturedBenefitCard
              key={benefit.title}
              benefit={benefit}
              dark={dark}
              showDivider={featured.length === 2 && index === 0}
              insetStart={featured.length === 2 && index === 1}
            />
          ))}
        </div>
      ) : null}

      {compact.length > 0 ? (
        <div className="audience-benefits__compact">
          {compact.map((benefit) => (
            <CompactBenefitCard key={benefit.title} benefit={benefit} dark={dark} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
