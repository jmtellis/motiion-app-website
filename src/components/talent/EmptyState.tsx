import Link from "next/link";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string } | { onClick?: never; href?: never; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--ds-radius-card)] border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface)] px-6 py-14 text-center">
      <h2 className="text-base font-semibold text-[var(--ds-text-default)]">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--ds-muted)]">{description}</p>
      ) : null}
      {action && "href" in action && action.href ? (
        <Link
          href={action.href}
          className="mt-6 inline-flex min-h-[var(--ds-control-height-compact)] items-center justify-center rounded-full bg-[var(--ds-accent)] px-5 text-sm font-semibold text-[var(--ds-on-accent)] transition-opacity hover:opacity-90"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
