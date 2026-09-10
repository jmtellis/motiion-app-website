import Link from "next/link";

import { TalentIdentity } from "@/components/talent/TalentIdentity";

export type ProfileCompletionCta = "Start" | "Resume" | "Submit";

export type ProfileCompletionChecklistItem = {
  id: string;
  title: string;
  isComplete: boolean;
};

/**
 * Web translation of iOS HomeProfileCompletionCard / HomeProfileCompletionFocus.
 * Progressive disclosure only — no blocking modals.
 */
export function ProfileCompletionCard({
  displayName,
  headshotUrl,
  username,
  headline = "Complete your profile",
  cta,
  statusLine,
  completedCount,
  totalCount,
  focusItems,
  href = "/profile/setup",
}: {
  displayName: string;
  headshotUrl?: string | null;
  username?: string | null;
  headline?: string;
  cta: ProfileCompletionCta;
  statusLine?: string | null;
  completedCount: number;
  totalCount: number;
  focusItems: ProfileCompletionChecklistItem[];
  href?: string;
}) {
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <section className="overflow-hidden rounded-[var(--ds-radius-card)] border border-[var(--ds-border)] bg-[var(--ds-surface)]">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-4">
          <TalentIdentity
            name={displayName}
            username={username}
            headshotUrl={headshotUrl}
            size="sm"
            subtitle={statusLine ?? undefined}
          />
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ds-text-default)]">
              {headline}
            </h2>
            <p className="mt-1 text-sm text-[var(--ds-muted)]">
              {completedCount} of {totalCount} complete · {progress}%
            </p>
          </div>
          {focusItems.length > 0 ? (
            <ul className="space-y-1.5">
              {focusItems.map((item) => (
                <li
                  key={item.id}
                  className={`text-sm ${
                    item.isComplete
                      ? "text-[var(--ds-muted)] line-through"
                      : "text-[var(--ds-on-surface)]"
                  }`}
                >
                  {item.title}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Link
          href={href}
          className="inline-flex min-h-[var(--ds-control-height-compact)] shrink-0 items-center justify-center rounded-full bg-[var(--ds-accent)] px-5 text-sm font-semibold text-[var(--ds-on-accent)] transition-opacity hover:opacity-90"
        >
          {cta}
        </Link>
      </div>
      <div className="h-1 bg-[var(--ds-surface-raised)]">
        <div
          className="h-full bg-[var(--ds-accent)] transition-[width] duration-300"
          style={{ width: `${progress}%` }}
          aria-hidden
        />
      </div>
    </section>
  );
}
