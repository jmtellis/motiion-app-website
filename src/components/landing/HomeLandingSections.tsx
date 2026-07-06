import { EditorialHeadline } from "@/components/landing/EditorialHeadline";
import { FeatureCarousel } from "@/components/landing/FeatureCarousel";
import { HomeHeroCtas } from "@/components/landing/HomeHeroCtas";
import { HomeSignupSection } from "@/components/landing/HomeSignupSection";
import { Reveal } from "@/components/landing/Reveal";
import { SectionTransition } from "@/components/landing/SectionTransition";
import {
  homeBrandStatementSection,
  homeHero,
  homePillarsSection,
  homepageIntro,
} from "@/lib/marketing/homepage-content";

export function HomeLandingHero({ dark = true }: { dark?: boolean }) {
  void dark;

  return (
    <div className="animate-enter flex w-full flex-col items-center gap-6 px-6 text-center sm:gap-8">
      <p className="type-eyebrow text-on-dark-tertiary">{homepageIntro.eyebrow}</p>
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
          titleParts: pillar.titleParts ?? [{ text: pillar.title, emphasis: true }],
          description: pillar.description,
          image: pillar.image,
        }))}
      />

      <SectionTransition
        id="brand-statement"
        variant="line-drift"
        className="marketing-viewport-section marketing-viewport-section--center relative z-[1] border-t border-[#262626] bg-[var(--stage-black)]"
      >
        <Reveal amount={0.18} distance={28}>
          <EditorialHeadline
            parts={homeBrandStatementSection.headlineParts}
            as="h2"
            size="display-xl"
            dark={dark}
            className="mx-auto max-w-4xl px-6 text-center sm:px-10"
          />
        </Reveal>
      </SectionTransition>

      <HomeSignupSection />
    </>
  );
}
