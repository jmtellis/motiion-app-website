import { HeadshotColumnsBackground } from "@/components/landing/HeadshotColumnsBackground";
import { HeroStudioBackground } from "@/components/landing/HeroStudioBackground";
import { HomeMarketingHeader } from "@/components/landing/HomeMarketingHeader";
import { HomePastHeroSentinel } from "@/components/landing/HomePastHeroSentinel";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { Footer } from "@/components/landing/Footer";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";
import type { MarketingHeaderTab } from "@/lib/marketing/marketing-pages";

export function MarketingPageLayout({
  activeTab,
  headshotImages,
  hero,
  children,
  homeHeader = false,
  heroBackgroundImage,
  darkTheme = false,
}: {
  activeTab: MarketingHeaderTab;
  headshotImages: string[];
  hero: React.ReactNode;
  children?: React.ReactNode;
  /** Root landing: centered logo only, no audience tabs. */
  homeHeader?: boolean;
  /** Studio plate behind the headshot wall (home). */
  heroBackgroundImage?: string;
  /** Dark page body below hero (home). */
  darkTheme?: boolean;
}) {
  const headerPullClass = homeHeader ? "-mt-[4.5rem]" : "-mt-24 md:-mt-[4.5rem]";

  return (
    <div id="top" className={darkTheme ? "bg-[#0a1214]" : "bg-[var(--paper)]"}>
      {homeHeader ? (
        <HomeMarketingHeader darkTheme={darkTheme} />
      ) : (
        <MarketingHeader activeTab={activeTab} overlay />
      )}

      {/* Pull hero under the sticky header so the lockup still fills the viewport */}
      <section className={`relative min-h-svh w-full ${headerPullClass}`}>
        <div className="absolute inset-0" aria-hidden>
          {heroBackgroundImage ? <HeroStudioBackground src={heroBackgroundImage} /> : null}
          <HeadshotColumnsBackground
            images={headshotImages}
            variant={heroBackgroundImage ? "overlay" : "light"}
          />
        </div>
        <div
          className={`relative z-10 flex min-h-svh w-full items-center justify-center px-0 pb-12 ${homeHeader ? "pt-20 md:pt-24" : "pt-28 md:pt-24"}`}
        >
          {hero}
        </div>
      </section>

      {children ? (
        <div className="relative z-20" style={{ backgroundColor: darkTheme ? MARKETING_DARK.bg : "var(--paper)" }}>
          {homeHeader ? <HomePastHeroSentinel /> : null}
          {children}
        </div>
      ) : null}
      <Footer />
    </div>
  );
}
