"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { HeroShaderVideoBackground } from "@/components/landing/HeroShaderVideoBackground";
import { ScrollMarquee } from "@/components/landing/ScrollMarquee";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { homeHeroVideo } from "@/lib/marketing/hero-video";

import "@/app/signup/signup-split.css";

export type SignupSplitStep = {
  number: number;
  label: string;
  active?: boolean;
  status?: "completed" | "active" | "pending";
};

function resolveStepStatus(step: SignupSplitStep): "completed" | "active" | "pending" {
  if (step.status) return step.status;
  if (step.active) return "active";
  return "pending";
}

export type SignupSplitCoverLink = {
  prefix: string;
  href: string;
  label: string;
};

export type SignupSplitMarquee = {
  segments: readonly string[];
  direction?: "left" | "right";
};

type SignupSplitShellProps = {
  audienceLabel: string;
  headline: string;
  subtext: string;
  steps: SignupSplitStep[];
  showSteps?: boolean;
  marquee?: SignupSplitMarquee;
  coverAltLinks?: readonly SignupSplitCoverLink[];
  children: ReactNode;
};

export function SignupSplitShell({
  audienceLabel,
  headline,
  subtext,
  steps,
  showSteps = true,
  marquee,
  coverAltLinks,
  children,
}: SignupSplitShellProps) {
  return (
    <SmoothScroll>
      <MarketingBodySurface dark />
      <div className="signup-split">
        <aside className="signup-split-cover relative">
          <HeroShaderVideoBackground
            src={homeHeroVideo.src}
            poster={homeHeroVideo.poster}
            alt={homeHeroVideo.alt}
          />
          <div className="signup-split-cover__overlay absolute inset-0" aria-hidden />
          <div className="signup-split-cover__content">
            <div className="signup-split-cover__intro">
              <p className="signup-split-cover__eyebrow">{audienceLabel}</p>
              <p className="signup-split-cover__headline">{headline}</p>
              <p className="signup-split-cover__subtext">{subtext}</p>
            </div>
            {showSteps && steps.length > 0 ? (
              <ol className="signup-split-steps" aria-label="Setup steps">
                {steps.map((step) => {
                  const status = resolveStepStatus(step);

                  return (
                    <li
                      key={step.number}
                      className={`signup-split-step signup-split-step--${status}`}
                      aria-current={status === "active" ? "step" : undefined}
                    >
                      <span className="signup-split-step__num" aria-hidden>
                        {status === "completed" ? (
                          <Check className="size-3.5" strokeWidth={2.5} />
                        ) : (
                          step.number
                        )}
                      </span>
                      <span>{step.label}</span>
                    </li>
                  );
                })}
              </ol>
            ) : null}
            {coverAltLinks?.length || (marquee && marquee.segments.length > 0) ? (
              <div className="signup-split-cover__footer">
                {coverAltLinks && coverAltLinks.length > 0 ? (
                  <nav className="signup-split-cover__alt-links" aria-label="Other account options">
                    {coverAltLinks.map((item) => (
                      <p key={`${item.href}-${item.label}`} className="signup-split-cover__alt-link">
                        {item.prefix}{" "}
                        <Link href={item.href}>{item.label}</Link>
                      </p>
                    ))}
                  </nav>
                ) : null}
                {marquee && marquee.segments.length > 0 ? (
                  <div className="signup-split-cover__marquee" aria-hidden>
                    <ScrollMarquee
                      segments={marquee.segments}
                      direction={marquee.direction ?? "left"}
                      variant="outline"
                      dark
                      className="signup-split-marquee py-2 md:py-3"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside>
        <main className="signup-split-panel" data-lenis-prevent>
          {children}
        </main>
      </div>
    </SmoothScroll>
  );
}

export function SignupSplitFormHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="signup-split-form__title">{title}</h1>
      <p className="signup-split-form__subtitle">{subtitle}</p>
    </div>
  );
}
