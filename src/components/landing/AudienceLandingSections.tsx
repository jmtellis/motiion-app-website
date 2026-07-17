import type { ReactNode } from "react";

import { AudienceBenefitsShowcase } from "@/components/landing/AudienceBenefitsShowcase";
import { AudiencePricingSection } from "@/components/landing/AudiencePricingSection";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { Reveal } from "@/components/landing/Reveal";
import type { AudiencePageContent } from "@/lib/marketing/marketing-pages";

import "./audience-landing-sections.css";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function audienceSectionSurface(altBackground: boolean, dark: boolean) {
  if (dark) {
    return altBackground
      ? "border-[#262626] bg-[var(--graphite)]"
      : "border-[#262626] bg-[var(--stage-black)]";
  }
  return altBackground ? "border-[var(--line)] bg-[var(--tone)]" : "border-[var(--line)] bg-[var(--paper)]";
}

function AudienceSection({
  id,
  altBackground,
  dark,
  children,
  innerClassName,
}: {
  id: string;
  altBackground: boolean;
  dark: boolean;
  children: ReactNode;
  innerClassName?: string;
}) {
  return (
    <section id={id} className={cn("w-full border-t", audienceSectionSurface(altBackground, dark))}>
      <div
        className={cn(
          "mx-auto w-full max-w-6xl px-6 py-16 lg:px-10 lg:py-20",
          innerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function AudienceLandingSections({
  content,
  dark = false,
}: {
  content: AudiencePageContent;
  dark?: boolean;
}) {
  return (
    <>
      <AudienceSection id="benefits" altBackground={false} dark={dark}>
        <Reveal amount={0.18} distance={24} className="w-full">
          <AudienceBenefitsShowcase
            title={content.benefitsTitle}
            benefits={content.benefits}
            dark={dark}
          />
        </Reveal>
      </AudienceSection>

      <AudienceSection id="workflow" altBackground={true} dark={dark}>
        <Reveal amount={0.16} distance={22} className="w-full">
          <div className="ui-split-scroll ui-split-scroll--sticky-left">
            <div>
              <h2
                className={cn(
                  "type-heading-1 text-balance",
                  dark ? "text-on-dark-primary" : "text-[var(--ink)]",
                )}
              >
                {content.workflowTitle}
              </h2>
              <ul className="mt-6 space-y-4">
                {content.workflowSteps.map((step, index) => (
                  <li key={step} className="flex gap-4">
                    <span
                      className={cn(
                        "inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-chip)] border text-sm font-semibold",
                        dark
                          ? "border-[#262626] bg-[#1e1e1e] font-mono text-on-dark-primary"
                          : "border-[var(--line)] bg-white text-[var(--ink)]",
                      )}
                    >
                      {index + 1}
                    </span>
                    <p
                      className={cn(
                        "type-body pt-1",
                        dark ? "text-on-dark-secondary" : "text-[var(--ink-soft)]",
                      )}
                    >
                      {step}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            {content.workflowAside === "blank" ? (
              <div
                className={cn("audience-workflow__visual", dark && "audience-workflow__visual--dark")}
                aria-hidden
              />
            ) : (
              <div className={cn("ui-panel p-5", dark && "ui-panel-dark")}>
                <h3
                  className={cn(
                    "text-lg font-semibold",
                    dark ? "text-on-dark-primary" : "text-[var(--ink)]",
                  )}
                >
                  {content.trustTitle}
                </h3>
                <ul className="mt-4 space-y-3">
                  {content.trustPoints.map((point) => (
                    <li
                      key={point}
                      className={cn(
                        "border-l-2 border-[var(--accent)] pl-4 text-sm leading-relaxed",
                        dark ? "text-on-dark-secondary" : "text-[var(--ink-soft)]",
                      )}
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Reveal>
      </AudienceSection>

      <AudienceSection id="faq" altBackground={false} dark={dark} innerClassName="max-w-3xl">
        <Reveal amount={0.14} distance={20} className="w-full">
          <h2
            className={cn(
              "text-center text-balance text-2xl font-semibold tracking-tight md:text-3xl lg:text-4xl",
              dark ? "text-on-dark-primary" : "text-[var(--ink)]",
            )}
          >
            Common questions
          </h2>
          <div className="mt-8">
            <FAQAccordion items={content.faq} dark={dark} />
          </div>
        </Reveal>
      </AudienceSection>

      <AudienceSection id="pricing" altBackground={true} dark={dark}>
        <Reveal amount={0.16} distance={28} className="w-full">
          <AudiencePricingSection content={content.pricing} dark={dark} />
        </Reveal>
      </AudienceSection>
    </>
  );
}
