"use client";


import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { LANDING_AUDIENCE_PANEL_ID, useLandingAudience } from "@/components/landing/LandingAudienceContext";
import type { MarketingTab } from "@/lib/marketing/marketing-pages";

import "./landing-audience.css";

export const LANDING_AUDIENCE_CHOICES_ID = "landing-audience-choices";

const choices: { id: MarketingTab; label: string; illustration: string; description: string }[] = [
  { id: "talent", label: "Talent", illustration: "talent-portfolio", description: "Your work, in view." },
  { id: "casting", label: "Industry", illustration: "industry-roster", description: "The right people, together." },
  { id: "community", label: "Community", illustration: "community-connections", description: "Closer to the dance world." },
];

export function LandingAudienceChoices() {
  const { audience, setAudience } = useLandingAudience();
  const selectedIndex = Math.max(0, choices.findIndex((choice) => choice.id === audience));
  const [focusIndex, setFocusIndex] = useState(selectedIndex);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const shouldFocusRef = useRef(false);

  useEffect(() => {
    setFocusIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (!shouldFocusRef.current) return;
    shouldFocusRef.current = false;
    tabRefs.current[focusIndex]?.focus();
  }, [focusIndex]);

  const moveFocus = (nextIndex: number) => {
    const count = choices.length;
    shouldFocusRef.current = true;
    setFocusIndex(((nextIndex % count) + count) % count);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveFocus(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveFocus(index - 1);
        break;
      case "Home":
        event.preventDefault();
        moveFocus(0);
        break;
      case "End":
        event.preventDefault();
        moveFocus(choices.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <section id={LANDING_AUDIENCE_CHOICES_ID} className="landing-audience-choices" aria-label="Ways to use Motiion">
      <div className="landing-audience-choices__inner">
        <div className="landing-audience-choices__list" role="tablist" aria-label="Ways to use Motiion">
          {choices.map((choice, index) => {
            const selected = choice.id === audience;
            return (
              <button
                key={choice.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`landing-audience-choice-${choice.id}`}
                aria-selected={selected}
                aria-label={choice.label}
                aria-controls={LANDING_AUDIENCE_PANEL_ID}
                tabIndex={index === focusIndex ? 0 : -1}
                className="landing-audience-choices__choice"
                onClick={() => setAudience(choice.id)}
                onKeyDown={(event) => onKeyDown(event, index)}
                onFocus={() => setFocusIndex(index)}
              >
                <span>{choice.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
