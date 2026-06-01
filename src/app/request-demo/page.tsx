import { redirect } from "next/navigation";

import { DemoRequestForm } from "@/components/landing/DemoRequestForm";
import { MarketingPageLayout } from "@/components/landing/MarketingPageLayout";
import { SectionHeader } from "@/components/landing/SectionHeader";
import { isOnboardingComplete } from "@/lib/auth/profile";
import { demoPageContent } from "@/lib/marketing/marketing-pages";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getHeroHeadshotImages } from "@/lib/search/search-profiles";

export default async function RequestDemoPage() {
  const profile = await getCurrentUserProfile();
  if (profile && isOnboardingComplete(profile)) {
    redirect("/home");
  }

  const headshotImages = await getHeroHeadshotImages();

  return (
    <MarketingPageLayout
      activeTab="demo"
      headshotImages={headshotImages}
      hero={
        <div className="animate-enter mx-auto grid w-full max-w-6xl items-center gap-10 px-6 lg:grid-cols-2 lg:gap-14 lg:px-10">
          <SectionHeader
            titleAs="h1"
            eyebrow={demoPageContent.eyebrow}
            title={demoPageContent.headline}
            description={demoPageContent.summary}
          />
          <DemoRequestForm compact />
        </div>
      }
    />
  );
}
