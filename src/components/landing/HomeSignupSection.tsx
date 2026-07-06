import Link from "next/link";

import { homeSignupSection } from "@/lib/marketing/homepage-content";

import "./feature-carousel.css";

export function HomeSignupSection() {
  return (
    <section
      id="signup"
      className="marketing-viewport-section marketing-viewport-section--center relative border-t border-[#262626] bg-[var(--stage-black)]"
    >
      <div className="marketing-hero-glow" aria-hidden />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-6 text-center">
        <div className="space-y-3">
          <p className="type-eyebrow text-on-dark-tertiary">{homeSignupSection.eyebrow}</p>
          <h2 className="type-heading-1 text-balance text-on-dark-primary">{homeSignupSection.title}</h2>
          <p className="type-lead max-w-xl text-pretty text-on-dark-secondary">
            {homeSignupSection.description}
          </p>
        </div>

        <div className="home-signup-section__grid">
          {homeSignupSection.paths.map((path) => (
            <Link key={path.id} href={path.href} className="home-signup-section__card group">
              <span className="home-signup-section__card-label">{path.label}</span>
              <span className="home-signup-section__card-description">{path.description}</span>
              <span className="home-signup-section__card-action">{path.cta} →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
