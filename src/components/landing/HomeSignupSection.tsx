import Link from "next/link";

import { homeSignupSection } from "@/lib/marketing/homepage-content";

import "./feature-carousel.css";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function HomeSignupSection({ variant = "page" }: { variant?: "page" | "footer-reveal" }) {
  const isFooterReveal = variant === "footer-reveal";

  return (
    <section
      className={cn(
        "relative",
        isFooterReveal
          ? "home-signup-section--footer-reveal"
          : "marketing-viewport-section marketing-viewport-section--center border-t border-[#262626] bg-[var(--stage-black)]",
      )}
      aria-label={homeSignupSection.title}
    >
      {!isFooterReveal ? <div className="marketing-hero-glow" aria-hidden /> : null}
      <div
        className={cn(
          "relative flex w-full",
          isFooterReveal
            ? "home-signup-section--footer-reveal__inner"
            : "mx-auto max-w-3xl flex-col items-center gap-8 px-6 text-center",
        )}
      >
        {isFooterReveal ? (
          <div className="home-signup-section--footer-reveal__layout">
            <div className="home-signup-section--footer-reveal__intro">
              <h2 className="type-heading-1 text-balance text-on-dark-primary">{homeSignupSection.title}</h2>
              <p className="type-lead text-pretty text-on-dark-secondary">{homeSignupSection.description}</p>
            </div>

            <div className="home-signup-section__options">
              {homeSignupSection.paths.map((path) => (
                <Link key={path.id} href={path.href} className="home-signup-section__option">
                  <span className="home-signup-section__option-copy">
                    <span className="home-signup-section__option-label">{path.label}</span>
                    <span className="home-signup-section__option-description">{path.description}</span>
                  </span>
                  <span className="home-signup-section__option-cta">{path.cta}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
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
          </>
        )}
      </div>
    </section>
  );
}
