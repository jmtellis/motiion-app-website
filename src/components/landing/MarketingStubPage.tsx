import type { Viewport } from "next";
import Link from "next/link";

import { MarketingPageLayout } from "@/components/landing/MarketingPageLayout";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";

export const marketingStubViewport: Viewport = {
  themeColor: MARKETING_DARK.bg,
  colorScheme: "dark",
  viewportFit: "cover",
};

export function MarketingStubPage({
  eyebrow,
  title,
  description,
  cta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cta?: { label: string; href: string };
}) {
  return (
    <MarketingPageLayout
      activeTab={null}
      homeHeader
      darkTheme
      cleanHero
      heroSize="compact"
      hero={
        <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-6 text-left">
          <p className="type-eyebrow text-[var(--accent)]">{eyebrow}</p>
          <h1 className="type-display text-on-dark-primary text-balance">{title}</h1>
          <p className="type-lead max-w-2xl text-pretty text-on-dark-secondary">{description}</p>
          {cta ? (
            <Link href={cta.href} className="btn-hero-pill btn-hero-pill-accent mt-2">
              {cta.label}
            </Link>
          ) : null}
        </div>
      }
    />
  );
}
