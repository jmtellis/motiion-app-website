"use client";

import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import type { FaqItem } from "@/lib/marketing/homepage-content";

import "./faq-accordion.css";

type FAQAccordionProps = {
  items: FaqItem[];
  dark?: boolean;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function FAQAccordion({ items, dark = false }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className={cn("faq-accordion", dark && "faq-accordion--dark")}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const triggerId = `${baseId}-trigger-${index}`;
        const answerId = `${baseId}-answer-${index}`;

        return (
          <article key={item.question} className="faq-accordion__item">
            <h3 className="faq-accordion__heading">
              <button
                type="button"
                id={triggerId}
                className="faq-accordion__trigger"
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span className="faq-accordion__question">{item.question}</span>
                <span className="faq-accordion__marker" aria-hidden>
                  {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
                </span>
              </button>
            </h3>
            {/* Intrinsic expansion: the answer row grows to its own height, so
                long answers cannot be clipped at narrow widths or text zoom.
                `visibility` keeps collapsed copy out of the a11y tree and out
                of the tab order. */}
            <div
              id={answerId}
              role="region"
              aria-labelledby={triggerId}
              className="faq-accordion__answer"
              data-open={isOpen ? "true" : "false"}
            >
              <div className="faq-accordion__answer-inner">
                <p className="faq-accordion__answer-text">
                  {item.answer}
                  {item.answerLink && <> <Link className="underline underline-offset-4 hover:opacity-80" href={item.answerLink.href}>{item.answerLink.label}</Link>.</>}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
