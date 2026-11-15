import type { Metadata } from "next";
import Link from "next/link";
import { HomeMarketingShell } from "@/components/landing/HomeMarketingShell";
import { HomeMarketingHeader } from "@/components/landing/HomeMarketingHeader";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import { Footer } from "@/components/landing/Footer";
import { castingServices, projectInquiry, projectPlans } from "@/lib/marketing/project-offers";
import "@/components/landing/home-split-landing.css";
import "@/components/landing/pricing-page.css";

const description = "Project pricing and monthly plans for industry professionals discovering, casting, and managing dancers. Managed casting services from $3,500.";
export const metadata: Metadata = { title: "Pricing", description, alternates: { canonical: "/pricing" } };

export default function PricingPage() {
  return <HomeMarketingShell>
    <MarketingBodySurface dark />
    <HomeMarketingHeader darkTheme overlayHero />
    <main id="main-content" className="pricing-page">
      <div className="mkt-container">
        <h1 className="mkt-heading text-center">Products and Services</h1>
        <p className="mkt-lead text-center mt-4">We’ll help you find dancers, create a casting, review submissions, schedule auditions, and coordinate your cast.</p>
        <div className="project-plan-grid">
          {projectPlans.map(plan => <section key={plan.name} className={`project-plan${plan.name === "Studio" ? " project-plan--featured" : ""}`}>
            <h2>{plan.name}</h2>
            <p className="project-price">{plan.price}<span>{plan.period}</span></p>
            <Link className="btn-hero-pill btn-hero-pill-accent" href={`/checkout?plan=${plan.id}`}>Get started</Link>
            <ul>{plan.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
          </section>)}
        </div>
        <p className="project-pricing-note">Payment is required before creating a project, including a private draft. The project owner’s plan covers invited teammates within its team limit. All plans include casting and cast coordination tools. Prices in USD. No fees per submission review or dancer confirmation. </p>
        <div className="project-options">
          <p><Link href="/signup?account_type=lookingForTalent">Explore free →</Link> Browse dancers before choosing a plan.</p>
          <p><a href={projectInquiry("Enterprise plan")}>Enterprise →</a> Custom capacity for larger teams.</p>
        </div>
        <section className="project-services" id="services" aria-labelledby="services-title">
          <h2 id="services-title">Hire us to run your casting</h2>
          <p>Project platform access is included. Each service is quoted to your production’s scope.</p>
          <div className="project-service-list">
            {castingServices.map(service => <section className="project-service-row" key={service.name}>
              <div><h3>{service.name}</h3><p>{service.description}</p></div>
              <div className="project-service-cost"><p>From {service.price}<span>per project</span></p><a href={projectInquiry(service.name)}>Request a quote →</a></div>
            </section>)}
            <section className="project-service-row" id="digital-playbills">
              <div><h3>Digital playbill</h3><p>A shareable program with dancer bios, creative credits, and production details. Add it to any project.</p></div>
              <div className="project-service-cost"><p>Custom quote</p><a href={projectInquiry("Digital playbill for my production")}>Request a quote →</a></div>
            </section>
          </div>
        </section>
        <section className="project-faq" aria-labelledby="pricing-questions">
          <h2 id="pricing-questions">Pricing questions</h2>
          <details><summary>What counts as a project?</summary><p>One production with a shared brief and schedule, including its dancer roles and callbacks. A separate production is a new project.</p></details>
          <details><summary>How do active projects work?</summary><p>Monthly plans cover projects running at the same time. Wrap one to free a slot. Completed projects stay readable and exportable; reopening one uses a slot.</p></details>
          <details><summary>Need more time or another project?</summary><p>Monthly subscribers can add a $199 Project Pass for temporary overflow. Each pass covers one project for 90 days from activation.</p></details>
          <details><summary>What does a service quote cover?</summary><p>We agree on roles, review volume, audition days, callbacks, staffing, and delivery dates upfront. Venue, travel, external crew, dancer pay, and payroll costs are separate where applicable. Ongoing rehearsal or performance support is quoted separately. Existing subscribers receive a platform credit.</p></details>
          <details><summary>Are there submission or media limits?</summary><p>Normal submission and review activity is included. Exceptional submission volume and media requirements are quoted before your project starts.</p></details>
        </section>
      </div>
    </main>
    <Footer />
  </HomeMarketingShell>;
}
