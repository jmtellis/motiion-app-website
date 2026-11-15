"use client";

import Link from "next/link";
import { LandingAudienceProvider } from "./LandingAudienceContext";
import { TalentNavigatorPreview } from "./TalentNavigatorPreview";
import { TalentCredentialSection } from "./TalentCredentialSection";
import { TalentFeatureShowcase } from "./TalentFeatureShowcase";

import { motion, useReducedMotion } from "motion/react";

import { AudienceLandingSections } from "@/components/landing/AudienceLandingSections";
import {
  LANDING_AUDIENCE_PANEL_ID,
  LANDING_AUDIENCE_TABS_ID,
  useLandingAudience,
  useLandingAudienceContent,
} from "@/components/landing/LandingAudienceContext";

import "./landing-audience.css";

function AudiencePanel() {
  const { audience } = useLandingAudience();
  const segment = useLandingAudienceContent();
  const reduceMotion = useReducedMotion();

  return (
    <div className="landing-audience-panel marketing-atmosphere-band">

      {/* A keyed fade-in rather than AnimatePresence: the incoming audience is
          in the DOM immediately, so switching never leaves a blank gap. */}
      <motion.div
        key={audience}
        id={`${LANDING_AUDIENCE_PANEL_ID}-${audience}`}
        role="region"
        aria-label={segment.label}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <section
          id={`${LANDING_AUDIENCE_TABS_ID}-${audience}`}
          className="landing-audience-intro"
          aria-label={segment.label}
        >
          <div className="landing-audience-intro__inner">
            <h2 className="mkt-heading">{audience === "casting" ? "Find dancers and confirm your cast." : segment.content.headline}</h2>
            {audience === "talent" && <p className="mkt-lead landing-audience-intro__summary">
              {segment.content.summary.split(/(mobile app)/g).map((part, index) =>
                part === "mobile app" ? <strong key={index} className="font-semibold text-white">{part}</strong> : part,
              )}
            </p>}
          </div>
        </section>

        <AudienceLandingSections
          content={segment.content}
          idPrefix={`${audience}-`}
          dark
          showPricing={false}
          illustratedBenefits
          afterBenefits={audience === "casting" ? <TalentNavigatorPreview /> : null}
          afterWorkflow={<TalentCredentialSection audience={audience === "casting" ? "hiring" : "talent"} />}
          featureShowcase={audience === "talent" ? <TalentFeatureShowcase /> : <TalentInvitation />}
        />
      </motion.div>
    </div>
  );
}

function TalentInvitation() {
  return <section className="mkt-container mkt-section-y text-center" aria-labelledby="talent-invitation-heading">
      <h2 id="talent-invitation-heading" className="mkt-heading">Are you a dancer?</h2>
      <p className="mkt-lead mx-auto mt-4 max-w-xl">Put your work in front of the right people. Build your portfolio, get discovered, and find your next opportunity.</p>
      <Link href="/for-talent" className="mkt-btn mkt-btn--primary mt-8">Explore Motiion for dancers</Link>
    </section>;
}

export function LandingAudiencePanel({ audience = "casting" }: { audience?: "casting" | "talent" }) {
  return <LandingAudienceProvider initial={audience}><AudiencePanel /></LandingAudienceProvider>;
}
