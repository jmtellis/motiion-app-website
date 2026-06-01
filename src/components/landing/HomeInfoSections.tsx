import Link from "next/link";

import { BetaForm } from "@/components/landing/BetaForm";
import { AudienceTailoredPanel } from "@/components/landing/AudienceTailoredPanel";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeader } from "@/components/landing/SectionHeader";
import {
  homepageIntro,
  problemSection,
  productSection,
  sharedFaqItems,
  socialMetrics,
  socialProofQuotes,
  solutionSection,
  visionSection,
} from "@/lib/marketing/homepage-content";

export function HomeInfoSections() {
  return (
    <div id="company" className="relative z-20 bg-[var(--paper)]">
      <section className="section-wrap border-t border-[var(--line)]">
        <Reveal amount={0.18} distance={28}>
          <SectionHeader
            eyebrow={homepageIntro.eyebrow}
            title={homepageIntro.title}
            description={homepageIntro.description}
          />
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center">
            <div className="space-y-5">
              <p className="text-xs font-semibold tracking-[0.2em] text-[var(--accent)] uppercase">
                {visionSection.title}
              </p>
              <h3 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">{visionSection.headline}</h3>
              {visionSection.body.map((paragraph) => (
                <p key={paragraph} className="max-w-2xl text-base leading-relaxed text-[var(--ink-soft)]">
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--tone)] px-6 py-16 text-center text-sm text-[var(--ink-soft)]">
              Editorial media zone — campaign photography or product walkthrough
            </div>
          </div>
        </Reveal>
      </section>

      <section id="problem" className="section-wrap border-t border-[var(--line)] bg-[var(--tone)]">
        <Reveal amount={0.2} distance={34}>
          <SectionHeader
            eyebrow={problemSection.title}
            title={problemSection.headline}
            description={solutionSection.summary}
          />
          <ul className="mt-10 space-y-4">
            {problemSection.points.map((point, index) => (
              <Reveal key={point} delay={0.05 * index} amount={0.1} distance={16}>
                <li className="border-l-2 border-[var(--accent)] pl-4 text-base leading-relaxed text-[var(--ink-soft)]">
                  {point}
                </li>
              </Reveal>
            ))}
          </ul>
        </Reveal>
      </section>

      <section className="section-wrap border-t border-[var(--line)]">
        <Reveal amount={0.2} distance={36}>
          <SectionHeader
            eyebrow={solutionSection.title}
            title={solutionSection.headline}
            description={productSection.headline}
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {solutionSection.pillars.map((pillar, index) => (
              <Reveal key={pillar.title} delay={0.06 * index} amount={0.12} distance={18}>
                <FeatureCard title={pillar.title} description={pillar.description} />
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="product" className="section-wrap border-t border-[var(--line)] bg-[var(--tone)]">
        <Reveal amount={0.18} distance={28}>
          <SectionHeader eyebrow={productSection.title} title={productSection.headline} />
          <ul className="mt-10 grid gap-3 md:grid-cols-2">
            {productSection.capabilities.map((capability, index) => (
              <Reveal key={capability} delay={0.03 * index} amount={0.1} distance={12}>
                <li className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm leading-relaxed text-[var(--ink-soft)]">
                  <span className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  {capability}
                </li>
              </Reveal>
            ))}
          </ul>
        </Reveal>
      </section>

      <section className="section-wrap border-t border-[var(--line)]">
        <Reveal amount={0.16} distance={24}>
          <SectionHeader
            align="center"
            eyebrow="Community confidence"
            title="Built with the people making decisions every day"
            description="Trust grows when discovery is faster, profile data is current, and teams can actually collaborate in one flow."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {socialMetrics.map((metric, index) => (
              <Reveal key={metric.label} delay={0.05 * index} amount={0.12} distance={14}>
                <div className="border-b border-[var(--line)] pb-5 text-center">
                  <p className="text-4xl font-semibold tracking-tight text-[var(--ink)]">{metric.value}</p>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">{metric.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {socialProofQuotes.map((item, index) => (
              <Reveal key={item.source} delay={0.07 * index} amount={0.12} distance={18}>
                <blockquote className="space-y-3 border-l-2 border-[var(--accent)] pl-4">
                  <p className="text-sm leading-relaxed text-[var(--ink-soft)]">{item.quote}</p>
                  <footer className="text-xs font-semibold tracking-[0.18em] text-[var(--ink-soft)] uppercase">
                    {item.source}
                  </footer>
                </blockquote>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="section-wrap border-t border-[var(--line)]">
        <Reveal amount={0.14} distance={22}>
          <AudienceTailoredPanel />
        </Reveal>
      </section>

      <section id="faq" className="section-wrap border-t border-[var(--line)] bg-[var(--tone)]">
        <Reveal amount={0.16} distance={26}>
          <SectionHeader
            eyebrow="Resources and FAQs"
            title="Answers for first-time visitors, plus next steps"
            description="Explore public profiles, learn how Motiion works for your role, or request beta access."
          />
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.85fr]">
            <FAQAccordion items={sharedFaqItems} />
            <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(17,17,17,0.06)]">
              <p className="text-xs font-semibold tracking-[0.2em] text-[var(--accent)] uppercase">Explore more</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
                Start with talent search, then join the beta when you are ready to build or hire from a living profile
                system.
              </p>
              <div className="mt-5 grid gap-3">
                <Link href="/search" className="btn-outline justify-center">
                  Browse public profiles
                </Link>
                <a href="/signup" className="btn-primary justify-center">
                  Request beta access
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section id="signup" className="section-wrap border-t border-[var(--line)]">
        <Reveal amount={0.16} distance={22}>
          <SectionHeader
            eyebrow="Join Beta"
            title="Request beta access"
            description="We’re currently inviting a limited number of early users."
          />
          <div className="mt-10">
            <BetaForm />
          </div>
        </Reveal>
      </section>
    </div>
  );
}
