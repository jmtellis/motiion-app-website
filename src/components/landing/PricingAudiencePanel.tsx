"use client";
import { LandingAudienceProvider, useLandingAudience } from "./LandingAudienceContext";
import { LandingAudienceChoices } from "./LandingAudienceChoices";
import { AudiencePricingSection } from "./AudiencePricingSection";
import { talentPricingContent, industryPricingContent, communityPricingContent } from "@/lib/marketing/audience-pricing";
import type { MarketingTab } from "@/lib/marketing/marketing-pages";
function Plans() {
  const { audience } = useLandingAudience();
  const content = { talent: talentPricingContent, casting: industryPricingContent, community: communityPricingContent }[audience];
  const rows = audience === "community"
    ? [["Community access", "Standard", "Premium"], ["Classes & events", "Browse", "Enhanced"], ["People discovery", "Standard", "Enhanced"], ["Community updates", "Standard", "Priority"]]
    : [audience === "talent" ? ["Casting submissions", "5 total", "Unlimited"] : ["Published castings", "2 total", "Unlimited"], ["Headshots", "4", "10"], ["Profile videos", "Reel & slate", "All types"], ["Portfolio highlights", "2", "10"], ["Visuals per experience", "None", "3"], ...(audience === "talent" ? [["Profile matches", "Locked", "Unlocked"], ["Search listing", "Standard", "Priority"], ["Résumé PDF", "Locked", "Included"]] : [])];
  return <>
    <LandingAudienceChoices />
    <div id="landing-audience-panel" role="tabpanel" aria-labelledby={`landing-audience-choice-${audience}`} className="py-12">
      <AudiencePricingSection key={audience} content={content} dark />
      <section className="pricing-comparison" aria-label="Plan comparison">
        <h2>Compare features across plans</h2>
        <table><thead><tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col">{content.pro.name}</th></tr></thead>
          <tbody>{rows.map(([feature, free, pro]) => <tr key={feature}><th scope="row">{feature}</th><td>{free}</td><td>{pro}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  </>;
}
export function PricingAudiencePanel({ initial }: { initial: MarketingTab }) {
  return <LandingAudienceProvider initial={initial}><Plans /></LandingAudienceProvider>;
}
