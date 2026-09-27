"use client";
import { useState, type ReactNode, useRef } from "react";
export function IndustrySettings({
  sections,
  initialSection = "account",
}: {
  sections: { id: string; label: string; content: ReactNode }[];
  initialSection?: string;
}) {
  const [active, setActive] = useState(initialSection);
  const nav = useRef<HTMLDivElement>(null);
  return (
    <div className="industry-settings-layout">
      <div
        ref={nav}
        className="industry-settings-nav"
        role="tablist"
        aria-label="Settings sections"
        onKeyDown={(event) => {
          if (
            ![
              "ArrowDown",
              "ArrowUp",
              "ArrowLeft",
              "ArrowRight",
              "Home",
              "End",
            ].includes(event.key)
          )
            return;
          event.preventDefault();
          const index = sections.findIndex((s) => s.id === active);
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? sections.length - 1
                : (index +
                    (["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1) +
                    sections.length) %
                  sections.length;
          setActive(sections[next].id);
          nav.current
            ?.querySelectorAll<HTMLButtonElement>("button")
            [next]?.focus();
        }}
      >
        {sections.map((section) => (
          <button
            type="button"
            key={section.id}
            role="tab"
            id={`settings-tab-${section.id}`}
            aria-controls={`settings-panel-${section.id}`}
            aria-selected={active === section.id}
            tabIndex={active === section.id ? 0 : -1}
            onClick={() => setActive(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>
      <div>
        {sections.map((section) => (
          <section
            className="industry-settings-panel"
            role="tabpanel"
            id={`settings-panel-${section.id}`}
            aria-labelledby={`settings-tab-${section.id}`}
            hidden={active !== section.id}
            key={section.id}
          >
            {section.content}
          </section>
        ))}
      </div>
    </div>
  );
}
