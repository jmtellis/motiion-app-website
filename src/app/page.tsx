import { redirect } from "next/navigation";
import type { Viewport } from "next";

import { HomeLandingHero, HomeLandingSections } from "@/components/landing/HomeLandingSections";
import { MarketingPageLayout } from "@/components/landing/MarketingPageLayout";
import { getProfileDestination, isOnboardingComplete } from "@/lib/auth/profile";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getHeroHeadshotImages } from "@/lib/search/search-profiles";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";

export const viewport: Viewport = {
  themeColor: MARKETING_DARK.bg,
  colorScheme: "dark",
};

export default async function Home() {
  const profile = await getCurrentUserProfile();
  if (profile && isOnboardingComplete(profile)) {
    redirect(getProfileDestination(profile));
  }

  const headshotImages = await getHeroHeadshotImages();

  return (
    <MarketingPageLayout
      homeHeader
      darkTheme
      headshotImages={headshotImages}
      heroBackgroundImage="/hero-studio-background.png"
      activeTab={null}
      hero={<HomeLandingHero dark />}
    >
      <HomeLandingSections dark />
    </MarketingPageLayout>
  );
}
