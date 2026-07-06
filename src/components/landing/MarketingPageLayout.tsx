import { HeroShaderVideoBackground } from "@/components/landing/HeroShaderVideoBackground";
import { FooterRevealShell } from "@/components/landing/FooterRevealShell";
import { LandingFooterMarquee } from "@/components/landing/LandingFooterMarquee";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import { HeadshotColumnsBackground } from "@/components/landing/HeadshotColumnsBackground";
import { BrowserThemeColor } from "@/components/landing/BrowserThemeColor";
import { HeroScrollDepth } from "@/components/landing/HeroScrollDepth";
import { HeroStudioBackground } from "@/components/landing/HeroStudioBackground";
import { HomeHeroSection } from "@/components/landing/HomeHeroSection";
import { HomeMarketingHeader } from "@/components/landing/HomeMarketingHeader";
import { HomeMarketingShell } from "@/components/landing/HomeMarketingShell";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";
import type { MarketingHeaderTab } from "@/lib/marketing/marketing-pages";

export function MarketingPageLayout({
  activeTab,
  headshotImages = [],
  hero,
  children,
  homeHeader = false,
  heroBackgroundImage,
  heroVideo,
  darkTheme = false,
  cleanHero = false,
}: {
  activeTab: MarketingHeaderTab;
  headshotImages?: string[];
  hero: React.ReactNode;
  children?: React.ReactNode;
  /** Root landing: centered logo only, no audience tabs. */
  homeHeader?: boolean;
  /** Studio plate behind the headshot wall (home). */
  heroBackgroundImage?: string;
  /** Shader-treated background video for the home hero. */
  heroVideo?: { src: string; poster: string; alt: string };
  /** Dark page body below hero (home). */
  darkTheme?: boolean;
  /** Audience pages: plain hero surface, no portrait wall. */
  cleanHero?: boolean;
}) {
  const headerPullClass = homeHeader
    ? "-mt-[5.75rem] md:-mt-[4.5rem]"
    : "-mt-[6.25rem] md:-mt-[4.5rem]";
  const browserThemeColor = darkTheme ? MARKETING_DARK.bg : "#fcfcfb";

  const page = (
    <FooterRevealShell
      surfaceClass={darkTheme ? "bg-[#0a0a0a]" : "bg-[var(--paper)]"}
      footerBand={darkTheme ? <LandingFooterMarquee /> : undefined}
    >
      <MarketingBodySurface dark={darkTheme} />
      <div id="top" className={darkTheme ? "bg-[#0a0a0a]" : "bg-[var(--paper)]"}>
        <BrowserThemeColor color={browserThemeColor} />
        <HomeMarketingHeader
          activeTab={homeHeader ? null : activeTab}
          darkTheme={darkTheme}
          wordmarkHeader={!homeHeader}
        />

        {cleanHero ? (
          <section
            className={`relative w-full border-b ${headerPullClass} ${
              darkTheme ? "border-[#262626] bg-[#0a0a0a]" : "border-[var(--line)] bg-[var(--paper)]"
            }`}
          >
            {darkTheme ? <div className="marketing-hero-glow" aria-hidden /> : null}
            <div className="relative flex min-h-svh w-full items-center justify-center px-0 pb-16 pt-28 md:pt-28">
              {hero}
            </div>
          </section>
        ) : homeHeader ? (
          <HomeHeroSection
            headerPullClass={headerPullClass}
            background={
              heroVideo ? (
                <HeroShaderVideoBackground
                  src={heroVideo.src}
                  poster={heroVideo.poster}
                  alt={heroVideo.alt}
                />
              ) : (
                <>
                  {heroBackgroundImage ? <HeroStudioBackground src={heroBackgroundImage} /> : null}
                  <HeadshotColumnsBackground
                    images={headshotImages}
                    variant={heroBackgroundImage ? "overlay" : "light"}
                    className="opacity-30"
                  />
                </>
              )
            }
          >
            {hero}
          </HomeHeroSection>
        ) : (
          <section className={`relative min-h-svh w-full overflow-hidden ${headerPullClass}`}>
            <HeroScrollDepth
              background={
                <>
                  {heroBackgroundImage ? <HeroStudioBackground src={heroBackgroundImage} /> : null}
                  <HeadshotColumnsBackground
                    images={headshotImages}
                    variant={heroBackgroundImage ? "overlay" : "light"}
                  />
                </>
              }
            >
              <div className="flex min-h-svh w-full items-center justify-center px-0 pb-12 pt-28 md:pt-24">
                {hero}
              </div>
            </HeroScrollDepth>
          </section>
        )}

        {children ? <div className="relative isolate">{children}</div> : null}
      </div>
    </FooterRevealShell>
  );

  return <HomeMarketingShell>{page}</HomeMarketingShell>;
}
