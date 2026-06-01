import { redirect } from "next/navigation";

import { HomeLandingHero } from "@/components/landing/HomeLandingHero";
import { HomeLandingSections } from "@/components/landing/HomeLandingSections";
import { MarketingPageLayout } from "@/components/landing/MarketingPageLayout";
import { isOnboardingComplete } from "@/lib/auth/profile";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getHeroHeadshotImages } from "@/lib/search/search-profiles";

export default async function Home() {
  const profile = await getCurrentUserProfile();
  if (profile && isOnboardingComplete(profile)) {
    redirect("/home");
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
