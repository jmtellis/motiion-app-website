"use client";

import type { ReactNode } from "react";
import {
  BadgeCheck,
  Bookmark,
  Building2,
  Globe,
  MapPin,
  Music,
  Ruler,
  Search,
  User,
  Users,
  Briefcase,
  X,
} from "lucide-react";

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
};

function FilterSection({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="talent-navigator__filter-section">
      <header className="talent-navigator__filter-section-header">
        <span className="talent-navigator__filter-section-icon" aria-hidden>
          {icon}
        </span>
        <h3 className="talent-navigator__filter-section-title">{title}</h3>
        {hint ? <span className="talent-navigator__filter-section-hint">{hint}</span> : null}
      </header>
      {children}
    </section>
  );
}

function OptionChips({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="talent-navigator__filter-options" role="group">
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            className={`talent-navigator__filter-option${selected ? " talent-navigator__filter-option--selected" : ""}`}
            aria-pressed={selected}
            onClick={() => onChange(selected ? "" : option)}
          >
            {option}
          </button>
        );
      })}
    </div>
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
}: TalentFilterPanelProps) {
  const activeChips: Array<{ key: string; label: string; clear: Partial<TalentNavigatorFilters> }> = [];
  for (const [key, value] of Object.entries(filters) as [keyof TalentNavigatorFilters, TalentNavigatorFilters[keyof TalentNavigatorFilters]][]) {
    if (key === "keyword" || key === "openRoleId" || key === "relationshipMatchMode") continue;
    if (key === "resolvedArtistIds" || key === "resolvedChoreographerIds" || key === "resolvedProductionIds") {
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (!item) return;
        const next = [...value];
        next.splice(index, 1);
        activeChips.push({
          key: `${String(key)}-${item}`,
          label: String(item),
          clear: { [key]: next } as Partial<TalentNavigatorFilters>,
        });
      });
      continue;
    }
    if (typeof value === "string" && value) {
      activeChips.push({
        key: String(key),
        label: value,
        clear: { [key]: "" } as Partial<TalentNavigatorFilters>,
      });
    }
  }
  if (filters.relationshipMatchMode === "any" && (filters.artists.length > 1 || filters.choreographers.length > 1)) {
    activeChips.push({
      key: "match-any",
      label: "Match any",
      clear: { relationshipMatchMode: "all" },
    });
  }

  if (!open) return null;

  return (
    <aside
      className="talent-navigator__filter-panel"
      aria-label="Talent filters"
      role="dialog"
      aria-modal="true"
    >
      <div className="talent-navigator__filter-backdrop" aria-hidden />

      <div className="talent-navigator__filter-content">
        <div className="talent-navigator__filter-body">
        <div className="talent-navigator__filter-inner">
          <div className="talent-navigator__filter-toprow">
            <label className="talent-navigator__filter-search">
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

            <label className="talent-navigator__filter-saved">
              <span className="talent-navigator__filter-row-label">
                <Bookmark className="size-3 -translate-y-px" aria-hidden /> Saved Searches
              </span>
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
            </label>
          </div>

          {activeChips.length ? (
            <div className="talent-navigator__filter-active-row">
              <span className="talent-navigator__filter-active-label">Active:</span>
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className="talent-navigator__chip talent-navigator__chip--filter"
                  onClick={() => onChange(chip.clear)}
                >
                  {chip.label}
                  <X className="size-3" aria-hidden />
                </button>
              ))}
            </div>
          ) : null}

          <div className="talent-navigator__filter-grid">
            <FilterSection icon={<Music className="size-3.5" />} title="Genres" hint="Pick one">
              <OptionChips
                options={GENRE_OPTIONS}
                value={filters.style}
                onChange={(value) => onChange({ style: value })}
              />
            </FilterSection>

            <FilterSection icon={<User className="size-3.5" />} title="Profile Type">
              <OptionChips
                options={PROFILE_TYPE_OPTIONS}
                value={filters.subtype}
                onChange={(value) => onChange({ subtype: value })}
              />
            </FilterSection>

            <FilterSection icon={<Users className="size-3.5" />} title="Gender">
              <OptionChips
                options={GENDER_OPTIONS}
                value={filters.gender}
                onChange={(value) => onChange({ gender: value })}
              />
            </FilterSection>

            <FilterSection icon={<Ruler className="size-3.5" />} title="Height">
              <OptionChips
                options={HEIGHT_OPTIONS}
                value={filters.height}
                onChange={(value) => onChange({ height: value })}
              />
            </FilterSection>

            <FilterSection icon={<BadgeCheck className="size-3.5" />} title="Credit verification">
              <OptionChips
                options={["Verified credits only"]}
                value={
                  filters.verificationStatuses.includes("motiion_verified") ||
                  filters.verificationStatuses.includes("industry_confirmed")
                    ? "Verified credits only"
                    : ""
                }
                onChange={(value) =>
                  onChange({
                    verificationStatuses: value
                      ? ["motiion_verified", "industry_confirmed"]
                      : [],
                  })
                }
              />
              <div className="talent-navigator__filter-options" role="group" aria-label="Match mode">
                <button
                  type="button"
                  className={`talent-navigator__filter-option${filters.relationshipMatchMode === "all" ? " talent-navigator__filter-option--selected" : ""}`}
                  aria-pressed={filters.relationshipMatchMode === "all"}
                  onClick={() => onChange({ relationshipMatchMode: "all" })}
                >
                  Match all
                </button>
                <button
                  type="button"
                  className={`talent-navigator__filter-option${filters.relationshipMatchMode === "any" ? " talent-navigator__filter-option--selected" : ""}`}
                  aria-pressed={filters.relationshipMatchMode === "any"}
                  onClick={() => onChange({ relationshipMatchMode: "any" })}
                >
                  Match any
                </button>
              </div>
            </FilterSection>

            <FilterSection icon={<BadgeCheck className="size-3.5" />} title="Union Status">
              <OptionChips
                options={UNION_STATUS_OPTIONS}
                value={filters.unionStatus}
                onChange={(value) => onChange({ unionStatus: value })}
              />
            </FilterSection>

            <FilterSection icon={<Briefcase className="size-3.5" />} title="Representation">
              <OptionChips
                options={REPRESENTATION_OPTIONS}
                value={filters.representation}
                onChange={(value) => onChange({ representation: value })}
              />
            </FilterSection>

            <FilterSection icon={<MapPin className="size-3.5" />} title="Location">
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
            </FilterSection>

            <FilterSection icon={<Building2 className="size-3.5" />} title="Agency">
              <select
                className="talent-navigator__field talent-navigator__select"
                value={filters.agency}
                onChange={(event) => onChange({ agency: event.target.value })}
              >
                <option value="">Any agency</option>
                {filterOptions.agencies.map((agency) => (
                  <option key={agency} value={agency}>
                    {agency}
                  </option>
                ))}
              </select>
            </FilterSection>

            <FilterSection icon={<Globe className="size-3.5" />} title="Ethnicity">
              <OptionChips
                options={ETHNICITY_OPTIONS}
                value={filters.ethnicity}
                onChange={(value) => onChange({ ethnicity: value })}
              />
            </FilterSection>
          </div>
        </div>
        </div>

        <div className="talent-navigator__filter-footer">
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
      </div>
    </aside>
  );
}
