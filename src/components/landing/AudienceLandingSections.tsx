import { BetaForm } from "@/components/landing/BetaForm";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeader } from "@/components/landing/SectionHeader";
import type { AudiencePageContent } from "@/lib/marketing/marketing-pages";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function audienceSectionClass(altBackground: boolean, dark: boolean) {
  if (dark) {
    return cn(
      "flex min-h-svh w-full items-center justify-center border-t px-6 py-12 sm:px-10",
      altBackground ? "border-white/10 bg-black" : "border-white/10 bg-black",
    );
  }

  return cn(
    "flex min-h-svh w-full items-center justify-center border-t border-[var(--line)] px-6 py-12 sm:px-10",
    altBackground ? "bg-[var(--tone)]" : "bg-[var(--paper)]",
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
      <section id="benefits" className={audienceSectionClass(false, dark)}>
        <Reveal amount={0.18} distance={24} className="w-full max-w-6xl">
          <h2
            className={cn(
              "type-heading-1 text-center text-balance",
              dark ? "text-on-dark-primary" : "text-[var(--ink)]",
            )}
          >
            {content.benefitsTitle}
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {content.benefits.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.04} amount={0.12} distance={16}>
                <article
                  className={cn(
                    "h-full rounded-2xl border p-6",
                    dark
                      ? "border-white/12 bg-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
                      : "border-[var(--line)] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]",
                  )}
                >
                  <h3
                    className={cn(
                      "type-label font-semibold",
                      dark ? "text-on-dark-primary" : "text-[var(--ink)]",
                    )}
                  >
                    {item.title}
                  </h3>
                  <p
                    className={cn(
                      "type-body mt-3",
                      dark ? "text-on-dark-secondary" : "text-[var(--ink-soft)]",
                    )}
                  >
                    {item.description}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="workflow" className={audienceSectionClass(true, dark)}>
        <Reveal amount={0.16} distance={22} className="w-full max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
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
                        "inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                        dark
                          ? "border-white/15 bg-white/10 text-on-dark-primary"
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
                "rounded-2xl border p-6",
                dark
                  ? "border-white/12 bg-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
                  : "border-[var(--line)] bg-white shadow-[0_12px_40px_rgba(17,17,17,0.06)]",
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
