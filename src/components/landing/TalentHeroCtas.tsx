"use client";

import Link from "next/link";

import { IosDownloadHeroButton } from "@/components/landing/IosDownloadHeroButton";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function TalentHeroCtas({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
      <IosDownloadHeroButton dark={dark} />
      <Link
        href="/signup"
        className={cn(
          "btn-hero-pill w-full text-center sm:w-auto sm:min-w-[11rem]",
          dark ? "btn-hero-pill-ghost" : "btn-outline",
        )}
      >
        Sign up
      </Link>
    </div>
  );
}
