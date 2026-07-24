"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { Building2, Check, Layers, UserRound } from "lucide-react";

import { AuthInput } from "@/components/auth/ui";
import { SetupFieldBlock } from "@/components/auth/SetupFieldBlock";
import { setupChoiceCard } from "@/lib/setup-flow/form-styles";
import type { ClientSearchResult } from "@/lib/clients/types";
import type { TalentBuyerOrganizationRelationship } from "@/types/talent-buyers";

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 350;

export type OrganizationSelection = {
  name: string;
  website: string;
  brandDomain: string;
  imageUrl?: string | null;
};

const relationshipOptions: Array<{
  value: TalentBuyerOrganizationRelationship;
  title: string;
  description: string;
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}> = [
  {
    value: "organization",
    title: "I work at an organization",
    description: "Connect your company, agency, or studio.",
    Icon: Building2,
  },
  {
    value: "independent",
    title: "I’m independent or freelance",
    description: "No company details needed.",
    Icon: UserRound,
  },
  {
    value: "multiple",
    title: "I work with multiple organizations",
    description: "Choose one primary org for now.",
    Icon: Layers,
  },
];

export function OrganizationPicker({
  relationship,
  organizationName,
  organizationWebsite,
  organizationBrandDomain: _organizationBrandDomain,
  organizationImageUrl,
  onRelationshipChange,
  onOrganizationChange,
}: {
  relationship: TalentBuyerOrganizationRelationship | "";
  organizationName: string;
  organizationWebsite: string;
  organizationBrandDomain: string;
  organizationImageUrl?: string | null;
  onRelationshipChange: (value: TalentBuyerOrganizationRelationship) => void;
  onOrganizationChange: (value: OrganizationSelection) => void;
}) {
  void _organizationBrandDomain;
  const needsOrgSearch = relationship === "organization" || relationship === "multiple";
  const [query, setQuery] = useState(organizationName);
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(organizationName);
  }, [organizationName]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const canSearch = !manualMode && query.trim().length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    if (!needsOrgSearch || !open || !canSearch) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/clients/companies?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          results?: ClientSearchResult[];
          error?: string;
        };
        if (!response.ok) {
          setError(payload.error ?? "Organization search failed.");
          setResults([]);
          return;
        }
        setResults(payload.results ?? []);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : "Organization search failed.");
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [needsOrgSearch, open, canSearch, query]);

  function selectResult(result: ClientSearchResult) {
    const website = result.domain ? `https://${result.domain}` : "";
    onOrganizationChange({
      name: result.name,
      website,
      brandDomain: result.domain ?? "",
      imageUrl: result.imageUrl,
    });
    setQuery(result.name);
    setOpen(false);
    setResults([]);
    setManualMode(false);
    setError(null);
  }

  function enableManualEntry() {
    setManualMode(true);
    setOpen(false);
    setResults([]);
    onOrganizationChange({
      name: query.trim() || organizationName,
      website: organizationWebsite,
      brandDomain: "",
      imageUrl: null,
    });
  }

  return (
    <div className="signup-split-stack signup-split-stack--sections">
      <div className="signup-split-choice-grid">
        {relationshipOptions.map((option) => {
          const selected = relationship === option.value;
          const Icon = option.Icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onRelationshipChange(option.value);
                if (option.value === "independent") {
                  onOrganizationChange({ name: "", website: "", brandDomain: "", imageUrl: null });
                  setManualMode(false);
                  setQuery("");
                }
              }}
              className={setupChoiceCard(selected)}
              aria-pressed={selected}
            >
              <span className="signup-split-choice__icon" aria-hidden>
                <Icon className="size-4" />
              </span>
              <span className="signup-split-choice__copy">
                <span className="signup-split-choice__title">{option.title}</span>
                <span className="signup-split-choice__description">{option.description}</span>
              </span>
              <span className="signup-split-choice__check" aria-hidden>
                {selected ? <Check className="size-4" strokeWidth={2.5} /> : null}
              </span>
            </button>
          );
        })}
      </div>

      {needsOrgSearch ? (
        <>
          <hr className="signup-split-fade-rule" />
          <div className="grid gap-4">
            {!manualMode ? (
              <SetupFieldBlock
                label="Company, agency, or organization"
                hint={
                  relationship === "multiple"
                    ? "Pick a primary org for now."
                    : "Search for your company or studio."
                }
              >
                <div ref={containerRef} className="relative">
                  <div className="signup-split-search-field">
                    <span className="signup-split-search-field__icon" aria-hidden>
                      {organizationImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={organizationImageUrl} alt="" />
                      ) : (
                        <Building2 className="size-4" />
                      )}
                    </span>
                    <input
                      value={query}
                      onChange={(event) => {
                        const next = event.target.value;
                        setQuery(next);
                        onOrganizationChange({
                          name: next,
                          website: organizationWebsite,
                          brandDomain: "",
                          imageUrl: null,
                        });
                        setOpen(true);
                      }}
                      onFocus={() => setOpen(true)}
                      placeholder="Search organizations"
                      className="signup-split-search-field__input"
                      autoComplete="off"
                    />
                  </div>

                  {open && query.trim().length > 0 ? (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface-card)] shadow-[var(--shadow-raised)]">
                      {!canSearch ? (
                        <p className="px-4 py-3 text-sm text-[var(--ink-soft)]">
                          Keep typing to search…
                        </p>
                      ) : null}
                      {canSearch && loading ? (
                        <p className="px-4 py-3 text-sm text-[var(--ink-soft)]">Searching…</p>
                      ) : null}
                      {error ? <p className="px-4 py-3 text-sm text-rose-700">{error}</p> : null}
                      {canSearch && !loading && !error && results.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-[var(--ink-soft)]">No matches found.</p>
                      ) : null}
                      {results.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => selectResult(result)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--tone)]"
                        >
                          {result.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={result.imageUrl}
                              alt=""
                              className="size-8 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <span className="size-8 shrink-0 rounded bg-[var(--line)]" aria-hidden />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-[var(--ink)]">
                              {result.name}
                            </span>
                            {result.subtitle ? (
                              <span className="block truncate text-xs text-[var(--ink-soft)]">
                                {result.subtitle}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={enableManualEntry}
                        className="block w-full border-t border-[var(--line)] px-4 py-3 text-left text-sm font-medium text-[var(--ink)] hover:bg-[var(--tone)]"
                      >
                        My organization isn’t listed
                      </button>
                    </div>
                  ) : null}
                </div>
              </SetupFieldBlock>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <SetupFieldBlock
                    label="Organization name"
                    hint={
                      relationship === "multiple"
                        ? "Pick a primary org for now."
                        : "Enter your company or studio."
                    }
                  >
                    <AuthInput
                      value={organizationName}
                      onChange={(event) =>
                        onOrganizationChange({
                          name: event.target.value,
                          website: organizationWebsite,
                          brandDomain: "",
                          imageUrl: null,
                        })
                      }
                      placeholder="Studio, agency, or company"
                    />
                  </SetupFieldBlock>
                </div>
                <SetupFieldBlock label="Website" hint="Optional">
                  <AuthInput
                    value={organizationWebsite}
                    onChange={(event) =>
                      onOrganizationChange({
                        name: organizationName,
                        website: event.target.value,
                        brandDomain: "",
                        imageUrl: null,
                      })
                    }
                    placeholder="https://"
                  />
                </SetupFieldBlock>
                <button
                  type="button"
                  className="self-end text-sm font-medium text-[var(--accent-dark)] underline-offset-2 hover:underline"
                  onClick={() => {
                    setManualMode(false);
                    setQuery(organizationName);
                  }}
                >
                  Search organizations instead
                </button>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
