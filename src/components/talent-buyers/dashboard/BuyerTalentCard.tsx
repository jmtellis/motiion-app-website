import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { BuyerTalentSummary } from "@/types/talent-buyer-dashboard";

export function BuyerTalentCard({
  talent,
  variant = "default",
}: {
  talent: BuyerTalentSummary;
  variant?: "default" | "dashboard";
}) {
  const initial = talent.name.charAt(0).toUpperCase();
  const isDashboard = variant === "dashboard";
  const cardClass = isDashboard ? "bd-row-card" : "ui-card-interactive group overflow-hidden";
  const chipClass = isDashboard ? "bd-chip" : "ui-chip";
  const linkClass = isDashboard
    ? "mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline"
    : "mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-dark)] hover:underline";

  return (
    <article className={cardClass}>
      <div className="flex gap-4">
        <div className={`relative w-20 shrink-0 overflow-hidden rounded-xl sm:w-24 ${isDashboard ? "bg-white/6" : "bg-[var(--tone)]"}`}>
          {talent.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={talent.avatarUrl} alt="" className="size-full min-h-[96px] object-cover" />
          ) : (
            <div className={`flex size-full min-h-[96px] items-center justify-center text-2xl font-semibold ${isDashboard ? "text-white/42" : "text-[var(--ink-soft)]"}`}>
              {initial}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 py-1">
          <h3 className={`text-base font-semibold ${isDashboard ? "text-white/92" : "text-[var(--ink)]"}`}>{talent.name}</h3>
          <p className={`mt-0.5 text-sm ${isDashboard ? "text-white/50" : "text-[var(--ink-soft)]"}`}>{talent.location}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {talent.styles.map((style) => (
              <span key={style} className={`${chipClass} px-2 py-0.5 text-xs font-medium`}>
                {style}
              </span>
            ))}
          </div>
          <Link href={`/talent/${talent.profileSlug}`} className={linkClass}>
            View Profile
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
