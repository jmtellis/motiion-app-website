"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { industryPricingContent, type PricingPlan } from "@/lib/marketing/audience-pricing";

import "@/components/landing/audience-pricing.css";

const STEP_EASE = [0.22, 1, 0.36, 1] as const;

const freePlan: PricingPlan = {
  ...industryPricingContent.free,
  description: "Browse talent and explore your workspace.",
  cta: { label: "Continue free", href: "#" },
};

const proPlan: PricingPlan = {
  ...industryPricingContent.pro,
  description: "60 days free, then $200/month. Card required — cancel anytime.",
  cta: { label: "Start 60-day free trial", href: "#" },
};

function PlanCard({
  plan,
  onSelect,
  pending,
  pendingLabel,
}: {
  plan: PricingPlan;
  onSelect: () => void;
  pending: boolean;
  pendingLabel: string;
}) {
  return (
    <article
      className={`audience-pricing__plan${plan.highlighted ? " audience-pricing__plan--highlighted" : ""}`}
    >
      <div className="audience-pricing__plan-header">
        <p className="audience-pricing__plan-name">{plan.name}</p>
        <div className="audience-pricing__plan-price-row">
          <span className="audience-pricing__plan-price">{plan.price}</span>
          {plan.period ? <span className="audience-pricing__plan-period">{plan.period}</span> : null}
        </div>
        <p className="audience-pricing__plan-description">{plan.description}</p>
      </div>

      <ul className="audience-pricing__features">
        {plan.features.map((feature) => (
          <li key={feature} className="audience-pricing__feature">
            <Check className="audience-pricing__feature-icon size-4 shrink-0" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`audience-pricing__cta ${
          plan.highlighted ? "btn-hero-pill btn-hero-pill-accent" : "btn-hero-pill btn-hero-pill-ghost"
        }`}
        onClick={onSelect}
        disabled={pending}
      >
        {pending ? pendingLabel : plan.cta.label}
      </button>
    </article>
  );
}

export function IndustryOnboardingCompletePricing({
  title,
  subtitle,
  error,
  pending,
  pendingMode,
  onContinueFree,
  onStartTrial,
}: {
  title: string;
  subtitle?: string;
  error?: string | null;
  pending: boolean;
  pendingMode: "free" | "trial" | null;
  onContinueFree: () => void;
  onStartTrial: () => void;
}) {
  const reduceMotion = useReducedMotion();

  const containerVariants = {
    initial: {},
    animate: {
      transition: reduceMotion
        ? { staggerChildren: 0, delayChildren: 0 }
        : { staggerChildren: 0.09, delayChildren: 0.04 },
    },
  };

  const itemVariants = {
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, x: 36 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: reduceMotion ? 0.12 : 0.32, ease: STEP_EASE },
    },
  };

  return (
    <motion.div
      className="industry-onboarding-complete__pricing audience-pricing audience-pricing--dark"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <motion.div className="industry-onboarding-complete__copy" variants={itemVariants}>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
        {error ? <div className="signup-split-error mt-4">{error}</div> : null}
      </motion.div>

      <motion.div className="audience-pricing__grid" variants={itemVariants}>
        <PlanCard
          plan={freePlan}
          onSelect={onContinueFree}
          pending={pending && pendingMode === "free"}
          pendingLabel="Saving…"
        />
        <PlanCard
          plan={proPlan}
          onSelect={onStartTrial}
          pending={pending && pendingMode === "trial"}
          pendingLabel="Redirecting…"
        />
      </motion.div>
    </motion.div>
  );
}
