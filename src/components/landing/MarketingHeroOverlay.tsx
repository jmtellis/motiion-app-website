import Link from "next/link";

import type { AudiencePageContent } from "@/lib/marketing/marketing-pages";

export function MarketingHeroOverlay({ content }: { content: AudiencePageContent }) {
  return (
    <div className="animate-enter flex w-full max-w-3xl flex-col items-center gap-8 px-6 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/90 px-3 py-1 backdrop-blur-sm">
        <span className="inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden />
        <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">{content.eyebrow}</p>
      </div>

      <div className="space-y-4">
        <h1 className="text-balance text-4xl leading-[1.05] font-semibold tracking-tight text-[var(--ink)] sm:text-5xl lg:text-[2.75rem]">
          {content.headline}
        </h1>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-[var(--ink-soft)] sm:text-lg">
          {content.summary}
        </p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={content.heroCtas.primary.href} className="btn-primary w-full text-center sm:w-auto sm:min-w-[10rem]">
          {content.heroCtas.primary.label}
        </Link>
        <Link href={content.heroCtas.secondary.href} className="btn-secondary w-full text-center sm:w-auto sm:min-w-[10rem]">
          {content.heroCtas.secondary.label}
        </Link>
      </div>
    </div>
  );
}

