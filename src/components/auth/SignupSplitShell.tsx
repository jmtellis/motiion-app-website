"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

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

type SignupSplitShellProps = {
  audienceLabel: string;
  headline: string;
  subtext: string;
  steps: SignupSplitStep[];
  showSteps?: boolean;
  children: ReactNode;
};

export function SignupSplitShell({
  audienceLabel,
  headline,
  subtext,
  steps,
  showSteps = true,
  children,
}: SignupSplitShellProps) {
  return (
    <div className="signup-split">
      <aside className="signup-split-cover relative">
        <Image
          src="/hero-studio-background.png"
          alt=""
          fill
          priority
          className="signup-split-cover__image"
          aria-hidden
        />
        <div className="signup-split-cover__overlay absolute inset-0" aria-hidden />
        <div className="signup-split-cover__content">
          <div>
            <p className="signup-split-cover__eyebrow">
              <span className="signup-split-cover__eyebrow-dot" aria-hidden />
              {audienceLabel}
            </p>
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
                      {status === "completed" ? <Check className="size-3.5" strokeWidth={2.5} /> : step.number}
                    </span>
                    <span>{step.label}</span>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
      </aside>
      <main className="signup-split-panel">{children}</main>
    </div>
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
