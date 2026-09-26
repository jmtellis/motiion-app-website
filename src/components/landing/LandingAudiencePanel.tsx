"use client";

import { LandingAudienceChoices } from "./LandingAudienceChoices";
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

export function LandingAudiencePanel() {
  const { audience } = useLandingAudience();
  const segment = useLandingAudienceContent();
  const reduceMotion = useReducedMotion();

  return (
    <div className="landing-audience-panel marketing-atmosphere-band">
      <LandingAudienceChoices />
      {/* A keyed fade-in rather than AnimatePresence: the incoming audience is
          in the DOM immediately, so switching never leaves a blank gap. */}
      <motion.div
        key={audience}
        id={LANDING_AUDIENCE_PANEL_ID}
        role="tabpanel"
        aria-labelledby={`landing-audience-choice-${audience}`}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <section
          id={LANDING_AUDIENCE_TABS_ID}
          className="landing-audience-intro"
          aria-label={segment.label}
        >
          <div className="landing-audience-intro__inner">
            <p className="mkt-lead landing-audience-intro__summary">{segment.content.summary}</p>
          </div>
        </section>

        <AudienceLandingSections
          content={segment.content}
          dark
          showPricing={false}
          illustratedBenefits
          afterBenefits={audience === "casting" ? <TalentNavigatorPreview /> : null}
          afterWorkflow={audience === "talent" ? <TalentCredentialSection /> : null}
          featureShowcase={audience === "talent" ? <TalentFeatureShowcase /> : undefined}
        />
      </motion.div>
    </div>
  );
}
