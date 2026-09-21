"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

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
          "mkt-btn audience-pricing__cta",
          plan.highlighted ? "mkt-btn--primary" : "mkt-btn--secondary",
        )}
      >
        {plan.cta.label}
      </Link>
    </article>
  );
}

function TalentPricing({
  content,
  dark,
}: {
  content: Extract<AudiencePricingContent, { variant: "talent" }>;
  dark: boolean;
}) {
  const baseId = useId();
  const [role, setRole] = useState<TalentPricingRole>("dancer");
  const activeIndex = Math.max(0, content.roles.findIndex((entry) => entry.role === role));
  const activeRole = content.roles[activeIndex] ?? content.roles[0];

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const shouldFocusRef = useRef(false);

  useEffect(() => {
    if (!shouldFocusRef.current) return;
    shouldFocusRef.current = false;
    tabRefs.current[activeIndex]?.focus();
  }, [activeIndex]);

  // Two small cards swap, so automatic activation on arrow keys is appropriate.
  const selectByOffset = (offset: number) => {
    const count = content.roles.length;
    const next = content.roles[(((activeIndex + offset) % count) + count) % count];
    if (!next) return;
    shouldFocusRef.current = true;
    setRole(next.role);
  };

  const selectByIndex = (index: number) => {
    const next = content.roles[index];
    if (!next) return;
    shouldFocusRef.current = true;
    setRole(next.role);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        selectByOffset(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        selectByOffset(-1);
        break;
      case "Home":
        event.preventDefault();
        selectByIndex(0);
        break;
      case "End":
        event.preventDefault();
        selectByIndex(content.roles.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <>
      <div className="audience-pricing__toggle" role="tablist" aria-label="Talent type">
        {content.roles.map((entry, index) => {
          const selected = entry.role === role;
          return (
            <button
              key={entry.role}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${entry.role}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${entry.role}`}
              tabIndex={selected ? 0 : -1}
              className={cn(
                "audience-pricing__toggle-btn",
                selected && "audience-pricing__toggle-btn--active",
              )}
              onClick={() => setRole(entry.role)}
              onKeyDown={onKeyDown}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      <div
        className="audience-pricing__grid"
        role="tabpanel"
        id={`${baseId}-panel-${activeRole.role}`}
        aria-labelledby={`${baseId}-tab-${activeRole.role}`}
      >
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
        <h2 className={cn("mkt-heading", !dark && "text-[var(--ink)]")}>{content.title}</h2>
        <p className={cn("mkt-body", !dark && "text-[var(--ink-soft)]")}>{content.description}</p>
      </div>

      {content.variant === "talent" ? (
        <TalentPricing content={content} dark={dark} />
      ) : (
        <IndustryPricing content={content} dark={dark} />
      )}
    </div>
  );
}
