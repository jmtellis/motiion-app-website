import Link from "next/link";

import type { AudiencePageContent } from "@/lib/marketing/marketing-pages";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function MarketingHeroOverlay({
  content,
  dark = false,
  children,
}: {
  content: AudiencePageContent;
  dark?: boolean;
  /** Custom hero CTAs — pass client components as children, not props. */
  children?: React.ReactNode;
}) {
  return (
    <div className="animate-enter flex w-full max-w-3xl flex-col items-center gap-7 px-6 text-center">
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1",
          dark
            ? "border border-[rgb(45_212_191_/_0.25)] bg-[#0c2a26]"
            : "ui-chip",
        )}
      >
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden />
        <p className="type-eyebrow text-[var(--accent)]">{content.eyebrow}</p>
      </div>

      <div className="space-y-4">
        <h1
          className={cn("type-display text-balance", dark ? "text-on-dark-primary" : "text-[var(--ink)]")}
        >
          {content.headline}
        </h1>
        <p
          className={cn(
            "type-lead mx-auto max-w-xl text-pretty",
            dark ? "text-on-dark-secondary" : "text-[var(--ink-soft)]",
          )}
        >
          {content.summary}
        </p>
      </div>

      {children ?? (
        <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={content.heroCtas.primary.href}
            className={cn(
              "btn-primary w-full text-center sm:w-auto sm:min-w-[10rem]",
              dark && "btn-on-dark",
            )}
          >
            {content.heroCtas.primary.label}
          </Link>
          {content.heroCtas.secondary ? (
            <Link
              href={content.heroCtas.secondary.href}
              className={cn(
                "btn-outline w-full text-center sm:w-auto sm:min-w-[10rem]",
                dark && "btn-outline-on-dark",
              )}
            >
              {content.heroCtas.secondary.label}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
