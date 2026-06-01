"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { homeHero } from "@/lib/marketing/homepage-content";

type AudienceId = (typeof homeHero.audienceLinks)[number]["id"];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function HomeLandingHero({ dark = false }: { dark?: boolean }) {
  const { demoCta } = homeHero;
  const [hovered, setHovered] = useState<AudienceId | null>(null);

  const ink = dark ? "text-white" : "text-[var(--ink)]";
  const inkSoft = dark ? "text-white/72" : "text-[var(--ink-soft)]";
  const linkBase = dark
    ? "border-b-2 pb-2 text-lg font-semibold tracking-tight text-white transition-[border-color] duration-200 focus-visible:outline-none sm:text-xl"
    : "border-b-2 pb-2 text-lg font-semibold tracking-tight text-[var(--ink)] transition-[border-color] duration-200 focus-visible:outline-none sm:text-xl";
  const linkActive = dark ? "border-white" : "border-[var(--ink)]";
  const linkIdle = dark
    ? "border-transparent hover:border-white"
    : "border-transparent hover:border-[var(--ink)]";
  const line = dark ? "bg-white/25" : "bg-[var(--line)]";

  const activeDescription = useMemo(() => {
    if (!hovered) return homeHero.blueprint;
    return homeHero.audienceLinks.find((link) => link.id === hovered)?.description ?? homeHero.blueprint;
  }, [hovered]);

  return (
    <div className="animate-enter flex w-full max-w-3xl flex-col items-center gap-10 px-6 text-center">
      <h1
        className={`text-balance text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-[3.25rem] ${ink}`}
      >
        {homeHero.headline.lead}
        <span className="text-[var(--accent)]">{homeHero.headline.brand}</span>
      </h1>

      <div
        className="flex w-full max-w-2xl flex-col items-center gap-4"
        onMouseLeave={() => setHovered(null)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setHovered(null);
          }
        }}
      >
        <nav
          aria-label="Choose your path"
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:gap-x-10 lg:gap-x-12"
        >
          {homeHero.audienceLinks.map((link) => {
            const active = hovered === link.id;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(linkBase, active ? linkActive : linkIdle)}
                onMouseEnter={() => setHovered(link.id)}
                onFocus={() => setHovered(link.id)}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className={`h-px w-full max-w-[12rem] sm:max-w-[14rem] ${line}`} aria-hidden />

        {/* Fixed height fits blueprint (tallest copy) so hover swaps don't shift the hero */}
        <div
          className="flex h-[6.5rem] w-full max-w-xl items-center justify-center sm:h-[5.75rem]"
          aria-live="polite"
        >
          <p
            className={`line-clamp-4 text-pretty text-base leading-relaxed transition-opacity duration-300 motion-reduce:transition-none sm:text-lg ${inkSoft}`}
          >
            {activeDescription}
          </p>
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-3">
        <Link
          href={demoCta.href}
          className={cn(
            "w-full text-center sm:w-auto sm:min-w-[14rem]",
            dark ? "btn-primary btn-on-dark" : "btn-primary",
          )}
        >
          {demoCta.label}
        </Link>
        <p className={`text-sm ${inkSoft}`}>{demoCta.hint}</p>
      </div>
    </div>
  );
}
