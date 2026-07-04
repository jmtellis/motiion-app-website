"use client";

import { useState } from "react";

type FAQItem = {
  question: string;
  answer: string;
};

type FAQAccordionProps = {
  items: FAQItem[];
  dark?: boolean;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function FAQAccordion({ items, dark = false }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className={cn("divide-y", dark ? "divide-white/10 border-white/10" : "divide-[var(--line)] border-[var(--line)]", "border-y")}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <article key={item.question} className="overflow-hidden">
            <h3>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span
                  className={cn(
                    "text-base font-semibold tracking-tight",
                    dark ? "text-on-dark-primary" : "text-[var(--ink)]",
                  )}
                >
                  {item.question}
                </span>
                <span
                  className={cn(
                    "text-xl leading-none",
                    dark ? "text-on-dark-secondary" : "text-[var(--ink-soft)]",
                  )}
                  aria-hidden
                >
                  {isOpen ? "-" : "+"}
                </span>
              </button>
            </h3>
            <div
              className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
                isOpen ? "max-h-48" : "max-h-0"
              }`}
            >
              <p
                className={cn(
                  "px-5 pb-5 text-sm leading-relaxed",
                  dark ? "text-on-dark-secondary" : "text-[var(--ink-soft)]",
                )}
              >
                {item.answer}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
