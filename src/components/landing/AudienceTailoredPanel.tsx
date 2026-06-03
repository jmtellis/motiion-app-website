"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import {
  audienceOrder,
  audienceProfiles,
  type AudienceKey,
} from "@/lib/marketing/homepage-content";

function getNextAudience(current: AudienceKey, direction: "next" | "prev") {
  const currentIndex = audienceOrder.indexOf(current);
  if (currentIndex < 0) return audienceOrder[0];
  if (direction === "next") {
    return audienceOrder[(currentIndex + 1) % audienceOrder.length];
  }
  return audienceOrder[(currentIndex - 1 + audienceOrder.length) % audienceOrder.length];
}

export function AudienceTailoredPanel() {
  const [selectedAudience, setSelectedAudience] = useState<AudienceKey>("dancers");
  const reduceMotion = useReducedMotion();
  const selectedProfile = useMemo(() => audienceProfiles[selectedAudience], [selectedAudience]);

  const panelTransition = reduceMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut" as const };

  return (
    <section id="audiences" className="space-y-8">
      <div className="space-y-4">
        <p className="type-eyebrow text-[var(--accent)]">Choose your role</p>
        <div
          role="tablist"
          aria-label="Audience types"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          {audienceOrder.map((audienceKey) => {
            const audience = audienceProfiles[audienceKey];
            const isSelected = selectedAudience === audienceKey;
            return (
              <button
                key={audienceKey}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedAudience(audienceKey)}
                className={`relative overflow-hidden rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  isSelected
                    ? "border-[var(--ink)] bg-white text-[var(--ink)] shadow-[0_8px_24px_rgba(17,17,17,0.08)]"
                    : "border-[var(--line)] bg-white/70 text-[var(--ink-soft)] hover:border-[#d6d4ce] hover:bg-white"
                }`}
              >
                {audience.selectorLabel}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={selectedProfile.key}
          role="tabpanel"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
          transition={panelTransition}
          className="space-y-6"
        >
          <div className="rounded-2xl border border-[var(--line)] bg-white p-8 shadow-[0_12px_40px_rgba(17,17,17,0.06)]">
            <p className="text-xs font-semibold tracking-[0.2em] text-[var(--ink-soft)] uppercase">
              For {selectedProfile.label}
            </p>
            <h3 className="type-heading-1 mt-3 text-balance text-[var(--ink)]">
              {selectedProfile.headline}
            </h3>
            <p className="type-lead mt-4 max-w-3xl text-pretty text-[var(--ink-soft)]">{selectedProfile.summary}</p>
            <p className="type-body mt-3 max-w-3xl text-pretty text-[var(--ink-soft)]">
              {selectedProfile.valueStatement}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={selectedProfile.ctaPrimary.href} className="btn-primary">
                {selectedProfile.ctaPrimary.label}
              </a>
              <a href={selectedProfile.ctaSecondary.href} className="btn-outline">
                {selectedProfile.ctaSecondary.label}
              </a>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <InfoCard title="Top benefits" items={selectedProfile.benefits} />
            <InfoCard title="How it works" steps={selectedProfile.workflowSteps} ordered />
            <InfoCard title="Why teams trust this flow" items={selectedProfile.trustPoints} boxed />
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-[var(--ink-soft)] uppercase">
              Common questions from {selectedProfile.label}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {selectedProfile.faq.map((item) => (
                <div key={item.question} className="rounded-2xl border border-[var(--line)] bg-white p-6">
                  <h4 className="text-lg font-semibold text-[var(--ink)]">{item.question}</h4>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function InfoCard({
  title,
  items,
  steps,
  ordered,
  boxed,
}: {
  title: string;
  items?: string[];
  steps?: string[];
  ordered?: boolean;
  boxed?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.04)]">
      <h4 className="text-lg font-semibold text-[var(--ink)]">{title}</h4>
      {items ? (
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--ink-soft)]">
          {items.map((item) => (
            <li key={item} className={`flex gap-2 ${boxed ? "rounded-xl border border-[var(--line)] bg-[var(--tone)] px-3 py-2" : ""}`}>
              {!boxed ? (
                <span aria-hidden className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              ) : null}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {steps ? (
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--ink-soft)]">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3">
              {ordered ? (
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--line)] text-xs font-semibold">
                  {index + 1}
                </span>
              ) : null}
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
