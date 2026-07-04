import { redirect } from "next/navigation";
import type { Viewport } from "next";

import { AudienceLandingSections } from "@/components/landing/AudienceLandingSections";
import { MarketingHeroOverlay } from "@/components/landing/MarketingHeroOverlay";
import { MarketingPageLayout } from "@/components/landing/MarketingPageLayout";
import { getProfileDestination, isOnboardingComplete } from "@/lib/auth/profile";
import { castingPageContent } from "@/lib/marketing/marketing-pages";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";

export const viewport: Viewport = {
  themeColor: MARKETING_DARK.bg,
  colorScheme: "dark",
};

export default async function ForCastingPage() {
  const profile = await getCurrentUserProfile();
  if (profile && isOnboardingComplete(profile)) {
    redirect(getProfileDestination(profile));
  }

  return (
    <MarketingPageLayout
      activeTab="casting"
      cleanHero
      darkTheme
      hero={<MarketingHeroOverlay content={castingPageContent} dark />}
    >
      <AudienceLandingSections content={castingPageContent} dark />
    </MarketingPageLayout>
  );
}
