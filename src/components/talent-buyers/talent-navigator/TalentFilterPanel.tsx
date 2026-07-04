"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Search, X } from "lucide-react";

import {
  ETHNICITY_OPTIONS,
  GENDER_OPTIONS,
  GENRE_OPTIONS,
  HEIGHT_OPTIONS,
  PROFILE_TYPE_OPTIONS,
  REPRESENTATION_OPTIONS,
  UNION_STATUS_OPTIONS,
  type NavigatorFilterOptions,
} from "@/lib/talent-navigator/filter-options";
import type { TalentNavigatorFilters } from "@/lib/talent-navigator/types";

export type SavedSearchOption = {
  id: string;
  label: string;
};

type TalentFilterPanelProps = {
  filters: TalentNavigatorFilters;
  filterOptions: NavigatorFilterOptions;
  savedSearches: SavedSearchOption[];
  savedSearchId: string;
  onChange: (partial: Partial<TalentNavigatorFilters>) => void;
  onSavedSearchChange: (id: string) => void;
  onClear: () => void;
  onSaveSearch?: () => void;
  open?: boolean;
  onClose?: () => void;
};

function FilterSelect({
  label,
  value,
  options,
  placeholder = "Any",
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="talent-navigator__filter-row-label">{label}</span>
      <select
        className="talent-navigator__field talent-navigator__select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterAccordionSection({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="talent-navigator__accordion">
      <button
        type="button"
        className="talent-navigator__accordion-trigger"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="talent-navigator__accordion-title">{title}</span>
        <span className="talent-navigator__accordion-meta">
          {!open && summary ? (
            <span className="talent-navigator__accordion-summary">{summary}</span>
          ) : null}
          <ChevronDown
            className={`talent-navigator__accordion-chevron size-3.5${open ? " talent-navigator__accordion-chevron--open" : ""}`}
            aria-hidden
          />
        </span>
      </button>
      {open ? <div className="talent-navigator__accordion-body">{children}</div> : null}
    </section>
  );
}

export function TalentFilterPanel({
  filters,
  filterOptions,
  savedSearches,
  savedSearchId,
  onChange,
  onSavedSearchChange,
  onClear,
  onSaveSearch,
  open = false,
  onClose,
}: TalentFilterPanelProps) {
  const activeChips = Object.entries(filters).filter(
    ([key, value]) => Boolean(value) && key !== "keyword",
  );

  return (
    <aside
      className={`talent-navigator__filter-panel talent-navigator__panel${open ? " talent-navigator__filter-panel--open" : ""}`}
      aria-label="Talent filters"
      aria-hidden={!open}
    >
      {open && onClose ? (
        <div className="flex items-center justify-end border-b border-white/6 px-3 py-2 lg:hidden">
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-lg text-white/60 hover:bg-white/6"
            onClick={onClose}
            aria-label="Close filters"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <div className="space-y-1">
          <span className="talent-navigator__filter-row-label">Saved Searches</span>
          <select
            className="talent-navigator__field talent-navigator__select"
            value={savedSearchId}
            onChange={(event) => onSavedSearchChange(event.target.value)}
          >
            <option value="">Select a saved search</option>
            {savedSearches.map((search) => (
              <option key={search.id} value={search.id}>
                {search.label}
              </option>
            ))}
          </select>
        </div>

        <label className="block space-y-1">
          <span className="talent-navigator__filter-row-label">Search</span>
          <div className="talent-navigator__search-wrap">
            <Search className="talent-navigator__search-icon size-3.5" aria-hidden />
            <input
              className="talent-navigator__field"
              value={filters.keyword}
              onChange={(event) => onChange({ keyword: event.target.value })}
              placeholder="Search by name, keyword, etc."
            />
          </div>
        </label>

        {activeChips.length ? (
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map(([key, value]) => (
              <button
                key={key}
                type="button"
                className="talent-navigator__chip talent-navigator__chip--filter"
                onClick={() => onChange({ [key]: "" } as Partial<TalentNavigatorFilters>)}
              >
                {value}
                <X className="size-3" aria-hidden />
              </button>
            ))}
          </div>
        ) : null}

        <div className="talent-navigator__accordion-group">
          <FilterAccordionSection title="Profile Type" summary={filters.subtype || undefined}>
            <FilterSelect
              label="Profile Type"
              value={filters.subtype}
              options={PROFILE_TYPE_OPTIONS}
              placeholder="Any"
              onChange={(value) => onChange({ subtype: value })}
            />
          </FilterAccordionSection>

          <FilterAccordionSection title="Genres" summary={filters.style || undefined}>
            <FilterSelect
              label="Genre"
              value={filters.style}
              options={GENRE_OPTIONS}
              placeholder="All Genres"
              onChange={(value) => onChange({ style: value })}
            />
          </FilterAccordionSection>

          <FilterAccordionSection title="Gender" summary={filters.gender || undefined}>
            <FilterSelect
              label="Gender"
              value={filters.gender}
              options={GENDER_OPTIONS}
              onChange={(value) => onChange({ gender: value })}
            />
          </FilterAccordionSection>

          <FilterAccordionSection title="Height" summary={filters.height || undefined}>
            <FilterSelect
              label="Height"
              value={filters.height}
              options={HEIGHT_OPTIONS}
              onChange={(value) => onChange({ height: value })}
            />
          </FilterAccordionSection>

          <FilterAccordionSection title="Location" summary={filters.location || undefined}>
            <label className="block space-y-1">
              <span className="talent-navigator__filter-row-label">City</span>
              <input
                className="talent-navigator__field"
                list="talent-navigator-location-options"
                value={filters.location}
                onChange={(event) => onChange({ location: event.target.value })}
                placeholder="Select city"
              />
              <datalist id="talent-navigator-location-options">
                {filterOptions.locations.map((location) => (
                  <option key={location} value={location} />
                ))}
              </datalist>
            </label>
          </FilterAccordionSection>

          <FilterAccordionSection title="Representation" summary={filters.representation || undefined}>
            <FilterSelect
              label="Representation"
              value={filters.representation}
              options={REPRESENTATION_OPTIONS}
              onChange={(value) => onChange({ representation: value })}
            />
          </FilterAccordionSection>

          <FilterAccordionSection title="Agency" summary={filters.agency || undefined}>
            <FilterSelect
              label="Agency"
              value={filters.agency}
              options={filterOptions.agencies}
              onChange={(value) => onChange({ agency: value })}
            />
          </FilterAccordionSection>

          <FilterAccordionSection title="Union Status" summary={filters.unionStatus || undefined}>
            <FilterSelect
              label="Union Status"
              value={filters.unionStatus}
              options={UNION_STATUS_OPTIONS}
              onChange={(value) => onChange({ unionStatus: value })}
            />
          </FilterAccordionSection>

          <FilterAccordionSection title="Ethnicity" summary={filters.ethnicity || undefined}>
            <FilterSelect
              label="Ethnicity"
              value={filters.ethnicity}
              options={ETHNICITY_OPTIONS}
              onChange={(value) => onChange({ ethnicity: value })}
            />
          </FilterAccordionSection>
        </div>
      </div>

      <div className="space-y-2 border-t border-white/6 p-3">
        <button
          type="button"
          className="talent-navigator__action-btn talent-navigator__action-btn--block"
          onClick={onSaveSearch}
        >
          Save Search
        </button>
        <button
          type="button"
          className="talent-navigator__action-btn talent-navigator__action-btn--ghost talent-navigator__action-btn--block text-white/45"
          onClick={onClear}
        >
          Clear All
        </button>
      </div>
    </aside>
  );
}
