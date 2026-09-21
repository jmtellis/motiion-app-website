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
      ? "marketing-atmosphere-band border-[#262626]"
      : "marketing-atmosphere-clear border-[rgb(255_255_255/0.08)]";
  }
  return altBackground ? "border-[var(--line)] bg-[var(--tone)]" : "border-[var(--line)] bg-[var(--paper)]";
}

function AudienceSection({
  id,
  altBackground,
  dark,
  children,
  innerClassName,
  flush = false,
}: {
  id: string;
  altBackground: boolean;
  dark: boolean;
  children: ReactNode;
  innerClassName?: string;
  flush?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "audience-section w-full",
        !flush && "border-t",
        audienceSectionSurface(altBackground, dark),
      )}
    >
      <div className={cn("mkt-container mkt-section-y", innerClassName)}>{children}</div>
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
      <AudienceSection id="benefits" altBackground={false} dark={dark} flush>
        {/* One reveal per section — the cards inside no longer reveal again. */}
        <Reveal amount={0.15} distance={20}>
          <AudienceBenefitsShowcase
            title={content.benefitsTitle}
            benefits={content.benefits}
            dark={dark}
          />
        </Reveal>
      </AudienceSection>

      <AudienceSection id="workflow" altBackground={true} dark={dark}>
        <Reveal amount={0.15} distance={20}>
          <div className="audience-workflow">
            <div className="audience-workflow__steps">
              <h2 className={cn("mkt-heading", !dark && "text-[var(--ink)]")}>
                {content.workflowTitle}
              </h2>
              <ol className="audience-workflow__list">
                {content.workflowSteps.map((step, index) => (
                  <li key={step} className="audience-workflow__step">
                    <span
                      className={cn(
                        "audience-workflow__step-number",
                        !dark && "audience-workflow__step-number--light",
                      )}
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <p
                      className={cn(
                        "audience-workflow__step-copy",
                        !dark && "text-[var(--ink-soft)]",
                      )}
                    >
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Text-led aside rather than an empty decorative panel. */}
            <aside
              className={cn("audience-workflow__aside", !dark && "audience-workflow__aside--light")}
            >
              <h3
                className={cn("audience-workflow__aside-title", !dark && "text-[var(--ink)]")}
              >
                {content.trustTitle}
              </h3>
              <ul className="audience-workflow__aside-list">
                {content.trustPoints.map((point) => (
                  <li
                    key={point}
                    className={cn(
                      "audience-workflow__aside-item",
                      !dark && "text-[var(--ink-soft)]",
                    )}
                  >
                    {point}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </Reveal>
      </AudienceSection>

      <AudienceSection
        id="faq"
        altBackground={false}
        dark={dark}
        innerClassName="mkt-container--reading"
      >
        <Reveal amount={0.14} distance={18}>
          <h2 className={cn("mkt-heading text-center", !dark && "text-[var(--ink)]")}>
            Common questions
          </h2>
          <div className="mt-8">
            <FAQAccordion items={content.faq} dark={dark} />
          </div>
        </Reveal>
      </AudienceSection>

      {content.pricing ? (
        <AudienceSection id="pricing" altBackground={true} dark={dark}>
          <Reveal amount={0.14} distance={20}>
            <AudiencePricingSection content={content.pricing} dark={dark} />
          </Reveal>
        </AudienceSection>
      ) : null}
    </>
  );
}
