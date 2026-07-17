import { BrandStatementSection } from "@/components/landing/BrandStatementSection";
import { EditorialHeadline } from "@/components/landing/EditorialHeadline";
import { FeatureCarousel } from "@/components/landing/FeatureCarousel";
import { HomeHeroCtas } from "@/components/landing/HomeHeroCtas";
import {
  homeBrandStatementSection,
  homeHero,
  homePillarsSection,
} from "@/lib/marketing/homepage-content";

export function HomeLandingHero({ dark = true }: { dark?: boolean }) {
  void dark;

  return (
    <div className="animate-enter flex w-full flex-col items-center gap-6 px-6 text-center sm:gap-8">
      <EditorialHeadline
        parts={homeHero.headline.parts}
        as="h1"
        size="display"
        dark
        className="max-w-3xl"
      />
      <p className="type-lead max-w-2xl text-pretty text-on-dark-secondary">{homeHero.subtext}</p>
      <HomeHeroCtas dark />
    </div>
  );
}

export function HomeLandingSections({ dark = true }: { dark?: boolean }) {
  return (
    <>
      <FeatureCarousel
        title={homePillarsSection.title}
        slides={homeHero.pillars.map((pillar, index) => ({
          id: `solution-${index + 1}`,
          title: pillar.title,
          titleParts: pillar.titleParts ?? [{ text: pillar.title, emphasis: true }],
          description: pillar.description,
          image: pillar.image,
        }))}
      />

      <BrandStatementSection
        headlineParts={homeBrandStatementSection.headlineParts}
        dark={dark}
      />
    </>
  );
}
