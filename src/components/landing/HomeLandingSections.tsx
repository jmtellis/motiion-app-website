import { BetaForm } from "@/components/landing/BetaForm";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeader } from "@/components/landing/SectionHeader";
import { betaSignupSection, homeHero } from "@/lib/marketing/homepage-content";
export function HomeLandingSections({ dark = false }: { dark?: boolean }) {
  return (
    <>
      {homeHero.pillars.map((pillar, index) => {
        const altBackground = index % 2 === 1;

        const bgClass = dark
          ? altBackground
            ? "bg-[#111a1c]"
            : "bg-[#0a1214]"
          : altBackground
            ? "bg-[var(--tone)]"
            : "bg-[var(--paper)]";

        return (
          <section
            key={pillar.number}
            id={`solution-${pillar.number}`}
            className={[
              "flex min-h-svh w-full items-center justify-center px-6 py-16 sm:px-10",
              index > 0 && (dark ? "border-t border-white/10" : "border-t border-[var(--line)]"),
              bgClass,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <Reveal
              amount={0.2}
              distance={32}
              className="flex w-full max-w-3xl flex-col items-center justify-center text-center"
            >
              <p className="text-xs font-semibold tracking-[0.2em] text-[var(--accent)] uppercase">
                {pillar.number}
              </p>
              <h2
                className={`mt-4 max-w-2xl text-balance text-3xl font-semibold tracking-tight md:text-4xl lg:text-[2.75rem] ${dark ? "text-white" : "text-[var(--ink)]"}`}
              >
                {pillar.title}
              </h2>
              <p
                className={`mt-6 max-w-xl text-pretty text-base leading-relaxed md:text-lg ${dark ? "text-white/65" : "text-[var(--ink-soft)]"}`}
              >
                {pillar.description}
              </p>
              <div
                className={
                  dark
                    ? "mt-10 flex w-full max-w-2xl aspect-[16/10] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 text-sm font-medium text-white/40"
                    : "mt-10 flex w-full max-w-2xl aspect-[16/10] items-center justify-center rounded-2xl border border-dashed border-[#d6d4ce] bg-[#e8e7e3] text-sm font-medium text-[var(--ink-soft)]/60"
                }
                aria-label={`${pillar.title} product image placeholder`}
              >
                Product image
              </div>
            </Reveal>
          </section>
        );
      })}

      <section
        id="signup"
        className={`flex min-h-svh w-full items-center justify-center border-t px-6 py-10 sm:px-10 lg:py-12 ${
          dark ? "border-white/10 bg-[#111a1c]" : "border-[var(--line)] bg-[var(--tone)]"
        }`}
      >
        <Reveal
          amount={0.16}
          distance={28}
          className="mx-auto flex w-full max-w-lg flex-col items-center"
        >
          <SectionHeader
            align="center"
            dark={dark}
            eyebrow={betaSignupSection.eyebrow}
            title={betaSignupSection.title}
            description={betaSignupSection.description}
          />
          <div className="mt-8 w-full">
            <BetaForm compact dark={dark} />
          </div>
        </Reveal>
      </section>
    </>
  );
}
