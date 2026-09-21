"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import {
  LANDING_AUDIENCE_PANEL_ID,
  useLandingAudience,
} from "@/components/landing/LandingAudienceContext";
import { landingAudienceSegments } from "@/lib/marketing/marketing-pages";

import "./landing-audience.css";

/**
 * Manual-activation menu tabs: arrows move focus, Enter/Space commits. The
 * panel swaps a whole page of content, so activating on every arrow press
 * would thrash the layout for keyboard users.
 */
export function LandingAudienceTabs() {
  const { audience, setAudience } = useLandingAudience();

  const selectedIndex = Math.max(
    0,
    landingAudienceSegments.findIndex((segment) => segment.id === audience),
  );
  const [focusIndex, setFocusIndex] = useState(selectedIndex);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const shouldFocusRef = useRef(false);

  // Keep roving focus anchored to the selection when it changes elsewhere
  // (query init, footer links, learn-more chooser).
  useEffect(() => {
    setFocusIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (!shouldFocusRef.current) return;
    shouldFocusRef.current = false;
    tabRefs.current[focusIndex]?.focus();
  }, [focusIndex]);

  const moveFocus = (nextIndex: number) => {
    const count = landingAudienceSegments.length;
    const wrapped = ((nextIndex % count) + count) % count;
    shouldFocusRef.current = true;
    setFocusIndex(wrapped);
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
        moveFocus(landingAudienceSegments.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className="landing-audience-tabs" role="tablist" aria-label="Audience" aria-orientation="horizontal">
      {landingAudienceSegments.map((segment, index) => {
        const selected = index === selectedIndex;
        return (
          <button
            key={segment.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`landing-audience-tab-${segment.id}`}
            aria-selected={selected}
            aria-controls={LANDING_AUDIENCE_PANEL_ID}
            tabIndex={index === focusIndex ? 0 : -1}
            className="landing-audience-tabs__tab"
            onClick={() => setAudience(segment.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            onFocus={() => setFocusIndex(index)}
          >
            <span className="landing-audience-tabs__label">{segment.label}</span>
          </button>
        );
      })}
    </div>
  );
}
