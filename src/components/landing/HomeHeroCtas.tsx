"use client";

import Link from "next/link";
import { useCallback, useId, useState } from "react";

import { MarketingDialog } from "@/components/landing/MarketingDialog";
import { homeSignupScrollCta, learnMoreHeroCta } from "@/lib/marketing/homepage-content";
import { scrollToSignupSection } from "@/lib/marketing/scroll-to-signup";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function HomeHeroCtas({ dark = false }: { dark?: boolean }) {
  const [learnOpen, setLearnOpen] = useState(false);
  const learnTitleId = useId();
  const learnDescriptionId = useId();
  const closeLearn = useCallback(() => setLearnOpen(false), []);

  return (
    <>
      <div className="flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={scrollToSignupSection}
          className="btn-hero-pill btn-hero-pill-accent w-full sm:w-auto sm:min-w-[11rem]"
        >
          {homeSignupScrollCta.label}
        </button>

        <button
          type="button"
          onClick={() => setLearnOpen(true)}
          className={cn(
            "btn-hero-pill w-full sm:w-auto sm:min-w-[11rem]",
            dark ? "btn-hero-pill-ghost" : "btn-outline",
          )}
        >
          {learnMoreHeroCta.label}
        </button>
      </div>

      {learnOpen ? (
        <MarketingDialog
          onClose={closeLearn}
          title={learnMoreHeroCta.modal.title}
          description={learnMoreHeroCta.modal.description}
          titleId={learnTitleId}
          descriptionId={learnDescriptionId}
        >
          <ul className="flex flex-col gap-2" role="list">
            {learnMoreHeroCta.modal.paths.map((path) => (
              <li key={path.id}>
                <Link
                  href={path.href}
                  onClick={closeLearn}
                  className="group flex w-full flex-col rounded-[14px] border border-[#262626] bg-[#1e1e1e] px-4 py-3.5 text-left transition-colors hover:border-[#3a3a3a] hover:bg-[#2a2a2a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  <span className="text-sm font-semibold text-[#fafafa]">{path.label}</span>
                  <span className="mt-1 text-sm leading-snug text-[#a3a3a3]">
                    {path.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </MarketingDialog>
      ) : null}
    </>
  );
}
