import { EditorialHeadline } from "@/components/landing/EditorialHeadline";
import { PillarSection, type PillarSurface } from "@/components/landing/PillarSection";
import { Reveal } from "@/components/landing/Reveal";
import { ScrollMarquee, ScrollMarqueeDivider } from "@/components/landing/ScrollMarquee";
import { SectionParallax, SectionTransition } from "@/components/landing/SectionTransition";
import { homeBrandStatementSection, homeHero, landingMarquees } from "@/lib/marketing/homepage-content";

const homePillarSurfaces: PillarSurface[] = ["dark", "dark", "dark"];

export function HomeLandingSections({
  dark = true,
  pillarHeadshots = [],
}: {
  dark?: boolean;
  pillarHeadshots?: string[];
}) {
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

      {homeHero.pillars.map((pillar, index) => (
        <PillarSection
          key={pillar.title}
          pillar={pillar}
          index={index}
          surface={homePillarSurfaces[index]}
          headshotStack={index === 0 ? pillarHeadshots : undefined}
        />
      ))}

      <SectionTransition
        id="brand-statement"
        variant="line-drift"
        className={`border-t ${
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

          <ScrollMarqueeDivider dark={dark} fade edge="top" className="mt-auto shrink-0">
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
