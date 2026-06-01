import Link from "next/link";
import { redirect } from "next/navigation";

import { HeroSearchBar } from "@/components/landing/HeroSearchBar";
import { MarketingShell } from "@/components/landing/MarketingShell";
import { SectionHeader } from "@/components/landing/SectionHeader";
import { TalentCard } from "@/components/search/TalentCard";
import { isOnboardingComplete } from "@/lib/auth/profile";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { searchTalentProfiles } from "@/lib/search/search-profiles";
import type { SearchFilters } from "@/types/search";

function buildSearchHref(filters: SearchFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.location) params.set("location", filters.location);
  if (filters.subtype) params.set("subtype", filters.subtype);
  if (filters.style) params.set("style", filters.style);
  params.set("page", String(page));
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = await getCurrentUserProfile();

  if (profile && isOnboardingComplete(profile)) {
    const forward = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") forward.set(key, value);
    }
    const suffix = forward.toString();
    redirect(suffix ? `/discover?${suffix}` : "/discover");
  }

  const filters: SearchFilters = {
    keyword: typeof params.keyword === "string" ? params.keyword : "",
    location: typeof params.location === "string" ? params.location : "",
    subtype:
      typeof params.subtype === "string" ? (params.subtype as SearchFilters["subtype"]) : "",
    style: typeof params.style === "string" ? params.style : "",
    page:
      typeof params.page === "string" && !Number.isNaN(Number(params.page))
        ? Number(params.page)
        : 1,
  };

  const result = await searchTalentProfiles(filters);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const pageTitle =
    result.total > 0 ? `${result.total} public talent profiles` : "No public talent matches found";

  return (
    <MarketingShell activeTab={null}>
      <main className="mx-auto max-w-6xl px-6 py-10 pt-28 lg:px-10 lg:pt-10">
        <SectionHeader
          eyebrow={pageTitle}
          title="Search the Motiion talent database"
          description="Designed for casting and creative teams. Results link to public profile pages on motiion.app."
        />

        {result.usingFallbackData ? (
          <p className="mt-4 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Showing sample profiles until live Supabase search is connected in production.
          </p>
        ) : null}

        <div className="mt-8">
          <HeroSearchBar filters={filters} />
        </div>

        <section className="mt-12 space-y-8">
          {result.items.length ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {result.items.map((item) => (
                <TalentCard key={item.id} profile={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[var(--line)] bg-white px-8 py-16 text-center">
              <h2 className="text-2xl font-semibold text-[var(--ink)]">No matches for this combination yet</h2>
              <p className="mx-auto mt-3 max-w-xl text-[var(--ink-soft)]">
                Try broadening the location, removing one of the filters, or searching by specialty instead of a full
                phrase.
              </p>
              <Link href="/search" className="btn-outline mt-6 inline-flex">
                Clear filters
              </Link>
            </div>
          )}

          {totalPages > 1 ? (
            <nav aria-label="Search pagination" className="flex items-center justify-center gap-3">
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
      </main>
    </MarketingShell>
  );
}
