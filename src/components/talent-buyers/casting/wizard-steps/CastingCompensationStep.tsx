"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { DollarSign, X } from "lucide-react";

import { AuthButton } from "@/components/auth/ui";
import {
  COMPENSATION_CATEGORY_OPTIONS,
  COMPENSATION_COVERAGE_OPTIONS,
} from "@/lib/talent-buyers/casting-composer-defaults";
import {
  applySagAftraScaleToRateDetails,
  sagAftraFootnotes,
  sagAftraPeriodLabel,
  sagAftraSelectionTitle,
  SAG_AFTRA_AGREEMENT_OPTIONS,
  SAG_AFTRA_GROUP_OPTIONS,
  SAG_AFTRA_UNIT_OPTIONS,
  type SagAftraDancerAgreement,
  type SagAftraDancerGroupSize,
  type SagAftraEmploymentUnit,
  type SagAftraScaleSelection,
} from "@/lib/talent-buyers/sag-aftra/catalog";
import type { CastingComposerForm, RateDetails, RateType } from "@/types/casting";

import {
  CastingTagSelector,
  CastingWizardChoiceCheck,
  PrefillBadge,
  castingWizardPill,
} from "./casting-wizard-shared";

import "../../project/project-create.css";

type PaidStructure = "flat" | "day_rates" | "other";
type RailEditorId = PaidStructure | "union_scale";

function paidStructureFromForm(form: CastingComposerForm): PaidStructure {
  if (form.rateType === "segmented") return "day_rates";
  if (form.rateType === "tbd") return "other";
  return "flat";
}

function rateTypeForStructure(structure: PaidStructure): RateType {
  switch (structure) {
    case "flat":
      return "fixed";
    case "day_rates":
      return "segmented";
    case "other":
      return "tbd";
  }
}

function formatMoney(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return `$${value.toLocaleString()}`;
}

function structureSummary(form: CastingComposerForm, structure: PaidStructure): string | null {
  const rates = form.rateDetails;
  if (structure === "flat") return formatMoney(rates.fixed_amount);
  if (structure === "day_rates") {
    const bits = [
      rates.rehearsal != null ? `Reh ${formatMoney(rates.rehearsal)}` : null,
      rates.shoot_day != null ? `Shoot ${formatMoney(rates.shoot_day)}` : null,
      rates.travel_day != null ? `Travel ${formatMoney(rates.travel_day)}` : null,
      rates.per_diem != null ? `Per diem ${formatMoney(rates.per_diem)}` : null,
    ].filter(Boolean);
    return bits.length ? bits.join(" · ") : null;
  }
  return form.configuration.compensation_amount_notes?.trim() || null;
}

function unionScaleSummary(form: CastingComposerForm): string | null {
  const rates = form.rateDetails;
  if (rates.weekly_rate != null) return `Weekly ${formatMoney(rates.weekly_rate)}`;
  const bits = [
    rates.shoot_day != null ? `Shoot ${formatMoney(rates.shoot_day)}` : null,
    rates.rehearsal != null ? `Reh ${formatMoney(rates.rehearsal)}` : null,
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : null;
}

function structureHasValues(form: CastingComposerForm, structure: PaidStructure): boolean {
  return Boolean(structureSummary(form, structure));
}

const NON_UNION_STRUCTURES: {
  value: PaidStructure;
  label: string;
  detail: string;
}[] = [
  {
    value: "flat",
    label: "One fee",
    detail: "A single flat amount for the booking.",
  },
  {
    value: "day_rates",
    label: "Day rates",
    detail: "Different amounts for rehearsal, shoot, travel, per diem, etc.",
  },
  {
    value: "other",
    label: "Other",
    detail: "Spell out pay in your own words when numbers aren’t final.",
  },
];

export function CastingCompensationStep({
  form,
  onFormChange,
  updateConfiguration,
  showPrefillBadge,
}: {
  form: CastingComposerForm;
  onFormChange: (form: CastingComposerForm) => void;
  updateConfiguration: (patch: Partial<CastingComposerForm["configuration"]>) => void;
  showPrefillBadge?: boolean;
}) {
  const titleId = useId();
  const category = form.configuration.compensation_category_raw ?? null;
  const isPaid = category === "paid";
  const isUnion = form.isUnion === true;
  const activeStructure = paidStructureFromForm(form);

  const [mounted, setMounted] = useState(false);
  const [editorId, setEditorId] = useState<RailEditorId | null>(null);
  const [draftRates, setDraftRates] = useState<RateDetails>(form.rateDetails);
  const [draftNotes, setDraftNotes] = useState(form.configuration.compensation_amount_notes ?? "");
  const [agreement, setAgreement] = useState<SagAftraDancerAgreement>("television");
  const [groupSize, setGroupSize] = useState<SagAftraDancerGroupSize>("soloDuo");
  const [employmentUnit, setEmploymentUnit] = useState<SagAftraEmploymentUnit>("daily");

  const footnotes = sagAftraFootnotes();
  const selection: SagAftraScaleSelection = { agreement, groupSize, employmentUnit };
  const scaleTitle = sagAftraSelectionTitle(selection);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!editorId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeEditor();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editorId]);

  function openEditor(id: RailEditorId) {
    setDraftRates({ ...form.rateDetails });
    setDraftNotes(form.configuration.compensation_amount_notes ?? "");
    if (id === "union_scale") {
      const seeded = applySagAftraScaleToRateDetails(selection, form.rateDetails);
      setDraftRates(seeded);
    }
    setEditorId(id);
  }

  function closeEditor() {
    setEditorId(null);
  }

  function patchDraftRate(key: keyof RateDetails, raw: string) {
    setDraftRates((current) => ({
      ...current,
      [key]: raw ? Number(raw) : null,
    }));
  }

  function applyUnionDraft(next: SagAftraScaleSelection) {
    setDraftRates((current) => applySagAftraScaleToRateDetails(next, current));
  }

  function applyEditor() {
    if (!editorId) return;

    if (editorId === "union_scale") {
      onFormChange({
        ...form,
        rateType: "union",
        isUnion: true,
        rateDetails: draftRates,
        configuration: {
          ...form.configuration,
          compensation_category_raw: "paid",
        },
      });
      closeEditor();
      return;
    }

    onFormChange({
      ...form,
      rateType: rateTypeForStructure(editorId),
      isUnion: false,
      rateDetails: draftRates,
      configuration: {
        ...form.configuration,
        compensation_category_raw: "paid",
        compensation_amount_notes: editorId === "other" ? draftNotes.trim() || null : form.configuration.compensation_amount_notes,
      },
    });
    closeEditor();
  }

  const editingMeta =
    editorId === "union_scale"
      ? {
          title: "Union scale",
          subtitle: `SAG-AFTRA dancer minimums for ${sagAftraPeriodLabel()}. Adjust the scale, then apply.`,
        }
      : editorId
        ? {
            title: NON_UNION_STRUCTURES.find((item) => item.value === editorId)?.label ?? "Payment",
            subtitle:
              NON_UNION_STRUCTURES.find((item) => item.value === editorId)?.detail ??
              "Enter payment details, then apply.",
          }
        : null;

  const rail =
    mounted && editorId && editingMeta ? (
      createPortal(
        <div className="casting-schedule-rail" role="presentation">
          <button
            type="button"
            className="casting-schedule-rail__backdrop"
            aria-label="Close payment editor"
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
                  {editingMeta.title}
                </h3>
                <p className="casting-schedule-rail__subtitle">{editingMeta.subtitle}</p>
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
                {editorId === "flat" ? (
                  <div className="project-create__field">
                    <span className="project-create__label">Total fee</span>
                    <input
                      className="project-create__input"
                      inputMode="decimal"
                      value={draftRates.fixed_amount ?? ""}
                      onChange={(event) => patchDraftRate("fixed_amount", event.target.value)}
                      placeholder="0"
                      autoFocus
                    />
                  </div>
                ) : null}

                {editorId === "day_rates" ? (
                  <>
                    <div className="project-create__field">
                      <span className="project-create__label">Rehearsal rate</span>
                      <input
                        className="project-create__input"
                        inputMode="decimal"
                        value={draftRates.rehearsal ?? ""}
                        onChange={(event) => patchDraftRate("rehearsal", event.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="project-create__field">
                      <span className="project-create__label">Shoot day</span>
                      <input
                        className="project-create__input"
                        inputMode="decimal"
                        value={draftRates.shoot_day ?? ""}
                        onChange={(event) => patchDraftRate("shoot_day", event.target.value)}
                      />
                    </div>
                    <div className="project-create__field">
                      <span className="project-create__label">Travel day</span>
                      <input
                        className="project-create__input"
                        inputMode="decimal"
                        value={draftRates.travel_day ?? ""}
                        onChange={(event) => patchDraftRate("travel_day", event.target.value)}
                      />
                    </div>
                    <div className="project-create__field">
                      <span className="project-create__label">Per diem</span>
                      <input
                        className="project-create__input"
                        inputMode="decimal"
                        value={draftRates.per_diem ?? ""}
                        onChange={(event) => patchDraftRate("per_diem", event.target.value)}
                      />
                    </div>
                  </>
                ) : null}

                {editorId === "other" ? (
                  <div className="project-create__field">
                    <span className="project-create__label">Describe compensation</span>
                    <textarea
                      className="project-create__textarea"
                      value={draftNotes}
                      onChange={(event) => setDraftNotes(event.target.value)}
                      placeholder="Explain how talent will be paid."
                      rows={5}
                      autoFocus
                    />
                  </div>
                ) : null}

                {editorId === "union_scale" ? (
                  <>
                    <div className="project-create__field">
                      <span className="project-create__label">Agreement</span>
                      <div className="flex flex-wrap gap-2">
                        {SAG_AFTRA_AGREEMENT_OPTIONS.map((option) => {
                          const selected = agreement === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={castingWizardPill(selected)}
                              aria-pressed={selected}
                              onClick={() => {
                                const next = { ...selection, agreement: option.value };
                                setAgreement(option.value);
                                applyUnionDraft(next);
                              }}
                            >
                              <span>{option.label}</span>
                              <CastingWizardChoiceCheck selected={selected} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="project-create__field">
                      <span className="project-create__label">Dancer group</span>
                      <div className="flex flex-wrap gap-2">
                        {SAG_AFTRA_GROUP_OPTIONS.map((option) => {
                          const selected = groupSize === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={castingWizardPill(selected)}
                              aria-pressed={selected}
                              onClick={() => {
                                const next = { ...selection, groupSize: option.value };
                                setGroupSize(option.value);
                                applyUnionDraft(next);
                              }}
                            >
                              <span>{option.label}</span>
                              <CastingWizardChoiceCheck selected={selected} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="project-create__field">
                      <span className="project-create__label">Rate type</span>
                      <div className="flex flex-wrap gap-2">
                        {SAG_AFTRA_UNIT_OPTIONS.map((option) => {
                          const selected = employmentUnit === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={castingWizardPill(selected)}
                              aria-pressed={selected}
                              onClick={() => {
                                const next = { ...selection, employmentUnit: option.value };
                                setEmploymentUnit(option.value);
                                applyUnionDraft(next);
                              }}
                            >
                              <span>{option.label}</span>
                              <CastingWizardChoiceCheck selected={selected} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <p className="casting-schedule-rail__hint">Selected scale: {scaleTitle}</p>

                    {employmentUnit === "daily" ? (
                      <>
                        <div className="project-create__field">
                          <span className="project-create__label">Shoot day</span>
                          <input
                            className="project-create__input"
                            inputMode="decimal"
                            value={draftRates.shoot_day ?? ""}
                            onChange={(event) => patchDraftRate("shoot_day", event.target.value)}
                          />
                        </div>
                        <div className="project-create__field">
                          <span className="project-create__label">Rehearsal</span>
                          <input
                            className="project-create__input"
                            inputMode="decimal"
                            value={draftRates.rehearsal ?? ""}
                            onChange={(event) => patchDraftRate("rehearsal", event.target.value)}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="project-create__field">
                        <span className="project-create__label">Weekly guarantee</span>
                        <input
                          className="project-create__input"
                          inputMode="decimal"
                          value={draftRates.weekly_rate ?? ""}
                          onChange={(event) => patchDraftRate("weekly_rate", event.target.value)}
                        />
                      </div>
                    )}

                    <p className="casting-schedule-rail__hint">{footnotes.rehearsalEliminated}</p>
                    {footnotes.perDiem ? (
                      <p className="casting-schedule-rail__hint">{footnotes.perDiem}</p>
                    ) : null}
                    {footnotes.travel ? (
                      <p className="casting-schedule-rail__hint">{footnotes.travel}</p>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            <footer className="casting-schedule-rail__footer">
              <span />
              <AuthButton type="button" onClick={applyEditor}>
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

      <div className="project-create__field">
        <span className="project-create__label" style={{ color: "var(--ink)" }}>
          Compensation category
        </span>
        <div className="flex flex-wrap gap-2">
          {COMPENSATION_CATEGORY_OPTIONS.map((option) => {
            const selected = category === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={castingWizardPill(selected)}
                aria-pressed={selected}
                onClick={() => updateConfiguration({ compensation_category_raw: option.value })}
              >
                <span>{option.label}</span>
                <CastingWizardChoiceCheck selected={selected} />
              </button>
            );
          })}
        </div>
      </div>

      {isPaid && isUnion ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Payment structure</h3>
          <button
            type="button"
            className={`casting-schedule-step__type-card${
              unionScaleSummary(form) ? " casting-schedule-step__type-card--selected" : ""
            }`}
            onClick={() => openEditor("union_scale")}
            aria-pressed={Boolean(unionScaleSummary(form))}
          >
            <span className="casting-schedule-step__type-copy">
              <span className="casting-schedule-step__type-icon" aria-hidden>
                <DollarSign className="size-4" />
              </span>
              <span className="block font-semibold text-[var(--ink)]">Union scale</span>
              {unionScaleSummary(form) ? (
                <span className="casting-schedule-step__type-summary">{unionScaleSummary(form)}</span>
              ) : (
                <span className="mt-1 block text-sm text-[var(--ink-soft)]">
                  Set SAG-AFTRA agreement, group, and rates.
                </span>
              )}
            </span>
            <CastingWizardChoiceCheck selected={Boolean(unionScaleSummary(form))} />
          </button>
        </div>
      ) : null}

      {isPaid && !isUnion ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Payment structure</h3>
          <div className="grid gap-3">
            {NON_UNION_STRUCTURES.map((option) => {
              const selected = activeStructure === option.value && structureHasValues(form, option.value);
              const summary = structureSummary(form, option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`casting-schedule-step__type-card${
                    selected ? " casting-schedule-step__type-card--selected" : ""
                  }`}
                  onClick={() => openEditor(option.value)}
                  aria-pressed={selected}
                >
                  <span className="casting-schedule-step__type-copy">
                    <span className="casting-schedule-step__type-icon" aria-hidden>
                      <DollarSign className="size-4" />
                    </span>
                    <span className="block font-semibold text-[var(--ink)]">{option.label}</span>
                    {summary && activeStructure === option.value ? (
                      <span className="casting-schedule-step__type-summary">{summary}</span>
                    ) : (
                      <span className="mt-1 block text-sm text-[var(--ink-soft)]">{option.detail}</span>
                    )}
                  </span>
                  <CastingWizardChoiceCheck selected={selected} />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!(isPaid && !isUnion && activeStructure === "other") ? (
        <div className="project-create__field">
          <span className="project-create__label" style={{ color: "var(--ink)" }}>
            Compensation notes
          </span>
          <textarea
            className="project-create__textarea"
            value={form.configuration.compensation_amount_notes ?? ""}
            onChange={(event) => updateConfiguration({ compensation_amount_notes: event.target.value })}
            placeholder="Optional notes about pay, buyouts, or overtime."
            rows={3}
          />
        </div>
      ) : null}

      <CastingTagSelector
        label="Coverage included"
        options={COMPENSATION_COVERAGE_OPTIONS}
        selected={form.configuration.compensation_coverage_raws ?? []}
        onChange={(values) => updateConfiguration({ compensation_coverage_raws: values })}
      />

      {rail}
    </div>
  );
}
