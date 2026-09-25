"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { HeroEventTrack } from "@/components/landing/HeroEventTrack";
import type { HeroEventCard } from "@/lib/marketing/hero-events";

import "./home-split-landing.css";

export function HomeSplitLanding({ events }: { events: HeroEventCard[] }) {
  const reduceMotion = useReducedMotion();
  const entrance = { duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <section className="home-split" aria-label="Motiion">
      <div className="home-split__stage" aria-hidden />
      <HeroEventTrack cards={events} />
      <div className="home-split__layout">
        <div className="home-split__content">
          <motion.div
            className="home-split__copy"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={entrance}
          >
            <p className="home-split__eyebrow">Talent. Industry. Community.</p>
            <h1 className="home-split__headline">
              Built to power
              <br />
              the <em>dance</em> industry.
            </h1>
            <p className="home-split__subtext">
              Discover the talent, work, and opportunities that bring dance to life. Motiion connects
              professional profiles, industry tools, and community experiences in one place.
            </p>
            <div className="home-split__ctas">
              <Link href="/signup" className="mkt-btn mkt-btn--primary home-split__cta">
                Create account
                <ArrowRight className="home-split__cta-icon" aria-hidden />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
