import Link from "next/link";
import { Search } from "lucide-react";

import { TalentCard } from "@/components/search/TalentCard";
import { styleOptions, talentSubtypeOptions } from "@/lib/mock-data";
import type { SearchFilters, SearchResult } from "@/types/search";

function buildSearchHref(filters: SearchFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.location) params.set("location", filters.location);
  if (filters.subtype) params.set("subtype", filters.subtype);
  if (filters.style) params.set("style", filters.style);
  params.set("page", String(page));
  const query = params.toString();
  return query ? `/discover?${query}` : "/discover";
}

const inputClass =
  "h-10 w-full rounded-[8px] border border-[#262626] bg-[#0a0a0a] px-3.5 text-sm text-[#eaeaea] outline-none transition placeholder:text-[#5a5a5a] focus:border-[rgb(45_212_191_/_0.55)] focus:bg-[#151515] focus:shadow-[0_0_0_3px_rgb(45_212_191_/_0.15)]";

export function DiscoverView({
  filters,
  result,
}: {
  filters: SearchFilters;
  result: SearchResult;
}) {
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="space-y-8">
      <header className="space-y-1.5 border-b border-[#262626] pb-6">
        <p className="font-mono text-xs font-medium tracking-[0.08em] text-[#5a5a5a] uppercase">Discover</p>
        <h1 className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.02em] text-[#fafafa]">
          Find talent & opportunities
        </h1>
      </header>

      {result.usingFallbackData ? (
        <p className="rounded-[8px] border border-[rgb(227_160_8_/_0.35)] bg-[rgb(227_160_8_/_0.08)] px-4 py-2.5 text-sm text-[#e3a008]">
          Showing sample profiles until live Supabase search is connected.
        </p>
      ) : null}

      <form
        action="/discover"
        className="rounded-[14px] border border-[#262626] bg-[#151515] p-4"
      >
        <input type="hidden" name="page" value="1" />
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#5a5a5a]" aria-hidden />
            <input
              name="keyword"
              defaultValue={filters.keyword ?? ""}
              placeholder="Name, style, or skill"
              aria-label="Search keyword"
              className={`${inputClass} pl-9`}
            />
          </div>
          <input
            name="location"
            defaultValue={filters.location ?? ""}
            placeholder="Location"
            aria-label="Location"
            className={inputClass}
          />
          <select
            name="subtype"
            defaultValue={filters.subtype ?? ""}
            aria-label="Talent type"
            className={inputClass}
          >
            <option value="">All talent</option>
            {talentSubtypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="style"
            defaultValue={filters.style ?? ""}
            aria-label="Style"
            className={inputClass}
          >
            <option value="">Any style</option>
            {styleOptions.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 rounded-[8px] bg-[#fafafa] px-5 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-[#e6e6e6]"
          >
            Search
          </button>
        </div>
      </form>

      <section className="space-y-6">
        <p className="font-mono text-xs font-medium tracking-[0.08em] text-[#8a8a8a] uppercase">
          {result.total > 0 ? `${result.total} profiles` : "No matches"}
        </p>

        {result.items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((item) => (
              <TalentCard key={item.id} profile={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] border border-dashed border-[#262626] bg-[#151515] px-6 py-12 text-center">
            <h2 className="text-lg font-medium text-[#fafafa]">No matches for this search</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#8a8a8a]">
              Try broadening location or removing a filter.
            </p>
            <Link
              href="/discover"
              className="mt-6 inline-flex h-10 items-center rounded-[8px] border border-[#262626] bg-[#1e1e1e] px-5 text-sm font-medium text-[#eaeaea] transition-colors hover:bg-[#2a2a2a]"
            >
              Clear filters
            </Link>
          </div>
        )}

        {totalPages > 1 ? (
          <nav aria-label="Discover pagination" className="flex items-center justify-center gap-4">
            {result.page > 1 ? (
              <Link
                href={buildSearchHref(filters, result.page - 1)}
                className="inline-flex h-9 items-center rounded-[8px] border border-[#262626] bg-[#1e1e1e] px-4 text-sm font-medium text-[#eaeaea] transition-colors hover:bg-[#2a2a2a]"
              >
                Previous
              </Link>
            ) : null}
            <span className="font-mono text-xs tracking-[0.08em] text-[#5a5a5a] uppercase">
              Page {result.page} / {totalPages}
            </span>
            {result.page < totalPages ? (
              <Link
                href={buildSearchHref(filters, result.page + 1)}
                className="inline-flex h-9 items-center rounded-[8px] border border-[#262626] bg-[#1e1e1e] px-4 text-sm font-medium text-[#eaeaea] transition-colors hover:bg-[#2a2a2a]"
              >
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
