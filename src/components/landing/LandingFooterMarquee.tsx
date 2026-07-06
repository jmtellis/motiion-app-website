import { ScrollMarquee } from "@/components/landing/ScrollMarquee";
import { landingMarquees } from "@/lib/marketing/homepage-content";

export function LandingFooterMarquee() {
  return (
    <ScrollMarquee
      segments={landingMarquees.aboveFooter.segments}
      direction={landingMarquees.aboveFooter.direction}
      variant="outline"
      dark
      className="bg-[var(--stage-black)] py-3 md:py-4"
    />
  );
}
