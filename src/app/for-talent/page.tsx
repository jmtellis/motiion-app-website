import { redirect } from "next/navigation";

import { AudienceLandingSections } from "@/components/landing/AudienceLandingSections";
import { MarketingHeroOverlay } from "@/components/landing/MarketingHeroOverlay";
import { MarketingPageLayout } from "@/components/landing/MarketingPageLayout";
import { isOnboardingComplete } from "@/lib/auth/profile";
import { talentPageContent } from "@/lib/marketing/marketing-pages";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getHeroHeadshotImages } from "@/lib/search/search-profiles";

export default async function ForTalentPage() {
  const profile = await getCurrentUserProfile();
  if (profile && isOnboardingComplete(profile)) {
    redirect("/home");
  }

  const headshotImages = await getHeroHeadshotImages();

  return (
    <MarketingPageLayout
      activeTab="talent"
      headshotImages={headshotImages}
      hero={<MarketingHeroOverlay content={talentPageContent} />}
    >
      <AudienceLandingSections content={talentPageContent} />
    </MarketingPageLayout>
  );
}
