import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

export function ActionCard({
  href,
  title,
  description,
  icon: Icon,
  compact = false,
  variant = "default",
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  index?: number;
  compact?: boolean;
  variant?: "default" | "dashboard";
}) {
  const isDashboard = variant === "dashboard";

  if (isDashboard) {
    return (
      <Link href={href} className="bd-action-row group">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/4 text-white/80 transition group-hover:border-white/16 group-hover:bg-white/8">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-white/92">{title}</h3>
          <p className="mt-0.5 truncate text-sm text-white/50">{description}</p>
        </div>
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-transparent text-white/42 transition group-hover:border-white/16 group-hover:text-white/80">
          <ArrowUpRight className="size-4" aria-hidden />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`ui-card-interactive group relative flex overflow-hidden ${
        compact ? "min-h-0 items-center gap-4 p-4" : "min-h-[168px] flex-col justify-between p-5"
      }`}
    >
      <div className={`flex items-start justify-between gap-3 ${compact ? "contents" : ""}`}>
        <span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-chip)] border border-[var(--line)] bg-[var(--tone)] text-[var(--accent-dark)] transition">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className={`inline-flex size-8 items-center justify-center rounded-[var(--radius-button)] border border-[var(--line)] bg-white text-[var(--ink-soft)] transition group-hover:border-[var(--accent-dark)] group-hover:text-[var(--accent-dark)] ${compact ? "order-3 ml-auto" : ""}`}>
          <ArrowUpRight className="size-4" aria-hidden />
        </span>
      </div>
      <div className={compact ? "min-w-0 flex-1" : ""}>
        <h3 className="text-base font-semibold text-[var(--ink)]">{title}</h3>
        <p className={`${compact ? "mt-0.5 truncate" : "mt-1.5"} text-sm leading-relaxed text-[var(--ink-soft)]`}>
          {description}
        </p>
      </div>
    </Link>
  );
}
