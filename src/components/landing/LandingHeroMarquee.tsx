import { ScrollMarquee, ScrollMarqueeDivider } from "@/components/landing/ScrollMarquee";
import { landingMarquees } from "@/lib/marketing/homepage-content";

export function LandingHeroMarquee() {
  return (
    <ScrollMarqueeDivider
      dark
      edge="top"
      className="landing-hero-marquee relative z-[1] w-full shrink-0 bg-[var(--stage-black)]"
    >
      <ScrollMarquee
        segments={landingMarquees.belowHero.segments}
        direction={landingMarquees.belowHero.direction}
        variant="outline"
        dark
        className="bg-[var(--stage-black)] py-4 md:py-4"
      />
    </ScrollMarqueeDivider>
  );
}
