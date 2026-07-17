"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Plus, Trash2, Users, X } from "lucide-react";

import { AuthButton } from "@/components/auth/ui";
import { createDefaultRole } from "@/lib/talent-buyers/casting-composer-defaults";
import { heightToTotalInches } from "@/lib/search/talent-filter-logic";
import { ETHNICITY_OPTIONS, GENDER_OPTIONS, UNION_STATUS_OPTIONS } from "@/lib/talent-navigator/filter-options";
import type { CastingComposerForm, CastingRoleForm } from "@/types/casting";

import {
  CastingWizardChoiceCheck,
  PrefillBadge,
  castingWizardPill,
} from "./casting-wizard-shared";
import {
  CastingRoleBrowseFiltersFields,
  orderedStyleTags,
  readRoleBrowseFilters,
  mergeRoleBrowseFilters,
  RoleAttributeDisclosure,
  summarizeSelectionList,
} from "./casting-role-browse-filters";
import type { RoleClientMatchFilters } from "@/lib/talent-buyers/casting/role-publication-snapshot";

import "../../project/project-create.css";

const AGE_BOUND_MIN = 13;
const AGE_BOUND_MAX = 99;
const AGE_DEFAULT_MIN = 18;
const AGE_DEFAULT_MAX = 35;
const AGE_EIGHTEEN_PLUS = 18;

const HEIGHT_INCHES_MIN = 48; // 4'0"
const HEIGHT_INCHES_MAX = 96; // 8'0"
const HEIGHT_DEFAULT_MIN = 60; // 5'0"
const HEIGHT_DEFAULT_MAX = 72; // 6'0"

type AgeOption = "any" | "range" | "eighteen_plus";
type HeightMode = "any" | "below" | "between" | "above";

type RoleEditorState = {
  draft: CastingRoleForm;
  editIndex: number | null;
};

function parseAge(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(AGE_BOUND_MAX, Math.max(AGE_BOUND_MIN, parsed));
}

function clampAge(value: number): number {
  return Math.min(AGE_BOUND_MAX, Math.max(AGE_BOUND_MIN, Math.round(value)));
}

function clampHeightInches(value: number): number {
  return Math.min(HEIGHT_INCHES_MAX, Math.max(HEIGHT_INCHES_MIN, Math.round(value)));
}

function formatHeightInches(totalInches: number): string {
  const clamped = clampHeightInches(totalInches);
  const feet = Math.floor(clamped / 12);
  const inches = clamped % 12;
  return `${feet}'${inches}"`;
}

function parseHeightInches(value: string, fallback: number): number {
  return heightToTotalInches(value) ?? fallback;
}

function detectAgeOption(role: CastingRoleForm): AgeOption {
  const hasMin = role.ageRangeMin.trim() !== "";
  const hasMax = role.ageRangeMax.trim() !== "";
  if (!hasMin && !hasMax) return "any";
  if (hasMin && !hasMax && parseAge(role.ageRangeMin, AGE_EIGHTEEN_PLUS) === AGE_EIGHTEEN_PLUS) {
    return "eighteen_plus";
  }
  if (hasMin && !hasMax) return "eighteen_plus";
  return "range";
}

function detectHeightMode(role: CastingRoleForm): HeightMode {
  const hasMin = role.heightMin.trim() !== "";
  const hasMax = role.heightMax.trim() !== "";
  if (!hasMin && !hasMax) return "any";
  if (hasMin && !hasMax) return "above";
  if (!hasMin && hasMax) return "below";
  return "between";
}

function ageSummary(role: CastingRoleForm): string | null {
  const option = detectAgeOption(role);
  if (option === "any") return null;
  if (option === "eighteen_plus") return "18+";
  const min = role.ageRangeMin.trim();
  const max = role.ageRangeMax.trim();
  if (min && max) return `${min}–${max}`;
  return null;
}

function heightSummary(role: CastingRoleForm): string | null {
  const mode = detectHeightMode(role);
  const min = role.heightMin.trim();
  const max = role.heightMax.trim();
  if (mode === "any") return null;
  if (mode === "above" && min) return `${min}+`;
  if (mode === "below" && max) return `Up to ${max}`;
  if (min && max) return `${min}–${max}`;
  return null;
}

function roleCardSummary(role: CastingRoleForm): string {
  const parts: string[] = [];
  const filters = readRoleBrowseFilters(role);
  const age = ageSummary(role);
  if (age) parts.push(age);
  else parts.push("Any age");
  const height = heightSummary(role);
  if (height) parts.push(height);
  if (filters.talentTypes?.[0]) parts.push(filters.talentTypes[0]);
  if (role.gender.trim()) parts.push(role.gender);
  const people = role.peopleNeeded.trim();
  if (people) parts.push(people === "1" ? "1 person" : `${people} people`);
  if (role.ethnicityPreferences.length === 0) parts.push("Any ethnicity");
  else if (role.ethnicityPreferences.length === 1) parts.push(role.ethnicityPreferences[0]!);
  else parts.push(`${role.ethnicityPreferences.length} ethnicities`);
  const styleCount = orderedStyleTags(filters.genres, filters.skills, role.specialSkills).length;
  if (styleCount) parts.push(`${styleCount} style${styleCount === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

function DualBoundSlider({
  mode,
  minValue,
  maxValue,
  boundMin,
  boundMax,
  formatValue,
  leftBoundLabel,
  rightBoundLabel,
  centerLabel,
  onMinChange,
  onMaxChange,
  minAriaLabel,
  maxAriaLabel,
}: {
  mode: "below" | "between" | "above";
  minValue: number;
  maxValue: number;
  boundMin: number;
  boundMax: number;
  formatValue: (value: number) => string;
  leftBoundLabel?: string;
  rightBoundLabel?: string;
  centerLabel: string;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  minAriaLabel: string;
  maxAriaLabel: string;
}) {
  const span = Math.max(1, boundMax - boundMin);
  const minPercent = ((minValue - boundMin) / span) * 100;
  const maxPercent = ((maxValue - boundMin) / span) * 100;
  const singlePercent = mode === "below" ? maxPercent : minPercent;
  const fillLeft = mode === "between" ? minPercent : mode === "below" ? 0 : singlePercent;
  const fillRight = mode === "between" ? maxPercent : mode === "below" ? singlePercent : 100;
  const leftLabel = leftBoundLabel ?? (mode === "below" ? "Below" : formatValue(minValue));
  const rightLabel = rightBoundLabel ?? (mode === "above" ? "Above" : formatValue(maxValue));

  return (
    <div className="casting-role-bound">
      <p className="casting-role-bound__value" aria-live="polite">
        {centerLabel}
      </p>
      <div className="casting-role-bound__slider-row">
        <span className="casting-role-bound__bound">{leftLabel}</span>
        <div className="casting-role-bound__track-wrap">
          <div className="casting-role-bound__track" aria-hidden>
            <div
              className="casting-role-bound__fill"
              style={{ left: `${fillLeft}%`, width: `${Math.max(0, fillRight - fillLeft)}%` }}
            />
          </div>
          {mode === "between" ? (
            <>
              <input
                type="range"
                className="casting-role-bound__thumb casting-role-bound__thumb--min"
                min={boundMin}
                max={boundMax}
                step={1}
                value={minValue}
                aria-label={minAriaLabel}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  onMinChange(Math.min(next, maxValue));
                }}
              />
              <input
                type="range"
                className="casting-role-bound__thumb casting-role-bound__thumb--max"
                min={boundMin}
                max={boundMax}
                step={1}
                value={maxValue}
                aria-label={maxAriaLabel}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  onMaxChange(Math.max(next, minValue));
                }}
              />
            </>
          ) : (
            <input
              type="range"
              className="casting-role-bound__thumb casting-role-bound__thumb--single"
              min={boundMin}
              max={boundMax}
              step={1}
              value={mode === "below" ? maxValue : minValue}
              aria-label={mode === "below" ? maxAriaLabel : minAriaLabel}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (mode === "below") onMaxChange(next);
                else onMinChange(next);
              }}
            />
          )}
        </div>
        <span className="casting-role-bound__bound">{rightLabel}</span>
      </div>
    </div>
  );
}

function AgeRequirementEditor({
  option,
  minAge,
  maxAge,
  onOptionChange,
  onMinChange,
  onMaxChange,
}: {
  option: AgeOption;
  minAge: number;
  maxAge: number;
  onOptionChange: (option: AgeOption) => void;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}) {
  return (
    <div className="casting-role-bound-field space-y-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "any" as const, label: "Any" },
            { value: "range" as const, label: "Range" },
            { value: "eighteen_plus" as const, label: "18+" },
          ] as const
        ).map((item) => {
          const selected = option === item.value;
          return (
            <button
              key={item.value}
              type="button"
              className={castingWizardPill(selected)}
              aria-pressed={selected}
              onClick={() => onOptionChange(item.value)}
            >
              <span>{item.label}</span>
              <CastingWizardChoiceCheck selected={selected} />
            </button>
          );
        })}
      </div>

      {option === "any" ? (
        <p className="casting-role-bound__hint">No age requirement for this role.</p>
      ) : null}

      {option === "eighteen_plus" ? (
        <p className="casting-role-bound__hint">Talent must be 18 or older.</p>
      ) : null}

      {option === "range" ? (
        <DualBoundSlider
          mode="between"
          minValue={minAge}
          maxValue={maxAge}
          boundMin={AGE_BOUND_MIN}
          boundMax={AGE_BOUND_MAX}
          formatValue={(value) => String(value)}
          centerLabel={`${minAge} – ${maxAge} years`}
          onMinChange={(value) => onMinChange(clampAge(value))}
          onMaxChange={(value) => onMaxChange(clampAge(value))}
          minAriaLabel="Minimum age"
          maxAriaLabel="Maximum age"
        />
      ) : null}
    </div>
  );
}

function HeightRequirementEditor({
  mode,
  minInches,
  maxInches,
  onModeChange,
  onMinChange,
  onMaxChange,
}: {
  mode: HeightMode;
  minInches: number;
  maxInches: number;
  onModeChange: (mode: HeightMode) => void;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}) {
  const sliderMode = mode === "any" ? null : mode;
  const centerLabel =
    mode === "between"
      ? `${formatHeightInches(minInches)} – ${formatHeightInches(maxInches)}`
      : mode === "above"
        ? `${formatHeightInches(minInches)}+`
        : mode === "below"
          ? `Up to ${formatHeightInches(maxInches)}`
          : "";

  return (
    <div className="casting-role-bound-field space-y-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "any" as const, label: "Any" },
            { value: "below" as const, label: "Below" },
            { value: "between" as const, label: "Between" },
            { value: "above" as const, label: "Above" },
          ] as const
        ).map((item) => {
          const selected = mode === item.value;
          return (
            <button
              key={item.value}
              type="button"
              className={castingWizardPill(selected)}
              aria-pressed={selected}
              onClick={() => onModeChange(item.value)}
            >
              <span>{item.label}</span>
              <CastingWizardChoiceCheck selected={selected} />
            </button>
          );
        })}
      </div>

      {mode === "any" ? (
        <p className="casting-role-bound__hint">No height requirement for this role.</p>
      ) : null}

      {sliderMode ? (
        <DualBoundSlider
          mode={sliderMode}
          minValue={minInches}
          maxValue={maxInches}
          boundMin={HEIGHT_INCHES_MIN}
          boundMax={HEIGHT_INCHES_MAX}
          formatValue={formatHeightInches}
          centerLabel={centerLabel}
          onMinChange={(value) => onMinChange(clampHeightInches(value))}
          onMaxChange={(value) => onMaxChange(clampHeightInches(value))}
          minAriaLabel="Minimum height"
          maxAriaLabel="Maximum height"
        />
      ) : null}
    </div>
  );
}

export function CastingRoleStep({
  form,
  onFormChange,
  showPrefillBadge,
  autoOpenWhenEmpty = true,
}: {
  form: CastingComposerForm;
  onFormChange: (form: CastingComposerForm) => void;
  showPrefillBadge?: boolean;
  autoOpenWhenEmpty?: boolean;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [editor, setEditor] = useState<RoleEditorState | null>(null);
  const [ageOption, setAgeOption] = useState<AgeOption>("any");
  const [minAge, setMinAge] = useState(AGE_DEFAULT_MIN);
  const [maxAge, setMaxAge] = useState(AGE_DEFAULT_MAX);
  const [heightMode, setHeightMode] = useState<HeightMode>("any");
  const [minHeightInches, setMinHeightInches] = useState(HEIGHT_DEFAULT_MIN);
  const [maxHeightInches, setMaxHeightInches] = useState(HEIGHT_DEFAULT_MAX);
  const [openAttr, setOpenAttr] = useState<string | null>(null);
  const didAutoOpenRef = useRef(false);

  const appliedRoles = useMemo(
    () => form.roles.filter((role) => role.title.trim().length > 0),
    [form.roles],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!autoOpenWhenEmpty || didAutoOpenRef.current) return;
    if (appliedRoles.length > 0) return;
    didAutoOpenRef.current = true;

    const blank = form.roles.find((role) => !role.title.trim()) ?? createDefaultRole();
    openEditor(blank, null);
    if (form.roles.some((role) => !role.title.trim())) {
      onFormChange({ ...form, roles: form.roles.filter((role) => role.title.trim()) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editor) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeEditor();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editor]);

  function syncRequirementsFromRole(role: CastingRoleForm) {
    const nextAgeOption = detectAgeOption(role);
    setAgeOption(nextAgeOption);
    if (nextAgeOption === "range") {
      const nextMin = parseAge(role.ageRangeMin, AGE_DEFAULT_MIN);
      const nextMax = parseAge(role.ageRangeMax, AGE_DEFAULT_MAX);
      setMinAge(Math.min(nextMin, nextMax));
      setMaxAge(Math.max(nextMin, nextMax));
    } else {
      setMinAge(AGE_DEFAULT_MIN);
      setMaxAge(AGE_DEFAULT_MAX);
    }

    const nextHeightMode = detectHeightMode(role);
    setHeightMode(nextHeightMode);
    const nextMinHeight = parseHeightInches(role.heightMin, HEIGHT_DEFAULT_MIN);
    const nextMaxHeight = parseHeightInches(role.heightMax, HEIGHT_DEFAULT_MAX);
    if (nextHeightMode === "above") {
      setMinHeightInches(nextMinHeight);
      setMaxHeightInches(Math.max(nextMinHeight, HEIGHT_DEFAULT_MAX));
    } else if (nextHeightMode === "below") {
      setMaxHeightInches(nextMaxHeight);
      setMinHeightInches(Math.min(nextMaxHeight, HEIGHT_DEFAULT_MIN));
    } else if (nextHeightMode === "between") {
      setMinHeightInches(Math.min(nextMinHeight, nextMaxHeight));
      setMaxHeightInches(Math.max(nextMinHeight, nextMaxHeight));
    } else {
      setMinHeightInches(HEIGHT_DEFAULT_MIN);
      setMaxHeightInches(HEIGHT_DEFAULT_MAX);
    }
  }

  function openEditor(role: CastingRoleForm, editIndex: number | null) {
    const draft: CastingRoleForm = {
      ...role,
      ethnicityPreferences: [...role.ethnicityPreferences],
      specialSkills: [...role.specialSkills],
      clientMatchFilters: role.clientMatchFilters
        ? ({ ...role.clientMatchFilters } as CastingRoleForm["clientMatchFilters"])
        : null,
    };
    setOpenAttr(null);
    setEditor({ draft, editIndex });
    syncRequirementsFromRole(draft);
  }

  function closeEditor() {
    setEditor(null);
    setOpenAttr(null);
  }

  function toggleAttrSection(id: string) {
    setOpenAttr((current) => (current === id ? null : id));
  }

  function agePreviewLabel(): string {
    if (ageOption === "any") return "Any";
    if (ageOption === "eighteen_plus") return "18+";
    return `${minAge}–${maxAge}`;
  }

  function heightPreviewLabel(): string {
    if (heightMode === "any") return "Any";
    if (heightMode === "above") return `${formatHeightInches(minHeightInches)}+`;
    if (heightMode === "below") return `Up to ${formatHeightInches(maxHeightInches)}`;
    return `${formatHeightInches(minHeightInches)}–${formatHeightInches(maxHeightInches)}`;
  }

  function updateDraft(patch: Partial<CastingRoleForm>) {
    setEditor((current) => (current ? { ...current, draft: { ...current.draft, ...patch } } : current));
  }

  function handleAgeOptionChange(next: AgeOption) {
    setAgeOption(next);
    if (next === "range") {
      setMinAge(AGE_DEFAULT_MIN);
      setMaxAge(AGE_DEFAULT_MAX);
    }
  }

  function handleHeightModeChange(next: HeightMode) {
    setHeightMode(next);
    if (next === "below") {
      setMaxHeightInches(HEIGHT_DEFAULT_MAX);
    } else if (next === "above") {
      setMinHeightInches(HEIGHT_DEFAULT_MIN);
    } else if (next === "between") {
      setMinHeightInches(HEIGHT_DEFAULT_MIN);
      setMaxHeightInches(HEIGHT_DEFAULT_MAX);
    }
  }

  function applyRequirementsToRole(role: CastingRoleForm): CastingRoleForm {
    let next: CastingRoleForm = { ...role };

    if (ageOption === "any") {
      next = { ...next, ageRangeMin: "", ageRangeMax: "" };
    } else if (ageOption === "eighteen_plus") {
      next = { ...next, ageRangeMin: String(AGE_EIGHTEEN_PLUS), ageRangeMax: "" };
    } else {
      next = { ...next, ageRangeMin: String(minAge), ageRangeMax: String(maxAge) };
    }

    if (heightMode === "any") {
      next = { ...next, heightMin: "", heightMax: "" };
    } else if (heightMode === "above") {
      next = { ...next, heightMin: formatHeightInches(minHeightInches), heightMax: "" };
    } else if (heightMode === "below") {
      next = { ...next, heightMin: "", heightMax: formatHeightInches(maxHeightInches) };
    } else {
      next = {
        ...next,
        heightMin: formatHeightInches(minHeightInches),
        heightMax: formatHeightInches(maxHeightInches),
      };
    }

    const existing = readRoleBrowseFilters(next);
    const ageMin = next.ageRangeMin.trim() ? Number.parseInt(next.ageRangeMin, 10) : null;
    const ageMax = next.ageRangeMax.trim() ? Number.parseInt(next.ageRangeMax, 10) : null;
    const filterPatch: Partial<RoleClientMatchFilters> = {
      ...existing,
      gender: next.gender.trim() || null,
      ethnicities: next.ethnicityPreferences.length ? next.ethnicityPreferences : null,
      unionStatus: next.unionStatus.trim() || null,
      ageMin: Number.isFinite(ageMin) ? ageMin : null,
      ageMax: Number.isFinite(ageMax) ? ageMax : null,
      heightMin: next.heightMin.trim() || null,
      heightMax: next.heightMax.trim() || null,
      hairColors: existing.hairColors ?? [],
      eyeColors: existing.eyeColors ?? [],
      genres: existing.genres ?? [],
      skills: existing.skills ?? [],
      talentTypes: existing.talentTypes ?? [],
    };

    const clientMatchFilters = mergeRoleBrowseFilters(next, filterPatch);
    const specialSkills = orderedStyleTags(
      clientMatchFilters?.genres,
      clientMatchFilters?.skills,
      next.specialSkills,
    );

    return {
      ...next,
      clientMatchFilters,
      specialSkills,
    };
  }

  function toggleEthnicity(option: string) {
    if (!editor) return;
    const current = editor.draft.ethnicityPreferences;
    if (option === "__any__") {
      updateDraft({ ethnicityPreferences: [] });
      return;
    }
    const next = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option];
    updateDraft({ ethnicityPreferences: next });
  }

  function applyEditor() {
    if (!editor) return;
    const title = editor.draft.title.trim();
    if (!title) return;

    const committed = applyRequirementsToRole({
      ...editor.draft,
      title,
      description: editor.draft.description.trim(),
    });

    if (editor.editIndex != null) {
      const nextRoles = form.roles.map((role, index) => (index === editor.editIndex ? committed : role));
      onFormChange({ ...form, roles: nextRoles });
    } else {
      onFormChange({ ...form, roles: [...form.roles.filter((role) => role.title.trim()), committed] });
    }
    closeEditor();
  }

  function removeRole(index: number) {
    const nextRoles = form.roles.filter((_, roleIndex) => roleIndex !== index);
    onFormChange({ ...form, roles: nextRoles });
    if (editor?.editIndex === index) closeEditor();
    else if (editor?.editIndex != null && editor.editIndex > index) {
      setEditor({ ...editor, editIndex: editor.editIndex - 1 });
    }
  }

  function startAddRole() {
    openEditor(createDefaultRole(), null);
  }

  const rail =
    mounted && editor ? (
      createPortal(
        <div className="casting-schedule-rail" role="presentation">
          <button
            type="button"
            className="casting-schedule-rail__backdrop"
            aria-label="Close role editor"
            onClick={closeEditor}
          />
          <aside
            className="casting-schedule-rail__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <header className="casting-schedule-rail__header">
              <div>
                <h3 id={titleId} className="casting-schedule-rail__title">
                  {editor.editIndex != null ? "Edit role" : "Add role"}
                </h3>
                <p className="casting-schedule-rail__subtitle">
                  Set the casting details for this role, then apply to add it to the breakdown.
                </p>
              </div>
              <button
                type="button"
                className="casting-schedule-rail__close"
                onClick={closeEditor}
                aria-label="Close"
              >
                <X className="size-4" aria-hidden />
              </button>
            </header>

            <div className="casting-schedule-rail__body">
              <div className="casting-schedule-rail__fields">
                <div className="project-create__field">
                  <span className="project-create__label">Role title</span>
                  <input
                    className="project-create__input"
                    value={editor.draft.title}
                    onChange={(event) => updateDraft({ title: event.target.value })}
                    placeholder="Lead dancer, ensemble, etc."
                    autoFocus
                  />
                </div>

                <div className="project-create__field">
                  <span className="project-create__label">Role description</span>
                  <textarea
                    className="project-create__textarea"
                    value={editor.draft.description}
                    onChange={(event) => updateDraft({ description: event.target.value })}
                    placeholder="Describe the role, look, and expectations."
                    rows={4}
                  />
                </div>

                <div className="casting-role-attr-list">
                  <RoleAttributeDisclosure
                    id="age"
                    label="Age"
                    preview={agePreviewLabel()}
                    open={openAttr === "age"}
                    onToggle={toggleAttrSection}
                  >
                    <AgeRequirementEditor
                      option={ageOption}
                      minAge={minAge}
                      maxAge={maxAge}
                      onOptionChange={handleAgeOptionChange}
                      onMinChange={setMinAge}
                      onMaxChange={setMaxAge}
                    />
                  </RoleAttributeDisclosure>

                  <RoleAttributeDisclosure
                    id="height"
                    label="Height"
                    preview={heightPreviewLabel()}
                    open={openAttr === "height"}
                    onToggle={toggleAttrSection}
                  >
                    <HeightRequirementEditor
                      mode={heightMode}
                      minInches={minHeightInches}
                      maxInches={maxHeightInches}
                      onModeChange={handleHeightModeChange}
                      onMinChange={setMinHeightInches}
                      onMaxChange={setMaxHeightInches}
                    />
                  </RoleAttributeDisclosure>

                  <CastingRoleBrowseFiltersFields
                    role={editor.draft}
                    onChange={(draft) => setEditor((current) => (current ? { ...current, draft } : current))}
                    openSection={openAttr}
                    onToggleSection={toggleAttrSection}
                  />

                  <RoleAttributeDisclosure
                    id="gender"
                    label="Gender"
                    preview={editor.draft.gender.trim() || "Any"}
                    open={openAttr === "gender"}
                    onToggle={toggleAttrSection}
                  >
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={castingWizardPill(!editor.draft.gender.trim())}
                        aria-pressed={!editor.draft.gender.trim()}
                        onClick={() => updateDraft({ gender: "" })}
                      >
                        <span>Any</span>
                        <CastingWizardChoiceCheck selected={!editor.draft.gender.trim()} />
                      </button>
                      {GENDER_OPTIONS.map((option) => {
                        const selected = editor.draft.gender === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            className={castingWizardPill(selected)}
                            aria-pressed={selected}
                            onClick={() => updateDraft({ gender: option })}
                          >
                            <span>{option}</span>
                            <CastingWizardChoiceCheck selected={selected} />
                          </button>
                        );
                      })}
                    </div>
                  </RoleAttributeDisclosure>

                  <RoleAttributeDisclosure
                    id="people"
                    label="People needed"
                    preview={editor.draft.peopleNeeded.trim() || "1"}
                    open={openAttr === "people"}
                    onToggle={toggleAttrSection}
                  >
                    <input
                      className="project-create__input"
                      value={editor.draft.peopleNeeded}
                      onChange={(event) => updateDraft({ peopleNeeded: event.target.value })}
                      inputMode="numeric"
                    />
                  </RoleAttributeDisclosure>

                  <RoleAttributeDisclosure
                    id="ethnicity"
                    label="Ethnicity"
                    preview={summarizeSelectionList(editor.draft.ethnicityPreferences)}
                    open={openAttr === "ethnicity"}
                    onToggle={toggleAttrSection}
                  >
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const anySelected = editor.draft.ethnicityPreferences.length === 0;
                        return (
                          <button
                            type="button"
                            className={castingWizardPill(anySelected)}
                            aria-pressed={anySelected}
                            onClick={() => toggleEthnicity("__any__")}
                          >
                            <span>Any</span>
                            <CastingWizardChoiceCheck selected={anySelected} />
                          </button>
                        );
                      })()}
                      {ETHNICITY_OPTIONS.map((option) => {
                        const selected = editor.draft.ethnicityPreferences.includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            className={castingWizardPill(selected)}
                            aria-pressed={selected}
                            onClick={() => toggleEthnicity(option)}
                          >
                            <span>{option}</span>
                            <CastingWizardChoiceCheck selected={selected} />
                          </button>
                        );
                      })}
                    </div>
                  </RoleAttributeDisclosure>

                  <RoleAttributeDisclosure
                    id="union"
                    label="Union status"
                    preview={editor.draft.unionStatus.trim() || "Any"}
                    open={openAttr === "union"}
                    onToggle={toggleAttrSection}
                  >
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={castingWizardPill(!editor.draft.unionStatus.trim())}
                        aria-pressed={!editor.draft.unionStatus.trim()}
                        onClick={() => updateDraft({ unionStatus: "" })}
                      >
                        <span>Any</span>
                        <CastingWizardChoiceCheck selected={!editor.draft.unionStatus.trim()} />
                      </button>
                      {UNION_STATUS_OPTIONS.map((option) => {
                        const selected = editor.draft.unionStatus === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            className={castingWizardPill(selected)}
                            aria-pressed={selected}
                            onClick={() => updateDraft({ unionStatus: option })}
                          >
                            <span>{option}</span>
                            <CastingWizardChoiceCheck selected={selected} />
                          </button>
                        );
                      })}
                    </div>
                  </RoleAttributeDisclosure>
                </div>
              </div>
            </div>

            <footer className="casting-schedule-rail__footer">
              {editor.editIndex != null ? (
                <AuthButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    removeRole(editor.editIndex!);
                    closeEditor();
                  }}
                >
                  Remove
                </AuthButton>
              ) : (
                <span />
              )}
              <AuthButton type="button" onClick={applyEditor} disabled={!editor.draft.title.trim()}>
                Apply
              </AuthButton>
            </footer>
          </aside>
        </div>,
        document.body,
      )
    ) : null;

  return (
    <div className="space-y-5">
      {showPrefillBadge ? <PrefillBadge /> : null}

      {appliedRoles.length === 0 ? (
        <p className="casting-schedule-step__empty">
          Add at least one role for this casting. Open the editor to set title, age range, and preferences.
        </p>
      ) : (
        <ul className="casting-role-step__list">
          {form.roles.map((role, index) => {
            if (!role.title.trim()) return null;
            return (
              <li key={role.clientId}>
                <div className="casting-role-step__card">
                  <button
                    type="button"
                    className="casting-role-step__card-main"
                    onClick={() => openEditor(role, index)}
                  >
                    <span className="casting-role-step__card-icon" aria-hidden>
                      <Users className="size-4" />
                    </span>
                    <span className="casting-role-step__card-copy">
                      <span className="casting-role-step__card-title">{role.title.trim()}</span>
                      <span className="casting-role-step__card-summary">{roleCardSummary(role)}</span>
                    </span>
                    <span className="casting-role-step__card-edit" aria-hidden>
                      <Pencil className="size-3.5" />
                    </span>
                  </button>
                  <button
                    type="button"
                    className="casting-role-step__card-remove"
                    aria-label={`Remove ${role.title.trim()}`}
                    onClick={() => removeRole(index)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" className="casting-role-step__add" onClick={startAddRole}>
        <Plus className="size-4" aria-hidden />
        {appliedRoles.length === 0 ? "Add role" : "Add another role"}
      </button>

      {rail}
    </div>
  );
}
