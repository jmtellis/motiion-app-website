"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";

import type {
  AudiencePricingContent,
  PricingPlan,
  TalentPricingRole,
} from "@/lib/marketing/audience-pricing";

import "./audience-pricing.css";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function PricingCard({ plan, dark }: { plan: PricingPlan; dark: boolean }) {
  return (
    <article
      className={cn(
        "audience-pricing__plan",
        plan.highlighted && "audience-pricing__plan--highlighted",
      )}
    >
      <div className="audience-pricing__plan-header">
        <p className="audience-pricing__plan-name">{plan.name}</p>
        <div className="audience-pricing__plan-price-row">
          <span className="audience-pricing__plan-price">{plan.price}</span>
          {plan.period ? <span className="audience-pricing__plan-period">{plan.period}</span> : null}
        </div>
        <p className={cn("audience-pricing__plan-description", !dark && "text-[var(--ink-soft)]")}>
          {plan.description}
        </p>
      </div>

      <ul className="audience-pricing__features">
        {plan.features.map((feature) => (
          <li key={feature} className="audience-pricing__feature">
            <Check className="audience-pricing__feature-icon size-4 shrink-0" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={plan.cta.href}
        className={cn(
          "audience-pricing__cta",
          plan.highlighted ? "btn-hero-pill btn-hero-pill-accent" : "btn-hero-pill btn-hero-pill-ghost",
        )}
      >
        {plan.cta.label}
      </Link>
    </article>
  );
}

function TalentPricing({ content, dark }: { content: Extract<AudiencePricingContent, { variant: "talent" }>; dark: boolean }) {
  const [role, setRole] = useState<TalentPricingRole>("dancer");
  const activeRole = content.roles.find((entry) => entry.role === role) ?? content.roles[0];

  return (
    <>
      <div className="audience-pricing__toggle" role="tablist" aria-label="Talent type">
        {content.roles.map((entry) => {
          const selected = entry.role === role;
          return (
            <button
              key={entry.role}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn("audience-pricing__toggle-btn", selected && "audience-pricing__toggle-btn--active")}
              onClick={() => setRole(entry.role)}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      <div className="audience-pricing__grid" role="tabpanel">
        <PricingCard plan={activeRole.free} dark={dark} />
        <PricingCard plan={activeRole.pro} dark={dark} />
      </div>
    </>
  );
}

function IndustryPricing({
  content,
  dark,
}: {
  content: Extract<AudiencePricingContent, { variant: "industry" }>;
  dark: boolean;
}) {
  return (
    <div className="audience-pricing__grid">
      <PricingCard plan={content.free} dark={dark} />
      <PricingCard plan={content.pro} dark={dark} />
    </div>
  );
}

export function AudiencePricingSection({
  content,
  dark = false,
}: {
  content: AudiencePricingContent;
  dark?: boolean;
}) {
  return (
    <div className={cn("audience-pricing", dark && "audience-pricing--dark")}>
      <div className="audience-pricing__intro">
        <h2 className={cn("type-heading-1 text-balance", dark ? "text-on-dark-primary" : "text-[var(--ink)]")}>
          {content.title}
        </h2>
        <p className={cn("type-body max-w-2xl text-pretty", dark ? "text-on-dark-secondary" : "text-[var(--ink-soft)]")}>
          {content.description}
        </p>
      </div>

      {content.variant === "talent" ? (
        <TalentPricing content={content} dark={dark} />
      ) : (
        <IndustryPricing content={content} dark={dark} />
      )}
    </div>
  );
}
