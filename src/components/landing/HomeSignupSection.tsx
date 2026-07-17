import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { homeSignupSection } from "@/lib/marketing/homepage-content";

import type { MarketingHeaderTab } from "@/lib/marketing/marketing-pages";

import "./feature-carousel.css";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function signupPathsForAudience(audience: MarketingHeaderTab) {
  if (audience === "talent") {
    return homeSignupSection.paths.filter((path) => path.id === "talent");
  }
  if (audience === "casting") {
    return homeSignupSection.paths.filter((path) => path.id === "industry");
  }
  return homeSignupSection.paths;
}

export function HomeSignupSection({
  variant = "page",
  audience = null,
}: {
  variant?: "page" | "footer-reveal";
  audience?: MarketingHeaderTab;
}) {
  const isFooterReveal = variant === "footer-reveal";
  const paths = signupPathsForAudience(audience);

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

            <div
              className={cn(
                "home-signup-section__options",
                paths.length === 1 && "home-signup-section__options--single",
              )}
            >
              {paths.map((path) => (
                <Link key={path.id} href={path.href} className="home-signup-section__option">
                  <span className="home-signup-section__option-copy">
                    <span className="home-signup-section__option-label">{path.label}</span>
                    <span className="home-signup-section__option-description">{path.description}</span>
                  </span>
                  <span className="home-signup-section__option-cta">
                    {path.cta}
                    <ChevronRight className="size-4 shrink-0" aria-hidden />
                  </span>
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
              {paths.map((path) => (
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
