import Link from "next/link";

import { HeroSearchBar } from "@/components/landing/HeroSearchBar";
import { TalentCard } from "@/components/search/TalentCard";
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
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.2em] text-[var(--accent)] uppercase">Discover</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">Find talent & opportunities</h1>
        <p className="max-w-2xl text-base text-[var(--ink-soft)]">
          Search dancers and choreographers, then open public profiles on Motiion.
        </p>
      </header>

      {result.usingFallbackData ? (
        <p className="rounded-[var(--radius-chip)] border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Showing sample profiles until live Supabase search is connected.
        </p>
      ) : null}

      <div className="ui-command-panel">
        <HeroSearchBar filters={filters} action="/discover" embedded />
      </div>

      <section className="space-y-8">
        <p className="text-sm text-[var(--ink-soft)]">
          {result.total > 0 ? `${result.total} profiles` : "No matches"}
        </p>

        {result.items.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {result.items.map((item) => (
              <TalentCard key={item.id} profile={item} />
            ))}
          </div>
        ) : (
          <div className="ui-muted-panel px-6 py-10 text-center">
            <h2 className="text-2xl font-semibold text-[var(--ink)]">No matches for this search</h2>
            <p className="mx-auto mt-3 max-w-xl text-[var(--ink-soft)]">
              Try broadening location or removing a filter.
            </p>
            <Link href="/discover" className="btn-outline mt-6 inline-flex">
              Clear filters
            </Link>
          </div>
        )}

        {totalPages > 1 ? (
          <nav aria-label="Discover pagination" className="flex items-center justify-center gap-3">
            {result.page > 1 ? (
              <Link href={buildSearchHref(filters, result.page - 1)} className="btn-outline">
                Previous
              </Link>
            ) : null}
            <span className="text-sm text-[var(--ink-soft)]">
              Page {result.page} of {totalPages}
            </span>
            {result.page < totalPages ? (
              <Link href={buildSearchHref(filters, result.page + 1)} className="btn-outline">
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
