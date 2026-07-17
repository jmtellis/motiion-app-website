"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import {
  EYE_COLOR_OPTIONS,
  HAIR_COLOR_OPTIONS,
  PROFILE_TYPE_OPTIONS,
  ROLE_GENRE_OPTIONS,
  ROLE_SKILL_OPTIONS,
} from "@/lib/talent-navigator/filter-options";
import type { RoleClientMatchFilters } from "@/lib/talent-buyers/casting/role-publication-snapshot";
import type { CastingRoleForm } from "@/types/casting";

import { CastingWizardChoiceCheck, castingWizardPill } from "./casting-wizard-shared";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function readRoleBrowseFilters(role: CastingRoleForm): RoleClientMatchFilters {
  const raw = (role.clientMatchFilters ?? {}) as RoleClientMatchFilters;
  return {
    ...raw,
    hairColors: asStringArray(raw.hairColors),
    eyeColors: asStringArray(raw.eyeColors),
    genres: asStringArray(raw.genres),
    skills: asStringArray(raw.skills),
    talentTypes: asStringArray(raw.talentTypes),
    ethnicities: asStringArray(raw.ethnicities),
  };
}

function pruneBrowseFilters(filters: RoleClientMatchFilters): RoleClientMatchFilters | null {
  const next: RoleClientMatchFilters = {};

  if (filters.ageMin != null) next.ageMin = filters.ageMin;
  if (filters.ageMax != null) next.ageMax = filters.ageMax;
  if (filters.gender?.trim()) next.gender = filters.gender.trim();
  if (filters.ethnicity?.trim()) next.ethnicity = filters.ethnicity.trim();
  if (filters.ethnicities?.length) next.ethnicities = filters.ethnicities;
  if (filters.height?.trim()) next.height = filters.height.trim();
  if (filters.heightMin?.trim()) next.heightMin = filters.heightMin.trim();
  if (filters.heightMax?.trim()) next.heightMax = filters.heightMax.trim();
  if (filters.hairColors?.length) next.hairColors = filters.hairColors;
  if (filters.eyeColors?.length) next.eyeColors = filters.eyeColors;
  if (filters.genres?.length) next.genres = filters.genres;
  if (filters.talentTypes?.length) next.talentTypes = filters.talentTypes;
  if (filters.agency?.trim()) next.agency = filters.agency.trim();
  if (filters.agencies?.length) next.agencies = filters.agencies;
  if (filters.unionStatus?.trim()) next.unionStatus = filters.unionStatus.trim();
  if (filters.skills?.length) next.skills = filters.skills;
  if (filters.location?.trim()) next.location = filters.location.trim();
  if (filters.hasRepresentation != null) next.hasRepresentation = filters.hasRepresentation;

  return Object.keys(next).length ? next : null;
}

export function orderedStyleTags(...groups: (string[] | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const group of groups) {
    for (const tag of group ?? []) {
      const trimmed = tag.trim();
      if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
      seen.add(trimmed.toLowerCase());
      result.push(trimmed);
    }
  }
  return result;
}

export function mergeRoleBrowseFilters(
  role: CastingRoleForm,
  patch: Partial<RoleClientMatchFilters>,
): RoleClientMatchFilters | null {
  return pruneBrowseFilters({
    ...readRoleBrowseFilters(role),
    ...patch,
  });
}

export function summarizeSelectionList(values: string[], emptyLabel = "Any"): string {
  if (!values.length) return emptyLabel;
  if (values.length <= 2) return values.join(", ");
  return `${values.slice(0, 2).join(", ")} +${values.length - 2}`;
}

export function RoleAttributeDisclosure({
  id,
  label,
  preview,
  open,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  preview: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div className={`casting-role-attr${open ? " casting-role-attr--open" : ""}`}>
      <button
        type="button"
        className="casting-role-attr__trigger"
        aria-expanded={open}
        aria-controls={`role-attr-${id}`}
        onClick={() => onToggle(id)}
      >
        <span className="casting-role-attr__copy">
          <span className="casting-role-attr__label">{label}</span>
          <span className="casting-role-attr__preview">{preview}</span>
        </span>
        <ChevronDown className="casting-role-attr__chevron" aria-hidden />
      </button>
      {open ? (
        <div id={`role-attr-${id}`} className="casting-role-attr__body">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function AnyMultiChipField({
  options,
  selected,
  onChange,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const anySelected = selected.length === 0;

  function toggle(option: string) {
    onChange(
      selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option],
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={castingWizardPill(anySelected)}
        aria-pressed={anySelected}
        onClick={() => onChange([])}
      >
        <span>Any</span>
        <CastingWizardChoiceCheck selected={anySelected} />
      </button>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            className={castingWizardPill(isSelected)}
            aria-pressed={isSelected}
            onClick={() => toggle(option)}
          >
            <span>{option}</span>
            <CastingWizardChoiceCheck selected={isSelected} />
          </button>
        );
      })}
    </div>
  );
}

function SearchableMultiSelect({
  options,
  selected,
  onChange,
  searchPlaceholder,
  emptyHint,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (values: string[]) => void;
  searchPlaceholder: string;
  emptyHint: string;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalized) return options;
    return options.filter((option) => option.toLowerCase().includes(normalized));
  }, [normalized, options]);

  function toggle(option: string) {
    onChange(
      selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option],
    );
  }

  return (
    <div className="casting-role-search-select">
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((option) => (
            <button
              key={option}
              type="button"
              className={castingWizardPill(true)}
              aria-pressed
              onClick={() => toggle(option)}
            >
              <span>{option}</span>
              <CastingWizardChoiceCheck selected />
            </button>
          ))}
        </div>
      ) : (
        <p className="casting-role-bound__hint">{emptyHint}</p>
      )}
      <input
        className="project-create__input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
      />
      <div className="casting-role-search-select__results">
        {filtered.slice(0, 40).map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              className={`casting-role-search-select__option${
                isSelected ? " casting-role-search-select__option--selected" : ""
              }`}
              aria-pressed={isSelected}
              onClick={() => toggle(option)}
            >
              <span>{option}</span>
              <CastingWizardChoiceCheck selected={isSelected} />
            </button>
          );
        })}
        {filtered.length === 0 ? (
          <p className="casting-role-bound__hint">No matches for “{query.trim()}”.</p>
        ) : null}
      </div>
    </div>
  );
}

export function CastingRoleBrowseFiltersFields({
  role,
  onChange,
  openSection,
  onToggleSection,
}: {
  role: CastingRoleForm;
  onChange: (role: CastingRoleForm) => void;
  openSection: string | null;
  onToggleSection: (id: string) => void;
}) {
  const filters = readRoleBrowseFilters(role);
  const talentTypes = filters.talentTypes ?? [];
  const selectedProfile =
    talentTypes.find((item) => PROFILE_TYPE_OPTIONS.includes(item as (typeof PROFILE_TYPE_OPTIONS)[number])) ??
    "";

  function patchFilters(patch: Partial<RoleClientMatchFilters>) {
    const nextFilters = mergeRoleBrowseFilters(role, patch);
    const styleTags = orderedStyleTags(nextFilters?.genres, nextFilters?.skills);
    onChange({
      ...role,
      clientMatchFilters: nextFilters,
      specialSkills: styleTags,
    });
  }

  return (
    <>
      <RoleAttributeDisclosure
        id="profile_type"
        label="Profile type"
        preview={selectedProfile || "Any"}
        open={openSection === "profile_type"}
        onToggle={onToggleSection}
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={castingWizardPill(!selectedProfile)}
            aria-pressed={!selectedProfile}
            onClick={() => patchFilters({ talentTypes: [] })}
          >
            <span>Any</span>
            <CastingWizardChoiceCheck selected={!selectedProfile} />
          </button>
          {PROFILE_TYPE_OPTIONS.map((option) => {
            const selected = selectedProfile === option;
            return (
              <button
                key={option}
                type="button"
                className={castingWizardPill(selected)}
                aria-pressed={selected}
                onClick={() => patchFilters({ talentTypes: [option] })}
              >
                <span>{option}</span>
                <CastingWizardChoiceCheck selected={selected} />
              </button>
            );
          })}
        </div>
      </RoleAttributeDisclosure>

      <RoleAttributeDisclosure
        id="hair"
        label="Hair color"
        preview={summarizeSelectionList(filters.hairColors ?? [])}
        open={openSection === "hair"}
        onToggle={onToggleSection}
      >
        <AnyMultiChipField
          options={HAIR_COLOR_OPTIONS}
          selected={filters.hairColors ?? []}
          onChange={(hairColors) => patchFilters({ hairColors })}
        />
      </RoleAttributeDisclosure>

      <RoleAttributeDisclosure
        id="eyes"
        label="Eye color"
        preview={summarizeSelectionList(filters.eyeColors ?? [])}
        open={openSection === "eyes"}
        onToggle={onToggleSection}
      >
        <AnyMultiChipField
          options={EYE_COLOR_OPTIONS}
          selected={filters.eyeColors ?? []}
          onChange={(eyeColors) => patchFilters({ eyeColors })}
        />
      </RoleAttributeDisclosure>

      <RoleAttributeDisclosure
        id="genres"
        label="Genres"
        preview={summarizeSelectionList(filters.genres ?? [])}
        open={openSection === "genres"}
        onToggle={onToggleSection}
      >
        <SearchableMultiSelect
          options={ROLE_GENRE_OPTIONS}
          selected={filters.genres ?? []}
          onChange={(genres) => patchFilters({ genres })}
          searchPlaceholder="Search genres"
          emptyHint="Any genre"
        />
      </RoleAttributeDisclosure>

      <RoleAttributeDisclosure
        id="skills"
        label="Skills"
        preview={summarizeSelectionList(filters.skills ?? [])}
        open={openSection === "skills"}
        onToggle={onToggleSection}
      >
        <SearchableMultiSelect
          options={ROLE_SKILL_OPTIONS}
          selected={filters.skills ?? []}
          onChange={(skills) => patchFilters({ skills })}
          searchPlaceholder="Search skills"
          emptyHint="Any skill"
        />
      </RoleAttributeDisclosure>
    </>
  );
}
