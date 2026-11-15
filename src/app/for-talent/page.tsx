import type { Metadata } from "next";
import Link from "next/link";
import { HomeMarketingShell } from "@/components/landing/HomeMarketingShell";
import { HomeMarketingHeader } from "@/components/landing/HomeMarketingHeader";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import { Footer } from "@/components/landing/Footer";
import { LandingAudiencePanel } from "@/components/landing/LandingAudiencePanel";
import "@/components/landing/home-split-landing.css";

export const metadata: Metadata = {
  title: "For talent", description: "Build your portfolio, get discovered, and find your next opportunity with Motiion.",
  alternates: { canonical: "/for-talent" },
};
export default function ForTalentPage() {
  return <HomeMarketingShell><MarketingBodySurface dark /><HomeMarketingHeader darkTheme overlayHero activeTab="talent" />
    <main id="main-content">
      <section className="mkt-container text-center" style={{ paddingTop: 150, paddingBottom: 64 }}>
        <p className="mkt-eyebrow text-neutral-400">For dancers & choreographers</p>
        <h1 className="mkt-heading mt-4">Your next opportunity starts with your work.</h1>
        <p className="mkt-lead mx-auto mt-6 max-w-xl">One professional profile for your portfolio, experience, and the people who need to see them.</p>
        <Link href="/signup?account_type=talent" className="mkt-btn mkt-btn--primary mt-8">Create a talent account</Link>
        <p className="mt-6"><Link href="/" className="underline text-neutral-300">Looking to hire talent?</Link></p>
      </section>
      <LandingAudiencePanel audience="talent" />
    </main><Footer /></HomeMarketingShell>;
}
