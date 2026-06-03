import { EditorialHeadline } from "@/components/landing/EditorialHeadline";
import { HomeHeroCtas } from "@/components/landing/HomeHeroCtas";
import { homeHero } from "@/lib/marketing/homepage-content";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function HomeLandingHero({ dark = false }: { dark?: boolean }) {
  const subtextClass = dark ? "text-on-dark-secondary" : "text-[var(--ink-soft)]";

  return (
    <div className="animate-enter flex w-full max-w-3xl flex-col items-center gap-8 px-6 text-center sm:gap-9">
      <div className="flex w-full flex-col items-center gap-5 sm:gap-6">
        <EditorialHeadline
          parts={homeHero.headline.parts}
          as="h1"
          size="display"
          dark={dark}
          className="max-w-3xl"
        />
        <p className={cn("type-lead max-w-2xl text-pretty", subtextClass)}>{homeHero.subtext}</p>
      </div>

      <HomeHeroCtas dark={dark} />
    </div>
  );
}
