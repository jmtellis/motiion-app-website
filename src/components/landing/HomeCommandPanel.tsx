"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { HeroSearchBar } from "@/components/landing/HeroSearchBar";

const quickPaths = [
  { label: "For talent", href: "/for-talent" },
  { label: "For casting", href: "/for-casting" },
  { label: "Browse talent", href: "/search" },
] as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function HomeCommandPanel({ dark = false }: { dark?: boolean }) {
  return (
    <div className="w-full max-w-3xl space-y-4">
      <div className={cn("ui-command-panel", dark && "ui-command-panel--dark")}>
        <HeroSearchBar action="/search" embedded />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {quickPaths.map((path) => (
          <Link
            key={path.href}
            href={path.href}
            className={cn(
              "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition",
              dark
                ? "ui-chip-dark text-white/72 hover:border-white/20 hover:text-white"
                : "ui-chip text-[var(--ink-soft)] hover:border-[#d6d4ce] hover:text-[var(--ink)]",
            )}
          >
            {path.label}
            <ArrowUpRight className="size-3 opacity-60" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  );
}
