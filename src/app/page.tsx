import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";

import { homepageStructuredData } from "@/lib/marketing/site-seo";

import { BrowserThemeColor } from "@/components/landing/BrowserThemeColor";
import { Footer } from "@/components/landing/Footer";
import { HomeMarketingHeader } from "@/components/landing/HomeMarketingHeader";
import { HomeMarketingShell } from "@/components/landing/HomeMarketingShell";
import { HomeSplitLanding } from "@/components/landing/HomeSplitLanding";
import { LandingAudiencePanel } from "@/components/landing/LandingAudiencePanel";
import { LandingAudienceProvider } from "@/components/landing/LandingAudienceContext";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import { getProfileDestination, isOnboardingComplete } from "@/lib/auth/profile";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";
import { loadHeroEventCards } from "@/lib/marketing/hero-events";
import { parseAudienceParam } from "@/lib/marketing/marketing-pages";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: MARKETING_DARK.bg },
    { media: "(prefers-color-scheme: dark)", color: MARKETING_DARK.bg },
  ],
  colorScheme: "dark",
  viewportFit: "cover",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string }>;
}) {
  const [profile, params, events] = await Promise.all([
    getCurrentUserProfile(),
    searchParams,
    loadHeroEventCards(),
  ]);
  if (profile && isOnboardingComplete(profile)) {
    redirect(getProfileDestination(profile));
  }

  return (
    <HomeMarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homepageStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <MarketingBodySurface dark />
      <BrowserThemeColor color={MARKETING_DARK.bg} />
      <LandingAudienceProvider
        key={parseAudienceParam(params.audience)}
        initial={parseAudienceParam(params.audience)}
      >
        <HomeMarketingHeader darkTheme overlayHero />

          <main id="main-content">
            <HomeSplitLanding events={events} />
            <LandingAudiencePanel />
          </main>
        <Footer />
      </LandingAudienceProvider>
    </HomeMarketingShell>
  );
}
