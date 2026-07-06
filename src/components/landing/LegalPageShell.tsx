import { LegalPageHero } from "@/components/landing/LegalPageHero";
import { LegalPageSections } from "@/components/landing/LegalPageSections";
import { MarketingPageLayout } from "@/components/landing/MarketingPageLayout";
import type { LegalPageSection } from "@/lib/marketing/legal-page";

export function LegalPageShell({
  title,
  updatedAt,
  intro,
  sections,
  contactIntro,
}: {
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalPageSection[];
  contactIntro: string;
}) {
  return (
    <MarketingPageLayout
      activeTab={null}
      homeHeader
      darkTheme
      cleanHero
      heroSize="compact"
      hero={<LegalPageHero title={title} updatedAt={updatedAt} intro={intro} />}
    >
      <LegalPageSections sections={sections} contactIntro={contactIntro} />
    </MarketingPageLayout>
  );
}
