import type { Metadata } from "next";
import { HomeMarketingShell } from "@/components/landing/HomeMarketingShell";
import { HomeMarketingHeader } from "@/components/landing/HomeMarketingHeader";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import { Footer } from "@/components/landing/Footer";
import { AudiencePricingSection } from "@/components/landing/AudiencePricingSection";
import { talentPageContent, castingPageContent } from "@/lib/marketing/marketing-pages";
import "@/components/landing/home-split-landing.css";

export const metadata: Metadata = { title: "Pricing | Motiion", description: "Compare Motiion plans for talent and industry professionals." };

export default function PricingPage() {
  return <HomeMarketingShell>
    <MarketingBodySurface dark />
    <HomeMarketingHeader darkTheme overlayHero />
    <main id="main-content" className="bg-[#111] text-white pt-32 pb-16">
      <div className="mkt-container">
        <h1 className="mkt-heading text-center">Plans for your next move.</h1>
        <p className="mkt-lead text-center mt-4">Choose the tools that fit how you use Motiion.</p>
        {[{ label: "Talent", content: talentPageContent }, { label: "Industry", content: castingPageContent }].map(({ label, content }) => <section key={label} className="py-16" aria-label={`${label} pricing`}>
          {content.pricing && <AudiencePricingSection content={{ ...content.pricing, title: `${label} plans` }} dark />}
        </section>)}
      </div>
    </main>
    <Footer />
  </HomeMarketingShell>;
}
