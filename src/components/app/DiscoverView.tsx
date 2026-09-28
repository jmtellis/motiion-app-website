"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import { useDiscoverTalent } from "@/components/app/discover-selection";
import { TalentCard } from "@/components/search/TalentCard";
import { styleOptions, talentSubtypeOptions } from "@/lib/mock-data";
import { explicitWorkedWith, pickCreditRewrite } from "@/lib/talent-navigator/credit-intent";
import { searchProfileToTalent } from "@/lib/talent-navigator/profile-adapter";
import { suggestCreditCollaborators } from "@/lib/talent/discover-actions";
import type { SearchFilters, SearchResult } from "@/types/search";

function buildSearchHref(filters: SearchFilters, page: number, credit?: string) {
  const params = new URLSearchParams();
  if (credit) params.set("credit", credit);
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.location) params.set("location", filters.location);
  if (filters.subtype) params.set("subtype", filters.subtype);
  if (filters.style) params.set("style", filters.style);
  params.set("page", String(page));
  const query = params.toString();
  return query ? `/discover?${query}` : "/discover";
}

const inputClass =
  "h-10 w-full rounded-full border border-[var(--ds-border)] bg-[var(--ds-background)] px-3.5 text-sm text-[var(--ds-text-default)] outline-none transition placeholder:text-[var(--ds-subtle)] focus:border-white/30 focus:bg-[var(--ds-surface)] focus:outline-none focus:shadow-none";

export function DiscoverView({
  filters,
  result,
  credit = "",
}: {
  filters: SearchFilters;
  result: SearchResult;
  credit?: string;
}) {
  const router = useRouter();
  const { openTalent, lookupTalent } = useDiscoverTalent();
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextKeyword = String(form.get("keyword") ?? "");
    const location = String(form.get("location") ?? "");
    const subtype = String(form.get("subtype") ?? "");
    const style = String(form.get("style") ?? "");
    const explicit = explicitWorkedWith(nextKeyword);
    const names = !explicit && nextKeyword.trim().length >= 2
      ? await suggestCreditCollaborators(nextKeyword)
      : [];
    const creditName = explicit ?? pickCreditRewrite(nextKeyword, names);
    if (creditName && !location && !subtype && !style) {
      router.push(`/discover?credit=${encodeURIComponent(creditName)}`);
      return;
    }
    const params = new URLSearchParams();
    if (nextKeyword.trim()) params.set("keyword", nextKeyword.trim());
    if (location) params.set("location", location);
    if (subtype) params.set("subtype", subtype);
    if (style) params.set("style", style);
    params.set("page", "1");
    router.push(`/discover?${params.toString()}`);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1.5 border-b border-[var(--ds-border)] pb-6">
        <p className="font-mono text-xs font-medium tracking-[0.08em] text-[var(--ds-muted)] uppercase">
          Discover
        </p>
        <h1 className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--ds-text-default)]">
          Browse
        </h1>
        <p className="text-sm text-[var(--ds-muted)]">Find Talent across Motiion.</p>
      </header>

      {result.usingFallbackData ? (
        <p className="rounded-[8px] border border-[rgb(227_160_8_/_0.35)] bg-[rgb(227_160_8_/_0.08)] px-4 py-2.5 text-sm text-[#e3a008]">
          Showing sample profiles until live Supabase search is connected.
        </p>
      ) : null}

      <form
        action="/discover"
        className="rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4"
        onSubmit={(event) => void onSubmit(event)}
      >
        <input type="hidden" name="page" value="1" />
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--ds-subtle)]" aria-hidden />
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
            className="h-10 rounded-full bg-[#fafafa] px-5 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-[#e6e6e6]"
          >
            Search
          </button>
        </div>
      </form>

      <section className="space-y-6">
        <p className="font-mono text-xs font-medium tracking-[0.08em] text-[var(--ds-muted)] uppercase">
          {result.total > 0 ? `${result.total} profiles` : "No matches"}
        </p>

        {result.items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((item) => (
              <TalentCard
                key={item.id}
                profile={item}
                onOpen={(profile) => openTalent(lookupTalent(profile.id) ?? searchProfileToTalent(profile, 0))}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface)] px-6 py-12 text-center">
            <h2 className="text-lg font-medium text-[var(--ds-text-default)]">No matches for this search</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--ds-muted)]">
              {credit
                ? `No talent found who worked with ${credit}.`
                : "Try broadening location or removing a filter."}
            </p>
            <Link
              href="/discover"
              className="mt-6 inline-flex h-10 items-center rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] px-5 text-sm font-medium text-[var(--ds-text-default)] transition-colors hover:bg-[#2a2a2a]"
            >
              Clear filters
            </Link>
          </div>
        )}

        {totalPages > 1 ? (
          <nav aria-label="Discover pagination" className="flex items-center justify-center gap-4">
            {result.page > 1 ? (
              <Link
                href={buildSearchHref(filters, result.page - 1, credit)}
                className="inline-flex h-9 items-center rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] px-4 text-sm font-medium text-[var(--ds-text-default)] transition-colors hover:bg-[#2a2a2a]"
              >
                Previous
              </Link>
            ) : null}
            <span className="font-mono text-xs tracking-[0.08em] text-[var(--ds-subtle)] uppercase">
              Page {result.page} / {totalPages}
            </span>
            {result.page < totalPages ? (
              <Link
                href={buildSearchHref(filters, result.page + 1, credit)}
                className="inline-flex h-9 items-center rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] px-4 text-sm font-medium text-[var(--ds-text-default)] transition-colors hover:bg-[#2a2a2a]"
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
