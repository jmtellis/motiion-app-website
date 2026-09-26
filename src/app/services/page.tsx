import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { HomeMarketingShell } from "@/components/landing/HomeMarketingShell";
import { HomeMarketingHeader } from "@/components/landing/HomeMarketingHeader";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import { Footer } from "@/components/landing/Footer";
import { CONTACT_HREF } from "@/lib/marketing/footer-links";
import "@/components/landing/home-split-landing.css";
import "./services.css";

const description = "Live event support for talent and choreographers, from check-in and rehearsal coordination to digital playbills. Audition and talent profile support coming soon.";
export const metadata: Metadata = {
  title: "Services",
  description,
  alternates: { canonical: "/services" },
  openGraph: { title: "Services · Motiion", description, url: "/services" },
  twitter: { title: "Services · Motiion", description },
};

export default function ServicesPage() {
  return (
    <HomeMarketingShell>
      <MarketingBodySurface dark />
      <HomeMarketingHeader darkTheme overlayHero wordmarkHeader />
      <main id="main-content" className="services-page">
        <div className="mkt-container">
          <h1>Services</h1>
          <section className="services-live" id="live-events" aria-labelledby="live-events-title">
            <div>
              <h2 id="live-events-title">Live Event Support</h2>
              <p className="services-intro">Bring your work to the stage. We’ll help bring the details together.</p>
              <p>Support for talent and choreographers presenting their work, with clear coordination for the people, schedules, and performance information behind your event.</p>
              <a className="btn-hero-pill btn-hero-pill-accent" href={`${CONTACT_HREF}?subject=${encodeURIComponent("Motiion services: Live event support")}`}>
                Discuss your event <ArrowUpRight size={17} aria-hidden />
              </a>
            </div>
            <ul className="services-details">
              <li><h3>Check-in & coordination</h3><p>Organize event check-in, arrival information, and coordination for talent, choreographers, and collaborators.</p></li>
              <li><h3>Schedules & tech rehearsals</h3><p>Bring call times, performance schedules, and tech rehearsal details into a clear plan with your venue and technical team.</p></li>
              <li><h3>Digital playbills</h3><p>Introduce the work and the people behind it with a digital playbill featuring the running order, work descriptions, and performer and choreographer credits.</p></li>
            </ul>
          </section>
          <div className="services-upcoming">
            <section id="auditions" aria-labelledby="auditions-title">
              <h2 id="auditions-title">Audition Management <span>Coming soon</span></h2>
              <p>Help with audition check-in, participant scheduling, confirmations, reminders, and updates, so your team can focus on the room.</p>
            </section>
            <section id="talent-profiles" aria-labelledby="talent-profiles-title">
              <h2 id="talent-profiles-title">Talent Profile Support <span>Coming soon</span></h2>
              <p>A consultation, personalized plan, and resources to help organize your credits and build a complete professional profile, with Motiion’s planned advanced search in mind.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </HomeMarketingShell>
  );
}
