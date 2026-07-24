"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import {
  Bookmark,
  Building2,
  Check,
  ChevronDown,
  CircleDot,
  Mars,
  Search,
  UserRound,
  Venus,
  X,
} from "lucide-react";

import { CastingWizardChoiceCheck } from "@/components/talent-buyers/casting/wizard-steps/casting-wizard-shared";
import {
  ETHNICITY_OPTIONS,
  EYE_COLOR_OPTIONS,
  EYE_COLOR_SWATCHES,
  GENDER_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_COLOR_SWATCHES,
  PROFILE_TYPE_OPTIONS,
  REPRESENTATION_OPTIONS,
  ROLE_GENRE_OPTIONS,
  ROLE_SKILL_OPTIONS,
  UNION_STATUS_OPTIONS,
  type NavigatorAgencyOption,
  type NavigatorFilterOptions,
} from "@/lib/talent-navigator/filter-options";
import {
  formatHeightFilterLabel,
  HEIGHT_SLIDER_MAX,
  HEIGHT_SLIDER_MIN,
  inchesToHeightLabel,
  parseHeightFilter,
  serializeHeightFilter,
  type HeightFilterMode,
} from "@/lib/talent-navigator/height-filter";
import type { TalentNavigatorFilters } from "@/lib/talent-navigator/types";

import "../project/casting-create-wizard.css";
import "../project/project-create.css";

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
  onClear?: () => void;
  onSaveSearch?: () => void;
  onDeleteSavedSearch?: () => void;
  onClose?: () => void;
  open?: boolean;
  /** Full-stage overlay (Discover) vs in-card body (Browse cover). Same fields either way. */
  variant?: "overlay" | "embedded";
};

type SelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  imageUrl?: string | null;
};

function FilterSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="talent-navigator__filter-field-row">
      <h3 className="talent-navigator__filter-field-label">
        <span>{title}</span>
        {count != null && count > 0 ? (
          <span className="talent-navigator__filter-section-count">{count}</span>
        ) : null}
      </h3>
      <div className="talent-navigator__filter-field-options">{children}</div>
    </section>
  );
}

function useDropdownDismiss(
  open: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
  menuRef?: RefObject<HTMLDivElement | null>,
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (ref.current?.contains(target) || menuRef?.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuRef, open, setOpen]);

  return ref;
}

function useDropdownMenuPosition(
  open: boolean,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const [placement, setPlacement] = useState<"below" | "above">("below");

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }

    function update() {
      const container = containerRef.current;
      if (!container) return;

      const trigger =
        container.querySelector<HTMLElement>(".talent-navigator__filter-dropdown-trigger") ??
        container;
      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 8;
      const gap = 6;
      const preferredMax = 256;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const placeAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
      const available = Math.max(120, placeAbove ? spaceAbove - gap : spaceBelow - gap);
      const maxHeight = Math.min(preferredMax, available);

      setPlacement(placeAbove ? "above" : "below");
      setMenuStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        maxHeight,
        zIndex: 80,
        ...(placeAbove
          ? { bottom: window.innerHeight - rect.top + gap, top: "auto" }
          : { top: rect.bottom + gap, bottom: "auto" }),
      });
    }

    update();

    const scrollParent = containerRef.current?.closest(".talent-navigator__filter-main");
    scrollParent?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      scrollParent?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [containerRef, open]);

  return { menuStyle, placement };
}

function FilterDropdownMenu({
  open,
  containerRef,
  menuRef,
  children,
}: {
  open: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const { menuStyle, placement } = useDropdownMenuPosition(open, containerRef);
  if (!open || !menuStyle || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`project-create__location-dropdown talent-navigator__filter-dropdown-menu talent-navigator__filter-dropdown-menu--${placement}`}
      role="listbox"
      style={menuStyle}
    >
      {children}
    </div>,
    document.body,
  );
}

function FilterSingleSelect({
  value,
  options,
  placeholder,
  disabled = false,
  leading,
  onChange,
}: {
  value: string;
  options: readonly SelectOption[];
  placeholder: string;
  disabled?: boolean;
  leading?: ReactNode;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useDropdownDismiss(open, setOpen, menuRef);
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <div className="talent-navigator__filter-dropdown" ref={containerRef}>
      <button
        type="button"
        className="talent-navigator__filter-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {leading}
        {selected?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected.imageUrl} alt="" className="talent-navigator__filter-dropdown-thumb" />
        ) : selected?.icon ? (
          <span className="talent-navigator__filter-dropdown-leading" aria-hidden>
            {selected.icon}
          </span>
        ) : null}
        <span className="talent-navigator__filter-dropdown-value">
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="talent-navigator__filter-dropdown-chevron size-3.5" aria-hidden />
      </button>

      <FilterDropdownMenu open={open} containerRef={containerRef} menuRef={menuRef}>
        <div className="talent-navigator__filter-dropdown-results">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value || "__any"}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`project-create__location-option talent-navigator__filter-dropdown-option${
                  isSelected ? " talent-navigator__filter-dropdown-option--selected" : ""
                }`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={option.imageUrl}
                    alt=""
                    className="talent-navigator__filter-dropdown-thumb"
                  />
                ) : option.icon ? (
                  <span className="talent-navigator__filter-dropdown-leading" aria-hidden>
                    {option.icon}
                  </span>
                ) : null}
                <span className="talent-navigator__filter-dropdown-option-label">{option.label}</span>
                {isSelected ? <Check className="size-3.5 shrink-0 opacity-80" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </FilterDropdownMenu>
    </div>
  );
}

function FilterMultiSelect({
  options,
  selected,
  placeholder,
  searchPlaceholder,
  onChange,
}: {
  options: readonly SelectOption[];
  selected: string[];
  placeholder: string;
  searchPlaceholder: string;
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useDropdownDismiss(open, setOpen, menuRef);
  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [normalized, options]);

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length <= 2
        ? selected.join(", ")
        : `${selected.length} selected`;

  function toggle(option: string) {
    onChange(
      selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option],
    );
  }

  return (
    <div className="talent-navigator__filter-dropdown" ref={containerRef}>
      <button
        type="button"
        className="talent-navigator__filter-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="talent-navigator__filter-dropdown-value">{summary}</span>
        <ChevronDown className="talent-navigator__filter-dropdown-chevron size-3.5" aria-hidden />
      </button>

      <FilterDropdownMenu open={open} containerRef={containerRef} menuRef={menuRef}>
        <div className="talent-navigator__filter-dropdown-search">
          <Search className="size-3.5 shrink-0 opacity-45" aria-hidden />
          <input
            className="talent-navigator__filter-dropdown-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            autoComplete="off"
          />
        </div>
        <div className="talent-navigator__filter-dropdown-results">
          <button
            type="button"
            role="option"
            aria-selected={selected.length === 0}
            className={`project-create__location-option talent-navigator__filter-dropdown-option${
              selected.length === 0 ? " talent-navigator__filter-dropdown-option--selected" : ""
            }`}
            onClick={() => onChange([])}
          >
            <span className="talent-navigator__filter-dropdown-option-label">Any</span>
            <CastingWizardChoiceCheck selected={selected.length === 0} />
          </button>
          {filtered.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`project-create__location-option talent-navigator__filter-dropdown-option${
                  isSelected ? " talent-navigator__filter-dropdown-option--selected" : ""
                }`}
                onClick={() => toggle(option.value)}
              >
                {option.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={option.imageUrl}
                    alt=""
                    className="talent-navigator__filter-dropdown-thumb"
                  />
                ) : option.icon ? (
                  <span className="talent-navigator__filter-dropdown-leading" aria-hidden>
                    {option.icon}
                  </span>
                ) : null}
                <span className="talent-navigator__filter-dropdown-option-label">{option.label}</span>
                <CastingWizardChoiceCheck selected={isSelected} />
              </button>
            );
          })}
          {filtered.length === 0 ? (
            <p className="project-create__location-hint">No matches for “{query.trim()}”.</p>
          ) : null}
        </div>
      </FilterDropdownMenu>
    </div>
  );
}

function ColorSwatchField({
  options,
  selected,
  swatches,
  columns,
  onChange,
}: {
  options: readonly string[];
  selected: string[];
  swatches: Record<string, string>;
  columns: 3 | 4;
  onChange: (next: string[]) => void;
}) {
  return (
    <div
      className={`talent-navigator__filter-swatch-grid talent-navigator__filter-swatch-grid--cols-${columns}`}
      role="group"
    >
      <button
        type="button"
        className={`talent-navigator__filter-swatch-btn${
          selected.length === 0 ? " talent-navigator__filter-swatch-btn--selected" : ""
        }`}
        aria-pressed={selected.length === 0}
        onClick={() => onChange([])}
      >
        <span className="talent-navigator__filter-swatch talent-navigator__filter-swatch--any" aria-hidden />
        <span>Any</span>
      </button>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        const swatch = swatches[option] ?? "#888";
        const isGradient = swatch.includes("gradient");
        return (
          <button
            key={option}
            type="button"
            className={`talent-navigator__filter-swatch-btn${
              isSelected ? " talent-navigator__filter-swatch-btn--selected" : ""
            }`}
            aria-pressed={isSelected}
            onClick={() =>
              onChange(
                isSelected ? selected.filter((item) => item !== option) : [...selected, option],
              )
            }
          >
            <span
              className="talent-navigator__filter-swatch"
              style={isGradient ? { backgroundImage: swatch } : { background: swatch }}
              aria-hidden
            />
            <span>{option}</span>
          </button>
        );
      })}
    </div>
  );
}

function HeightRangeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const parsed = parseHeightFilter(value);
  const mode = parsed.mode;
  const span = HEIGHT_SLIDER_MAX - HEIGHT_SLIDER_MIN;
  const lowPct = ((parsed.minInches - HEIGHT_SLIDER_MIN) / span) * 100;
  const highPct = ((parsed.maxInches - HEIGHT_SLIDER_MIN) / span) * 100;

  function commit(next: {
    mode: HeightFilterMode;
    minInches: number;
    maxInches: number;
  }) {
    onChange(serializeHeightFilter(next));
  }

  return (
    <div className="talent-navigator__filter-height">
      <FilterSingleSelect
        value={mode === "any" ? "" : mode}
        placeholder="Any height"
        options={[
          { value: "", label: "Any height" },
          { value: "under", label: "Under" },
          { value: "between", label: "Between" },
          { value: "above", label: "Above" },
        ]}
        onChange={(next) =>
          commit({
            mode: (next || "any") as HeightFilterMode,
            minInches: parsed.minInches,
            maxInches: Math.max(parsed.maxInches, parsed.minInches + 1),
          })
        }
      />

      {mode !== "any" ? (
        mode === "between" ? (
          <div className="talent-navigator__filter-height-dual">
            <p className="talent-navigator__filter-height-dual-readout">
              {inchesToHeightLabel(parsed.minInches)} – {inchesToHeightLabel(parsed.maxInches)}
            </p>
            <div className="talent-navigator__filter-height-dual-track">
              <div
                className="talent-navigator__filter-height-dual-fill"
                style={{ left: `${lowPct}%`, width: `${Math.max(0, highPct - lowPct)}%` }}
              />
              <input
                type="range"
                className="talent-navigator__filter-height-dual-input"
                min={HEIGHT_SLIDER_MIN}
                max={HEIGHT_SLIDER_MAX}
                value={parsed.minInches}
                aria-label="Minimum height"
                onChange={(event) => {
                  const minInches = Number(event.target.value);
                  commit({
                    mode: "between",
                    minInches: Math.min(minInches, parsed.maxInches),
                    maxInches: parsed.maxInches,
                  });
                }}
              />
              <input
                type="range"
                className="talent-navigator__filter-height-dual-input"
                min={HEIGHT_SLIDER_MIN}
                max={HEIGHT_SLIDER_MAX}
                value={parsed.maxInches}
                aria-label="Maximum height"
                onChange={(event) => {
                  const maxInches = Number(event.target.value);
                  commit({
                    mode: "between",
                    minInches: parsed.minInches,
                    maxInches: Math.max(maxInches, parsed.minInches),
                  });
                }}
              />
            </div>
          </div>
        ) : (
          <label className="talent-navigator__filter-height-slider">
            <span>{inchesToHeightLabel(parsed.minInches)}</span>
            <input
              type="range"
              min={HEIGHT_SLIDER_MIN}
              max={HEIGHT_SLIDER_MAX}
              value={parsed.minInches}
              onChange={(event) =>
                commit({
                  mode,
                  minInches: Number(event.target.value),
                  maxInches: parsed.maxInches,
                })
              }
            />
          </label>
        )
      ) : null}
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
  onDeleteSavedSearch,
  open = false,
  variant = "overlay",
}: TalentFilterPanelProps) {
  const embedded = variant === "embedded";

  const genres = filters.genres?.length ? filters.genres : filters.style ? [filters.style] : [];
  const skills = filters.skills ?? [];
  const ethnicities = filters.ethnicities?.length
    ? filters.ethnicities
    : filters.ethnicity
      ? [filters.ethnicity]
      : [];
  const locations = filters.locations?.length
    ? filters.locations
    : filters.location
      ? [filters.location]
      : [];
  const agencies = filters.agencies?.length
    ? filters.agencies
    : filters.agency
      ? [filters.agency]
      : [];
  const hairColors = filters.hairColors ?? [];
  const eyeColors = filters.eyeColors ?? [];
  const verifiedOnly =
    filters.verificationStatuses.includes("motiion_verified") ||
    filters.verificationStatuses.includes("industry_confirmed");
  const hasSavedSearches = savedSearches.length > 0;

  const genderIcons: Record<string, ReactNode> = {
    Male: <Mars className="size-3.5" aria-hidden />,
    Female: <Venus className="size-3.5" aria-hidden />,
    "Non-binary": <CircleDot className="size-3.5" aria-hidden />,
  };

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: Partial<TalentNavigatorFilters> }> = [];

    if (filters.keyword) {
      chips.push({ key: "keyword", label: filters.keyword, clear: { keyword: "" } });
    }
    if (filters.subtype) {
      chips.push({ key: "subtype", label: filters.subtype, clear: { subtype: "" } });
    }
    for (const genre of genres) {
      chips.push({
        key: `genre-${genre}`,
        label: genre,
        clear: {
          genres: genres.filter((item) => item !== genre),
          style: genres.filter((item) => item !== genre)[0] ?? "",
        },
      });
    }
    for (const skill of skills) {
      chips.push({
        key: `skill-${skill}`,
        label: skill,
        clear: { skills: skills.filter((item) => item !== skill) },
      });
    }
    if (filters.gender) {
      chips.push({ key: "gender", label: filters.gender, clear: { gender: "" } });
    }
    for (const ethnicity of ethnicities) {
      chips.push({
        key: `ethnicity-${ethnicity}`,
        label: ethnicity,
        clear: {
          ethnicities: ethnicities.filter((item) => item !== ethnicity),
          ethnicity: ethnicities.filter((item) => item !== ethnicity)[0] ?? "",
        },
      });
    }
    for (const color of hairColors) {
      chips.push({
        key: `hair-${color}`,
        label: `Hair: ${color}`,
        clear: { hairColors: hairColors.filter((item) => item !== color) },
      });
    }
    for (const color of eyeColors) {
      chips.push({
        key: `eye-${color}`,
        label: `Eyes: ${color}`,
        clear: { eyeColors: eyeColors.filter((item) => item !== color) },
      });
    }
    if (filters.height) {
      chips.push({
        key: "height",
        label: formatHeightFilterLabel(filters.height) || filters.height,
        clear: { height: "" },
      });
    }
    if (filters.unionStatus) {
      chips.push({ key: "union", label: filters.unionStatus, clear: { unionStatus: "" } });
    }
    if (filters.representation) {
      chips.push({
        key: "representation",
        label: filters.representation,
        clear: { representation: "" },
      });
    }
    for (const location of locations) {
      chips.push({
        key: `location-${location}`,
        label: location,
        clear: {
          locations: locations.filter((item) => item !== location),
          location: locations.filter((item) => item !== location)[0] ?? "",
        },
      });
    }
    if (filters.representation === "Represented") {
      for (const agency of agencies) {
        chips.push({
          key: `agency-${agency}`,
          label: agency,
          clear: {
            agencies: agencies.filter((item) => item !== agency),
            agency: agencies.filter((item) => item !== agency)[0] ?? "",
          },
        });
      }
    }
    if (verifiedOnly) {
      chips.push({
        key: "verified",
        label: "Verified credits",
        clear: { verificationStatuses: [] },
      });
    }
    for (const artist of filters.artists ?? []) {
      chips.push({
        key: `artist-${artist}`,
        label: artist,
        clear: { artists: filters.artists.filter((item) => item !== artist) },
      });
    }
    for (const choreographer of filters.choreographers ?? []) {
      chips.push({
        key: `choreographer-${choreographer}`,
        label: choreographer,
        clear: {
          choreographers: filters.choreographers.filter((item) => item !== choreographer),
        },
      });
    }
    for (const production of filters.productions ?? []) {
      chips.push({
        key: `production-${production}`,
        label: production,
        clear: { productions: filters.productions.filter((item) => item !== production) },
      });
    }
    if (
      filters.relationshipMatchMode === "any" &&
      (filters.artists.length > 1 || filters.choreographers.length > 1)
    ) {
      chips.push({
        key: "match-any",
        label: "Match any",
        clear: { relationshipMatchMode: "all" },
      });
    }

    return chips;
  }, [
    agencies,
    ethnicities,
    eyeColors,
    filters.artists,
    filters.choreographers,
    filters.gender,
    filters.height,
    filters.keyword,
    filters.productions,
    filters.relationshipMatchMode,
    filters.representation,
    filters.subtype,
    filters.unionStatus,
    genres,
    hairColors,
    locations,
    skills,
    verifiedOnly,
  ]);

  if (!open) return null;

  const filterWorkspace = (
    <div className="talent-navigator__filter-workspace">
      <aside className="talent-navigator__filter-rail" aria-label="Active filters">
        <div className="talent-navigator__filter-rail-search">
          <span className="talent-navigator__filter-active-label">Saved searches</span>
          <FilterSingleSelect
            value={savedSearchId}
            placeholder={hasSavedSearches ? "Select a saved search" : "No saved searches"}
            disabled={!hasSavedSearches}
            leading={<Bookmark className="size-3.5 shrink-0 opacity-55" aria-hidden />}
            options={[
              { value: "", label: "Select a saved search" },
              ...savedSearches.map((search) => ({
                value: search.id,
                label: search.label,
              })),
            ]}
            onChange={onSavedSearchChange}
          />
        </div>

        <div className="talent-navigator__filter-rail-active">
          <span className="talent-navigator__filter-active-label">Active filters</span>
          {activeChips.length ? (
            <div className="talent-navigator__filter-active-chips">
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
          ) : (
            <p className="talent-navigator__filter-active-empty">No active filters yet.</p>
          )}
        </div>

        {savedSearchId ? (
          <button
            type="button"
            className="talent-navigator__filter-rail-delete"
            onClick={onDeleteSavedSearch}
          >
            Delete saved search
          </button>
        ) : null}
      </aside>

      <div className="talent-navigator__filter-main">
        <div className="talent-navigator__filter-sections">
          <FilterSection title="Gender">
            <FilterSingleSelect
              value={filters.gender}
              placeholder="Any gender"
              options={[
                { value: "", label: "Any gender", icon: <UserRound className="size-3.5" /> },
                ...GENDER_OPTIONS.map((option) => ({
                  value: option,
                  label: option,
                  icon: genderIcons[option],
                })),
              ]}
              onChange={(gender) => onChange({ gender })}
            />
          </FilterSection>

          <FilterSection title="Union status">
            <FilterSingleSelect
              value={filters.unionStatus}
              placeholder="Any union status"
              options={[
                { value: "", label: "Any union status" },
                ...UNION_STATUS_OPTIONS.map((option) => ({ value: option, label: option })),
              ]}
              onChange={(unionStatus) => onChange({ unionStatus })}
            />
          </FilterSection>

          <FilterSection title="Representation">
            <FilterSingleSelect
              value={filters.representation}
              placeholder="Any representation"
              options={[
                { value: "", label: "Any representation" },
                ...REPRESENTATION_OPTIONS.map((option) => ({ value: option, label: option })),
              ]}
              onChange={(representation) =>
                onChange(
                  representation === "Represented"
                    ? { representation }
                    : { representation, agencies: [], agency: "" },
                )
              }
            />
          </FilterSection>

          {filters.representation === "Represented" ? (
            <FilterSection title="Agency" count={agencies.length}>
              <FilterMultiSelect
                options={filterOptions.agencies.map((agency: NavigatorAgencyOption) => ({
                  value: agency.name,
                  label: agency.name,
                  imageUrl: agency.logoUrl,
                  icon: <Building2 className="size-3.5" />,
                }))}
                selected={agencies}
                placeholder="Any agency"
                searchPlaceholder="Search agencies"
                onChange={(next) => onChange({ agencies: next, agency: next[0] ?? "" })}
              />
            </FilterSection>
          ) : null}

          <FilterSection title="Location" count={locations.length}>
            <FilterMultiSelect
              options={filterOptions.locations.map((location) => ({
                value: location,
                label: location,
              }))}
              selected={locations}
              placeholder="Any location"
              searchPlaceholder="Search cities"
              onChange={(next) => onChange({ locations: next, location: next[0] ?? "" })}
            />
          </FilterSection>

          <FilterSection title="Profile type">
            <FilterSingleSelect
              value={filters.subtype}
              placeholder="Any profile type"
              options={[
                { value: "", label: "Any profile type" },
                ...PROFILE_TYPE_OPTIONS.map((option) => ({ value: option, label: option })),
              ]}
              onChange={(subtype) => onChange({ subtype })}
            />
          </FilterSection>

          <FilterSection title="Height">
            <HeightRangeField
              value={filters.height}
              onChange={(height) => onChange({ height })}
            />
          </FilterSection>

          <FilterSection title="Hair color" count={hairColors.length}>
            <ColorSwatchField
              options={HAIR_COLOR_OPTIONS}
              selected={hairColors}
              swatches={HAIR_COLOR_SWATCHES}
              columns={3}
              onChange={(next) => onChange({ hairColors: next })}
            />
          </FilterSection>

          <FilterSection title="Eye color" count={eyeColors.length}>
            <ColorSwatchField
              options={EYE_COLOR_OPTIONS}
              selected={eyeColors}
              swatches={EYE_COLOR_SWATCHES}
              columns={4}
              onChange={(next) => onChange({ eyeColors: next })}
            />
          </FilterSection>

          <FilterSection title="Genres" count={genres.length}>
            <FilterMultiSelect
              options={ROLE_GENRE_OPTIONS.map((option) => ({ value: option, label: option }))}
              selected={genres}
              placeholder="Any genre"
              searchPlaceholder="Search genres"
              onChange={(next) => onChange({ genres: next, style: next[0] ?? "" })}
            />
          </FilterSection>

          <FilterSection title="Skills" count={skills.length}>
            <FilterMultiSelect
              options={ROLE_SKILL_OPTIONS.map((option) => ({ value: option, label: option }))}
              selected={skills}
              placeholder="Any skill"
              searchPlaceholder="Search skills"
              onChange={(next) => onChange({ skills: next })}
            />
          </FilterSection>

          <FilterSection title="Ethnicity" count={ethnicities.length}>
            <FilterMultiSelect
              options={ETHNICITY_OPTIONS.map((option) => ({ value: option, label: option }))}
              selected={ethnicities}
              placeholder="Any ethnicity"
              searchPlaceholder="Search ethnicities"
              onChange={(next) => onChange({ ethnicities: next, ethnicity: next[0] ?? "" })}
            />
          </FilterSection>

          <FilterSection title="Credit verification">
            <FilterSingleSelect
              value={verifiedOnly ? "verified" : ""}
              placeholder="Any credits"
              options={[
                { value: "", label: "Any credits" },
                { value: "verified", label: "Verified credits only" },
              ]}
              onChange={(next) =>
                onChange({
                  verificationStatuses: next
                    ? ["motiion_verified", "industry_confirmed"]
                    : [],
                })
              }
            />
          </FilterSection>

          <FilterSection title="Match mode">
            <FilterSingleSelect
              value={filters.relationshipMatchMode === "any" ? "any" : "all"}
              placeholder="Match all"
              options={[
                { value: "all", label: "Match all" },
                { value: "any", label: "Match any" },
              ]}
              onChange={(next) =>
                onChange({ relationshipMatchMode: next === "any" ? "any" : "all" })
              }
            />
          </FilterSection>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`talent-navigator__filter-panel${
        embedded ? " talent-navigator__filter-panel--embedded" : ""
      }`}
      aria-label="Talent filters"
      role="dialog"
      aria-modal="true"
    >
      <div className="talent-navigator__filter-content">{filterWorkspace}</div>
    </div>
  );
}
