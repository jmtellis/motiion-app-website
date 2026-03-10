"use client";

import { useState } from "react";

type FAQItem = {
  question: string;
  answer: string;
};

type FAQAccordionProps = {
  items: FAQItem[];
};

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <article
            key={item.question}
            className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white"
          >
            <h3>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span className="text-base font-semibold tracking-tight text-[var(--ink)]">
                  {item.question}
                </span>
                <span
                  className="text-xl leading-none text-[var(--ink-soft)]"
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
              <p className="px-5 pb-5 text-sm leading-relaxed text-[var(--ink-soft)]">
                {item.answer}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
