import { AudienceBenefitsShowcase } from "@/components/landing/AudienceBenefitsShowcase";
import { BetaForm } from "@/components/landing/BetaForm";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeader } from "@/components/landing/SectionHeader";
import type { AudiencePageContent } from "@/lib/marketing/marketing-pages";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function audienceSectionClass(altBackground: boolean, dark: boolean) {
  const base = "ui-section-narrative border-t";
  if (dark) {
    return cn(base, altBackground ? "border-[#262626] bg-[var(--graphite)]" : "border-[#262626] bg-[var(--stage-black)]");
  }
  return cn(base, altBackground ? "border-[var(--line)] bg-[var(--tone)]" : "border-[var(--line)] bg-[var(--paper)]");
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
      <section id="benefits" className={audienceSectionClass(false, dark)}>
        <Reveal amount={0.18} distance={24} className="w-full max-w-6xl">
          <AudienceBenefitsShowcase
            title={content.benefitsTitle}
            intro={content.summary}
            benefits={content.benefits}
            dark={dark}
          />
        </Reveal>
      </section>

      <section id="workflow" className={audienceSectionClass(true, dark)}>
        <Reveal amount={0.16} distance={22} className="w-full max-w-6xl">
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
            <div
              className={cn(
                "ui-panel p-5",
                dark && "ui-panel-dark",
              )}
            >
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
          </div>
        </Reveal>
      </section>

      <section id="faq" className={audienceSectionClass(false, dark)}>
        <Reveal amount={0.14} distance={20} className="w-full max-w-3xl">
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
      </section>

      <section id="signup" className={audienceSectionClass(true, dark)}>
        <Reveal
          amount={0.16}
          distance={28}
          className="mx-auto flex w-full max-w-lg flex-col items-center"
        >
          <SectionHeader
            align="center"
            eyebrow={content.betaSignup.eyebrow}
            title={content.betaSignup.title}
            description={content.betaSignup.description}
            dark={dark}
          />
          <div className="mt-8 w-full">
            <BetaForm compact dark={dark} />
          </div>
        </Reveal>
      </section>
    </>
  );
}
