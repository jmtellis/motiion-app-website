import { redirect } from "next/navigation";
import type { Viewport } from "next";

import { AudienceLandingSections } from "@/components/landing/AudienceLandingSections";
import { MarketingHeroOverlay } from "@/components/landing/MarketingHeroOverlay";
import { TalentHeroCtas } from "@/components/landing/TalentHeroCtas";
import { MarketingPageLayout } from "@/components/landing/MarketingPageLayout";
import { getProfileDestination, isOnboardingComplete } from "@/lib/auth/profile";
import { talentPageContent } from "@/lib/marketing/marketing-pages";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";

export const viewport: Viewport = {
  themeColor: MARKETING_DARK.bg,
  colorScheme: "dark",
};

export default async function ForTalentPage() {
  const profile = await getCurrentUserProfile();
  if (profile && isOnboardingComplete(profile)) {
    redirect(getProfileDestination(profile));
  }

  return (
    <MarketingPageLayout
      activeTab="talent"
      cleanHero
      darkTheme
      hero={
        <MarketingHeroOverlay content={talentPageContent} dark>
          <TalentHeroCtas dark />
        </MarketingHeroOverlay>
      }
    >
      <AudienceLandingSections content={talentPageContent} dark />
    </MarketingPageLayout>
  );
}
