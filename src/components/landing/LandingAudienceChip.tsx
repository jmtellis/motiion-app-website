"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { useLandingAudience } from "@/components/landing/LandingAudienceContext";
import { landingAudienceSegments } from "@/lib/marketing/marketing-pages";

import "./landing-audience.css";

export function LandingAudienceChip() {
  const { audience, setAudience } = useLandingAudience();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = landingAudienceSegments.find((segment) => segment.id === audience) ?? landingAudienceSegments[1];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="landing-audience-chip" ref={rootRef}>
      <button
        type="button"
        className="landing-audience-chip__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="landing-audience-intro__dot" aria-hidden />
        <span className="mkt-eyebrow text-[var(--ds-accent-bright)]">{selected.label}</span>
        <ChevronDown className="landing-audience-chip__chevron" aria-hidden />
      </button>

      {open ? (
        <ul className="landing-audience-chip__menu" id={listId} role="listbox" aria-label="Audience">
          {landingAudienceSegments.map((segment) => {
            const isSelected = segment.id === audience;
            return (
              <li key={segment.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className="landing-audience-chip__option"
                  onClick={() => {
                    setAudience(segment.id);
                    setOpen(false);
                  }}
                >
                  {segment.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
