import { redirect } from "next/navigation";
import type { Viewport } from "next";

import { HomeLandingHero } from "@/components/landing/HomeLandingHero";
import { HomeLandingSections } from "@/components/landing/HomeLandingSections";
import { MarketingPageLayout } from "@/components/landing/MarketingPageLayout";
import { isOnboardingComplete } from "@/lib/auth/profile";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getHeroHeadshotImages, getPillarHeadshotImages } from "@/lib/search/search-profiles";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";

export const viewport: Viewport = {
  themeColor: MARKETING_DARK.bg,
  colorScheme: "dark",
};

export default async function Home() {
  const profile = await getCurrentUserProfile();
  if (profile && isOnboardingComplete(profile)) {
    redirect("/home");
  }

  const [headshotImages, pillarHeadshots] = await Promise.all([
    getHeroHeadshotImages(),
    getPillarHeadshotImages(),
  ]);

  return (
    <MarketingPageLayout
      homeHeader
      darkTheme
      headshotImages={headshotImages}
      heroBackgroundImage="/hero-studio-background.png"
      activeTab={null}
      hero={<HomeLandingHero dark />}
    >
      <HomeLandingSections dark pillarHeadshots={pillarHeadshots} />
    </MarketingPageLayout>
  );
}
