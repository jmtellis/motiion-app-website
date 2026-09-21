import type { Viewport } from "next";
import { redirect } from "next/navigation";

import { BrowserThemeColor } from "@/components/landing/BrowserThemeColor";
import { FooterRevealShell } from "@/components/landing/FooterRevealShell";
import { HomeMarketingHeader } from "@/components/landing/HomeMarketingHeader";
import { HomeMarketingShell } from "@/components/landing/HomeMarketingShell";
import { HomeSplitLanding } from "@/components/landing/HomeSplitLanding";
import { LandingAudiencePanel } from "@/components/landing/LandingAudiencePanel";
import { LandingAudienceProvider } from "@/components/landing/LandingAudienceContext";
import { LandingSignupBand } from "@/components/landing/LandingSignupBand";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import { getProfileDestination, isOnboardingComplete } from "@/lib/auth/profile";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";
import { parseAudienceParam } from "@/lib/marketing/marketing-pages";

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
  const [profile, params] = await Promise.all([getCurrentUserProfile(), searchParams]);
  if (profile && isOnboardingComplete(profile)) {
    redirect(getProfileDestination(profile));
  }

  return (
    <HomeMarketingShell>
      <MarketingBodySurface dark />
      <BrowserThemeColor color={MARKETING_DARK.bg} />
      <LandingAudienceProvider
        key={parseAudienceParam(params.audience)}
        initial={parseAudienceParam(params.audience)}
      >
        <HomeMarketingHeader darkTheme overlayHero showAudienceTabs />
        <FooterRevealShell surfaceClass="bg-[#111111]" footerBand={<LandingSignupBand />}>
          <main id="main-content">
            <HomeSplitLanding />
            <LandingAudiencePanel />
          </main>
        </FooterRevealShell>
      </LandingAudienceProvider>
    </HomeMarketingShell>
  );
}
