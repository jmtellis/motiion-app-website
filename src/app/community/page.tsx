import { redirect } from "next/navigation";
import type { Viewport } from "next";

import { AudienceLandingSections } from "@/components/landing/AudienceLandingSections";
import { MarketingHeroOverlay } from "@/components/landing/MarketingHeroOverlay";
import { MarketingPageLayout } from "@/components/landing/MarketingPageLayout";
import { getProfileDestination, isOnboardingComplete } from "@/lib/auth/profile";
import { communityPageContent } from "@/lib/marketing/marketing-pages";
import { homeHeroVideo } from "@/lib/marketing/hero-video";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";

export const viewport: Viewport = {
  themeColor: MARKETING_DARK.bg,
  colorScheme: "dark",
  viewportFit: "cover",
};

export default async function CommunityPage() {
  const profile = await getCurrentUserProfile();
  if (profile && isOnboardingComplete(profile)) {
    redirect(getProfileDestination(profile));
  }

  return (
    <MarketingPageLayout
      activeTab="community"
      cleanHero
      darkTheme
      heroVideo={homeHeroVideo}
      hero={<MarketingHeroOverlay content={communityPageContent} dark />}
    >
      <AudienceLandingSections content={communityPageContent} dark />
    </MarketingPageLayout>
  );
}
