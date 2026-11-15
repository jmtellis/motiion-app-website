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
            <h1 className="home-split__headline">
              Great productions <span className="home-split__headline-phrase">require the right</span>
              <br />
              <em>movement</em>.
            </h1>
            <p className="home-split__subtext">
              Discover, cast, and manage dancers for your next project.
            </p>
            <div className="home-split__ctas">
              <Link href="/signup" className="mkt-btn mkt-btn--primary home-split__cta">
                Get started
                <ArrowRight className="home-split__cta-icon" aria-hidden />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
