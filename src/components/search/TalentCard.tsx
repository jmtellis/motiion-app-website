import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { SearchProfileRecord } from "@/types/search";

export function TalentCard({ profile }: { profile: SearchProfileRecord }) {
  const name = profile.display_name || profile.full_name || "Talent profile";
  const image = profile.headshot_url || profile.headshot_urls?.[0];
  const slug = profile.username || profile.id;
  const tags = [...(profile.talent_types ?? []), ...(profile.styles ?? [])].slice(0, 3);

  return (
    <Link
      href={`/profile/${slug}`}
      className="group relative block overflow-hidden rounded-[14px] border border-[#262626] bg-[#151515] transition-colors hover:border-[#3a3a3a]"
      aria-label={`Open ${name} profile`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#1e1e1e]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-4xl text-[#3a3a3a]">
            {name.charAt(0)}
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0)_45%,rgba(10,10,10,0.9)_100%)]" />

        {profile.is_verified ? (
          <span className="absolute top-3 left-3 rounded-full bg-[#0c2a26]/90 px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.08em] text-[#2dd4bf] uppercase backdrop-blur-sm">
            Verified
          </span>
        ) : null}

        <div className="absolute right-4 bottom-4 left-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-medium tracking-[-0.01em] text-[#fafafa]">{name}</p>
              <p className="mt-0.5 truncate font-mono text-xs text-[#8a8a8a]">
                {profile.location || "Location TBD"}
              </p>
            </div>
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-[#3a3a3a] bg-[#0a0a0a]/60 text-[#8a8a8a] backdrop-blur-sm transition-colors group-hover:border-[#fafafa] group-hover:text-[#fafafa]">
              <ArrowUpRight className="size-4" aria-hidden />
            </span>
          </div>
          {tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#3a3a3a]/70 bg-[#0a0a0a]/55 px-2.5 py-0.5 text-[11px] font-medium text-[#eaeaea] capitalize backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
