import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { SearchProfileRecord } from "@/types/search";

function getSummary(profile: SearchProfileRecord) {
  return (
    profile.bio ||
    profile.profile_highlights?.[0]?.subtitle ||
    profile.skills?.slice(0, 3).join(", ") ||
    "Premium talent profile available for search."
  );
}

export function TalentCard({ profile }: { profile: SearchProfileRecord }) {
  const name = profile.display_name || profile.full_name || "Talent profile";
  const image = profile.headshot_url || profile.headshot_urls?.[0];
  const slug = profile.username || profile.id;

  return (
    <article className="ui-card-interactive overflow-hidden">
      <div className="relative h-72 overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[var(--tone)] text-5xl font-semibold text-[var(--ink-soft)]">
            {name.charAt(0)}
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_20%,rgba(0,0,0,0.72)_100%)]" />
        <div className="absolute right-4 bottom-4 left-4 flex items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xl font-semibold tracking-tight text-white">{name}</p>
              {profile.is_verified ? (
                <span className="rounded-full bg-[var(--ds-accent)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--ds-on-accent)] uppercase">
                  Verified
                </span>
              ) : null}
            </div>
            <p className="text-sm text-white/75">{profile.location || "Location coming soon"}</p>
          </div>
          <Link
            href={`/profile/${slug}`}
            className="inline-flex size-10 items-center justify-center rounded-[var(--radius-button)] border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            aria-label={`Open ${name} profile`}
          >
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          {(profile.talent_types ?? []).map((type) => (
            <span
              key={type}
              className="ui-chip px-2.5 py-1 text-xs font-semibold text-[var(--ink)]"
            >
              {type}
            </span>
          ))}
          {(profile.styles ?? []).slice(0, 2).map((style) => (
            <span
              key={style}
              className="ui-chip px-2.5 py-1 text-xs font-semibold text-[var(--accent-dark)]"
            >
              {style}
            </span>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-[var(--ink-soft)]">{getSummary(profile)}</p>
      </div>
    </article>
  );
}
