import { EditorialHeadline } from "@/components/landing/EditorialHeadline";
import { FeatureWheelStack } from "@/components/landing/FeatureWheelStack";
import { HomeHeroCtas } from "@/components/landing/HomeHeroCtas";
import { TalentNavigatorPreview } from "@/components/landing/TalentNavigatorPreview";
import { Reveal } from "@/components/landing/Reveal";
import { SectionParallax, SectionTransition } from "@/components/landing/SectionTransition";
import { homeBrandStatementSection, homeHero, homepageIntro } from "@/lib/marketing/homepage-content";

export function HomeLandingHero({ dark = true }: { dark?: boolean }) {
  void dark;

  return (
    <div className="animate-enter flex w-full flex-col items-center gap-12 px-6 text-center sm:gap-14">
      <div className="flex w-full max-w-3xl flex-col items-center gap-6">
        <p className="type-eyebrow text-on-dark-tertiary">{homepageIntro.eyebrow}</p>
        <EditorialHeadline
          parts={homeHero.headline.parts}
          as="h1"
          size="display"
          dark
          className="max-w-3xl"
        />
        <p className="type-lead max-w-2xl text-pretty text-on-dark-secondary">
          {homeHero.subtext}
        </p>
        <HomeHeroCtas dark />
      </div>

      <div className="w-full max-w-4xl">
        <div className="marketing-hero-panel">
          <TalentNavigatorPreview />
        </div>
      </div>
    </div>
  );
}

export function HomeLandingSections({ dark = true }: { dark?: boolean }) {
  return (
    <>
      <FeatureWheelStack
        dark={dark}
        items={homeHero.pillars.map((pillar, index) => ({
          id: `solution-${index + 1}`,
          titleParts: pillar.titleParts ?? [{ text: pillar.title, emphasis: true }],
          description: pillar.description,
          image: pillar.image,
        }))}
      />

      <SectionTransition
        id="brand-statement"
        variant="line-drift"
        className="relative z-[1] border-t border-[#262626] bg-[var(--stage-black)]"
      >
        <div className="flex min-h-[70svh] flex-col">
          <div className="flex flex-1 items-center justify-center px-6 py-24 sm:px-10 sm:py-32">
            <SectionParallax speed={0.6} className="mx-auto w-full max-w-4xl text-center">
              <Reveal amount={0.18} distance={28}>
                <EditorialHeadline
                  parts={homeBrandStatementSection.headlineParts}
                  as="h2"
                  size="display-xl"
                  dark={dark}
                />
              </Reveal>
            </SectionParallax>
          </div>
        </div>
      </SectionTransition>

      <section
        id="signup"
        className="relative border-t border-[#262626] bg-[var(--stage-black)]"
      >
        <div className="marketing-hero-glow" aria-hidden />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center sm:py-32">
          <p className="type-eyebrow text-on-dark-tertiary">Join the beta</p>
          <h2 className="type-heading-1 text-balance text-on-dark-primary">
            Put your career in Motiion.
          </h2>
          <p className="type-lead max-w-xl text-pretty text-on-dark-secondary">
            We&apos;re onboarding the first wave of dancers, choreographers, and casting teams now.
          </p>
          <HomeHeroCtas dark />
        </div>
      </section>
    </>
  );
}
