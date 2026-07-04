import { EditorialHeadline } from "@/components/landing/EditorialHeadline";
import { FeatureWheelStack } from "@/components/landing/FeatureWheelStack";
import { HomeHeroCtas } from "@/components/landing/HomeHeroCtas";
import { TalentNavigatorPreview } from "@/components/landing/TalentNavigatorPreview";
import { Reveal } from "@/components/landing/Reveal";
import { ScrollMarquee, ScrollMarqueeDivider } from "@/components/landing/ScrollMarquee";
import { SectionParallax, SectionTransition } from "@/components/landing/SectionTransition";
import { homeBrandStatementSection, homeHero, landingMarquees } from "@/lib/marketing/homepage-content";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function HomeLandingHero({ dark = false }: { dark?: boolean }) {
  const subtextClass = dark ? "text-on-dark-secondary" : "text-[var(--ink-soft)]";

  return (
    <div className="animate-enter flex w-full max-w-3xl flex-col items-center gap-8 px-6 text-center sm:gap-9">
      <div className="flex w-full flex-col items-center gap-5 sm:gap-6">
        <EditorialHeadline
          parts={homeHero.headline.parts}
          as="h1"
          size="display"
          dark={dark}
          className="max-w-3xl"
        />
        <p className={cn("type-lead max-w-2xl text-pretty", subtextClass)}>{homeHero.subtext}</p>
      </div>

      <HomeHeroCtas dark={dark} />
    </div>
  );
}

export function HomeLandingSections({ dark = true }: { dark?: boolean }) {
  return (
    <>
      <ScrollMarqueeDivider dark={dark} fade>
        <ScrollMarquee
          segments={landingMarquees.belowHero.segments}
          direction={landingMarquees.belowHero.direction}
          variant="outline"
          dark={dark}
          className="py-2 md:py-4"
        />
      </ScrollMarqueeDivider>

      <FeatureWheelStack
        dark={dark}
        items={homeHero.pillars.map((pillar, index) => ({
          id: `solution-${index + 1}`,
          titleParts: pillar.titleParts ?? [{ text: pillar.title, emphasis: true }],
          description: pillar.description,
          image: pillar.image,
          headshotStack:
            index === 0 ? <TalentNavigatorPreview /> : undefined,
        }))}
      />

      <SectionTransition
        id="brand-statement"
        variant="line-drift"
        className={`relative z-[1] border-t ${
          dark ? "border-white/10 bg-black" : "border-[var(--line)] bg-[var(--tone)]"
        }`}
      >
        <div className="flex min-h-svh flex-col">
          <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10 sm:py-16">
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

          <ScrollMarqueeDivider
            dark={dark}
            fade
            edge="top"
            className="mt-auto shrink-0 bg-black pb-12 sm:pb-16"
          >
            <ScrollMarquee
              segments={landingMarquees.belowBrandStatement.segments}
              direction={landingMarquees.belowBrandStatement.direction}
              variant="outline"
              dark={dark}
              className="py-2 md:py-4"
            />
          </ScrollMarqueeDivider>
        </div>
      </SectionTransition>
    </>
  );
}
