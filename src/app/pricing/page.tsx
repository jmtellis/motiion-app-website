import type { Metadata } from "next";
import { HomeMarketingShell } from "@/components/landing/HomeMarketingShell";
import { HomeMarketingHeader } from "@/components/landing/HomeMarketingHeader";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import { Footer } from "@/components/landing/Footer";
import { PricingAudiencePanel } from "@/components/landing/PricingAudiencePanel";
import { parseAudienceParam } from "@/lib/marketing/marketing-pages";
import "@/components/landing/home-split-landing.css";
import "@/components/landing/pricing-page.css";

export const metadata: Metadata = { title: "Pricing", alternates: { canonical: "/pricing" }, description: "Compare Motiion plans for talent and industry professionals." };

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ audience?: string }> }) {
  const params = await searchParams;
  return <HomeMarketingShell>
    <MarketingBodySurface dark />
    <HomeMarketingHeader darkTheme overlayHero />
    <main id="main-content" className="pricing-page">
      <div className="mkt-container">
        <h1 className="mkt-heading text-center">Pricing</h1>
        <p className="mkt-lead text-center mt-4">Start free. Find the plan for your next move.</p>
        <PricingAudiencePanel initial={params.audience ? parseAudienceParam(params.audience) : "talent"} />
      </div>
    </main>
    <Footer />
  </HomeMarketingShell>;
}
