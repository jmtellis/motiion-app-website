"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, Mic, Plus, Timer, Trash2, X } from "lucide-react";

import { AuthButton } from "@/components/auth/ui";
import { ProjectDatePickerField } from "@/components/talent-buyers/project/ProjectDateRangePicker";
import { ProjectMultiDateCalendar } from "@/components/talent-buyers/project/ProjectMultiDateCalendar";
import {
  buildScheduleConfigurationPatch,
  collectProductionIsoDatesFromCategories,
  createEmptyAuditionSession,
  getAuditionSessions,
  getProductionIsoDates,
  getScheduleCategoryDrafts,
  PRODUCTION_SCHEDULE_ACTIVITY_OPTIONS,
  productionBoundsFromIsoDates,
  productionScheduleLabel,
  type ProductionScheduleActivityType,
  type ProductionScheduleCategoryDraft,
} from "@/lib/talent-buyers/casting/casting-schedule";
import type { CastingAuditionSessionCodable, CastingComposerForm } from "@/types/casting";

import {
  PrefillBadge,
  CastingWizardChoiceCheck,
  castingWizardPill,
} from "./casting-wizard-shared";

import "../../project/project-create.css";

export type CastingScheduleDateTypeId = "project_dates" | "submission_deadline" | "audition";

const SCHEDULE_DATE_TYPES = [
  {
    id: "project_dates" as const,
    label: "Production dates",
    description: "Assign days by type — rehearsal, fitting, shoot, travel, or other.",
    icon: Calendar,
  },
  {
    id: "submission_deadline" as const,
    label: "Submission deadline",
    description: "Last day talent can apply.",
    icon: Timer,
  },
  {
    id: "audition" as const,
    label: "Auditions",
    description: "Add one or more audition dates, with optional callbacks.",
    icon: Mic,
  },
];

type DateTimeDraft = { date: string; time: string };

function splitDateTime(value: string | null | undefined): DateTimeDraft {
  if (!value) return { date: "", time: "" };
  const [date = "", timePart = ""] = value.split("T");
  return { date, time: timePart.slice(0, 5) };
}

function joinDateTime(draft: DateTimeDraft): string {
  const date = draft.date.trim();
  if (!date) return "";
  return `${date}T${draft.time.trim() || "00:00"}`;
}

function formatDisplayDate(value: string): string {
  if (!value) return "";
  const normalized = value.includes("T") ? value : `${value}T12:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  const hasTime = value.includes("T");
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(hasTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

function formatDateList(dates: string[]): string {
  if (!dates.length) return "No days selected";
  if (dates.length === 1) return formatDisplayDate(dates[0]!);
  if (dates.length <= 3) return dates.map(formatDisplayDate).join(" · ");
  return `${dates.length} days · ${formatDisplayDate(dates[0]!)} – ${formatDisplayDate(dates[dates.length - 1]!)}`;
}

function hasScheduleValues(form: CastingComposerForm, typeId: CastingScheduleDateTypeId): boolean {
  switch (typeId) {
    case "project_dates":
      return getProductionIsoDates(form).length > 0;
    case "submission_deadline":
      return Boolean(form.configuration.submission_deadline_iso8601);
    case "audition":
      return getAuditionSessions(form).some((session) => session.datetime_iso8601);
    default:
      return false;
  }
}

function getAppliedSummary(form: CastingComposerForm, typeId: CastingScheduleDateTypeId): string | null {
  switch (typeId) {
    case "project_dates": {
      const drafts = getScheduleCategoryDrafts(form).filter((draft) => draft.selected_days_iso.length);
      if (!drafts.length) {
        const dates = getProductionIsoDates(form);
        if (!dates.length) return null;
        return formatDateList(dates);
      }
      if (drafts.length === 1) {
        const draft = drafts[0]!;
        return `${productionScheduleLabel(draft)} · ${formatDateList(draft.selected_days_iso)}`;
      }
      const totalDays = collectProductionIsoDatesFromCategories(drafts).length;
      return `${drafts.length} types · ${totalDays} days`;
    }
    case "submission_deadline": {
      const value = form.configuration.submission_deadline_iso8601;
      return value ? formatDisplayDate(value) : null;
    }
    case "audition": {
      const sessions = getAuditionSessions(form).filter((session) => session.datetime_iso8601);
      if (!sessions.length) return null;
      if (sessions.length === 1) {
        const session = sessions[0]!;
        const base = `${session.title || "Audition"} · ${formatDisplayDate(session.datetime_iso8601)}`;
        return session.has_callback && session.callback_datetime_iso8601
          ? `${base} · Callback ${formatDisplayDate(session.callback_datetime_iso8601)}`
          : base;
      }
      const withCallbacks = sessions.filter((session) => session.has_callback).length;
      return withCallbacks
        ? `${sessions.length} auditions · ${withCallbacks} with callback`
        : `${sessions.length} auditions`;
    }
    default:
      return null;
  }
}

function ScheduleDateTimeFields({
  draft,
  onChange,
  dateLabel,
  timeLabel,
}: {
  draft: DateTimeDraft;
  onChange: (draft: DateTimeDraft) => void;
  dateLabel: string;
  timeLabel: string;
}) {
  return (
    <div className="casting-schedule-rail__fields casting-schedule-rail__fields--row">
      <ProjectDatePickerField
        label={dateLabel}
        value={draft.date}
        onChange={(date) => onChange({ ...draft, date })}
      />
      <div className="project-create__field">
        <span className="project-create__label">{timeLabel}</span>
        <input
          type="time"
          className="project-create__input"
          value={draft.time}
          onChange={(event) => onChange({ ...draft, time: event.target.value })}
        />
      </div>
    </div>
  );
}

function AuditionSessionEditor({
  session,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  session: CastingAuditionSessionCodable;
  index: number;
  canRemove: boolean;
  onChange: (session: CastingAuditionSessionCodable) => void;
  onRemove: () => void;
}) {
  const datetime = splitDateTime(session.datetime_iso8601);
  const callback = splitDateTime(session.callback_datetime_iso8601);

  return (
    <section className="casting-schedule-rail__audition">
      <div className="casting-schedule-rail__audition-header">
        <h4 className="casting-schedule-rail__audition-title">Audition {index + 1}</h4>
        {canRemove ? (
          <button type="button" className="casting-schedule-rail__audition-remove" onClick={onRemove}>
            <Trash2 className="size-3.5" aria-hidden />
            Remove
          </button>
        ) : null}
      </div>

      <div className="project-create__field">
        <span className="project-create__label">Title</span>
        <input
          className="project-create__input"
          value={session.title}
          placeholder="Open call, Dance call, Final cut…"
          onChange={(event) => onChange({ ...session, title: event.target.value })}
        />
      </div>

      <ScheduleDateTimeFields
        draft={datetime}
        dateLabel="Audition date"
        timeLabel="Audition time"
        onChange={(next) => onChange({ ...session, datetime_iso8601: joinDateTime(next) })}
      />

      <label className="casting-schedule-rail__toggle">
        <input
          type="checkbox"
          checked={session.has_callback}
          onChange={(event) =>
            onChange({
              ...session,
              has_callback: event.target.checked,
              callback_datetime_iso8601: event.target.checked
                ? session.callback_datetime_iso8601
                : null,
            })
          }
        />
        <span>This audition has a callback</span>
      </label>

      {session.has_callback ? (
        <ScheduleDateTimeFields
          draft={callback}
          dateLabel="Callback date"
          timeLabel="Callback time"
          onChange={(next) =>
            onChange({
              ...session,
              callback_datetime_iso8601: joinDateTime(next) || null,
            })
          }
        />
      ) : null}
    </section>
  );
}

function categoryMatchesType(
  draft: ProductionScheduleCategoryDraft,
  activityType: ProductionScheduleActivityType,
  customTitle: string,
) {
  if (draft.activity_type_raw !== activityType) return false;
  if (activityType !== "Custom") return true;
  return draft.custom_schedule_title.trim().toLowerCase() === customTitle.trim().toLowerCase();
}

export function CastingScheduleStep({
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
  const [editingTypeId, setEditingTypeId] = useState<CastingScheduleDateTypeId | null>(null);
  const [scheduleDrafts, setScheduleDrafts] = useState<ProductionScheduleCategoryDraft[]>([]);
  const [activeActivityType, setActiveActivityType] =
    useState<ProductionScheduleActivityType | null>(null);
  const [customTitleDraft, setCustomTitleDraft] = useState("");
  const [deadlineDraft, setDeadlineDraft] = useState<DateTimeDraft>({ date: "", time: "" });
  const [auditionDraft, setAuditionDraft] = useState<CastingAuditionSessionCodable[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const editingType = useMemo(
    () => SCHEDULE_DATE_TYPES.find((type) => type.id === editingTypeId) ?? null,
    [editingTypeId],
  );

  const activeCategory = useMemo(() => {
    if (!activeActivityType) return null;
    return (
      scheduleDrafts.find((draft) =>
        categoryMatchesType(draft, activeActivityType, customTitleDraft),
      ) ?? null
    );
  }, [activeActivityType, customTitleDraft, scheduleDrafts]);

  const categoriesWithDays = useMemo(
    () =>
      scheduleDrafts.filter((draft) => {
        if (!draft.selected_days_iso.length) return false;
        if (draft.activity_type_raw === "Custom" && !draft.custom_schedule_title.trim()) return false;
        return true;
      }),
    [scheduleDrafts],
  );

  const canShowCalendar =
    activeActivityType !== null &&
    (activeActivityType !== "Custom" || customTitleDraft.trim().length > 0);

  function openEditor(typeId: CastingScheduleDateTypeId) {
    setEditingTypeId(typeId);
    if (typeId === "project_dates") {
      const drafts = getScheduleCategoryDrafts(form);
      setScheduleDrafts(drafts);
      const first = drafts.find((draft) => draft.selected_days_iso.length) ?? drafts[0] ?? null;
      if (first) {
        setActiveActivityType(
          (PRODUCTION_SCHEDULE_ACTIVITY_OPTIONS.find(
            (option) => option.value === first.activity_type_raw,
          )?.value ?? "Shoot or Show Day") as ProductionScheduleActivityType,
        );
        setCustomTitleDraft(first.custom_schedule_title);
      } else {
        setActiveActivityType(null);
        setCustomTitleDraft("");
      }
      return;
    }
    if (typeId === "submission_deadline") {
      setDeadlineDraft(splitDateTime(form.configuration.submission_deadline_iso8601));
      return;
    }
    const sessions = getAuditionSessions(form);
    setAuditionDraft(sessions.length ? sessions : [createEmptyAuditionSession({ title: "Audition" })]);
  }

  function closeEditor() {
    setEditingTypeId(null);
    setActiveActivityType(null);
    setCustomTitleDraft("");
  }

  function selectActivityType(activityType: ProductionScheduleActivityType) {
    setActiveActivityType(activityType);
    if (activityType !== "Custom") {
      setCustomTitleDraft("");
    }
    setScheduleDrafts((current) => {
      const existing = current.find((draft) =>
        categoryMatchesType(draft, activityType, activityType === "Custom" ? customTitleDraft : ""),
      );
      if (existing) return current;
      if (activityType === "Custom" && !customTitleDraft.trim()) return current;
      return [
        ...current,
        {
          id_key: crypto.randomUUID(),
          activity_type_raw: activityType,
          custom_schedule_title: activityType === "Custom" ? customTitleDraft.trim() : "",
          selected_days_iso: [],
        },
      ];
    });
  }

  function ensureCustomCategory(title: string) {
    const trimmed = title.trim();
    setCustomTitleDraft(title);
    if (!trimmed || activeActivityType !== "Custom") return;
    setScheduleDrafts((current) => {
      const existing = current.find((draft) => categoryMatchesType(draft, "Custom", trimmed));
      if (existing) {
        return current.map((draft) =>
          draft.id_key === existing.id_key
            ? { ...draft, custom_schedule_title: trimmed }
            : draft,
        );
      }
      return [
        ...current,
        {
          id_key: crypto.randomUUID(),
          activity_type_raw: "Custom",
          custom_schedule_title: trimmed,
          selected_days_iso: [],
        },
      ];
    });
  }

  function updateActiveCategoryDays(days: string[]) {
    if (!activeActivityType) return;
    if (activeActivityType === "Custom" && !customTitleDraft.trim()) return;

    setScheduleDrafts((current) => {
      const index = current.findIndex((draft) =>
        categoryMatchesType(draft, activeActivityType, customTitleDraft),
      );
      if (index === -1) {
        return [
          ...current,
          {
            id_key: crypto.randomUUID(),
            activity_type_raw: activeActivityType,
            custom_schedule_title:
              activeActivityType === "Custom" ? customTitleDraft.trim() : "",
            selected_days_iso: days,
          },
        ];
      }
      return current.map((draft, draftIndex) =>
        draftIndex === index ? { ...draft, selected_days_iso: days } : draft,
      );
    });
  }

  function removeCategory(idKey: string) {
    setScheduleDrafts((current) => current.filter((draft) => draft.id_key !== idKey));
    if (activeCategory?.id_key === idKey) {
      setActiveActivityType(null);
      setCustomTitleDraft("");
    }
  }

  function applyEditor() {
    if (!editingTypeId) return;

    if (editingTypeId === "project_dates") {
      const allDates = collectProductionIsoDatesFromCategories(scheduleDrafts);
      const bounds = productionBoundsFromIsoDates(allDates);
      onFormChange({
        ...form,
        startDate: bounds.startDate,
        endDate: bounds.endDate,
        configuration: {
          ...form.configuration,
          ...buildScheduleConfigurationPatch({ scheduleCategoryDrafts: scheduleDrafts }),
        },
      });
      closeEditor();
      return;
    }

    if (editingTypeId === "submission_deadline") {
      updateConfiguration(
        buildScheduleConfigurationPatch({
          submissionDeadline: joinDateTime(deadlineDraft) || null,
        }),
      );
      closeEditor();
      return;
    }

    updateConfiguration(
      buildScheduleConfigurationPatch({
        auditionSessions: auditionDraft,
      }),
    );
    closeEditor();
  }

  function clearAndClose() {
    if (!editingTypeId) return;

    if (editingTypeId === "project_dates") {
      onFormChange({
        ...form,
        startDate: "",
        endDate: "",
        configuration: {
          ...form.configuration,
          ...buildScheduleConfigurationPatch({ scheduleCategoryDrafts: [] }),
          production_dates_yyyymmdd: [],
          production_date_ranges: [],
          rehearsal_date_ranges: [],
          schedule_categories: [],
        },
      });
      closeEditor();
      return;
    }

    if (editingTypeId === "submission_deadline") {
      updateConfiguration({ submission_deadline_iso8601: null });
      closeEditor();
      return;
    }

    updateConfiguration(
      buildScheduleConfigurationPatch({
        auditionSessions: [],
      }),
    );
    closeEditor();
  }

  useEffect(() => {
    if (!editingTypeId) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeEditor();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingTypeId]);

  const rail =
    mounted && editingType ? (
      createPortal(
        <div className="casting-schedule-rail" role="presentation">
          <button
            type="button"
            className="casting-schedule-rail__backdrop"
            aria-label="Close date editor"
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
                  {editingType.label}
                </h3>
                <p className="casting-schedule-rail__subtitle">{editingType.description}</p>
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
              {editingType.id === "project_dates" ? (
                <div className="casting-schedule-rail__production">
                  <div className="project-create__field">
                    <span className="project-create__label">What is this date for?</span>
                    <div className="flex flex-wrap gap-2">
                      {PRODUCTION_SCHEDULE_ACTIVITY_OPTIONS.map((option) => {
                        const selected = activeActivityType === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className={castingWizardPill(selected)}
                            aria-pressed={selected}
                            onClick={() => selectActivityType(option.value)}
                          >
                            <span>{option.label}</span>
                            <CastingWizardChoiceCheck selected={selected} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {activeActivityType === "Custom" ? (
                    <div className="project-create__field">
                      <span className="project-create__label">Label for other days</span>
                      <input
                        className="project-create__input"
                        value={customTitleDraft}
                        placeholder="e.g. Camera test, Press day"
                        onChange={(event) => ensureCustomCategory(event.target.value)}
                      />
                    </div>
                  ) : null}

                  {canShowCalendar ? (
                    <ProjectMultiDateCalendar
                      label={`Select ${productionScheduleLabel({
                        activity_type_raw: activeActivityType!,
                        custom_schedule_title: customTitleDraft,
                      }).toLowerCase()} days`}
                      values={activeCategory?.selected_days_iso ?? []}
                      onChange={updateActiveCategoryDays}
                    />
                  ) : (
                    <p className="casting-schedule-rail__hint">
                      {activeActivityType === "Custom"
                        ? "Add a label, then pick days on the calendar."
                        : "Choose a date type to pick days on the calendar."}
                    </p>
                  )}

                  {categoriesWithDays.length > 0 ? (
                    <div className="casting-schedule-rail__assigned">
                      <h4 className="casting-schedule-rail__assigned-title">Assigned days</h4>
                      <ul className="casting-schedule-rail__assigned-list">
                        {categoriesWithDays.map((draft) => {
                          const selected =
                            activeCategory?.id_key === draft.id_key ||
                            (activeActivityType !== null &&
                              categoryMatchesType(draft, activeActivityType, customTitleDraft));
                          return (
                            <li key={draft.id_key}>
                              <button
                                type="button"
                                className={`casting-schedule-rail__assigned-item${
                                  selected ? " casting-schedule-rail__assigned-item--active" : ""
                                }`}
                                onClick={() => {
                                  const matched = PRODUCTION_SCHEDULE_ACTIVITY_OPTIONS.find(
                                    (option) => option.value === draft.activity_type_raw,
                                  );
                                  setActiveActivityType(
                                    (matched?.value ?? "Custom") as ProductionScheduleActivityType,
                                  );
                                  setCustomTitleDraft(draft.custom_schedule_title);
                                }}
                              >
                                <span className="casting-schedule-rail__assigned-copy">
                                  <span className="casting-schedule-rail__assigned-label">
                                    {productionScheduleLabel(draft)}
                                  </span>
                                  <span className="casting-schedule-rail__assigned-dates">
                                    {formatDateList(draft.selected_days_iso)}
                                  </span>
                                </span>
                              </button>
                              <button
                                type="button"
                                className="casting-schedule-rail__assigned-remove"
                                aria-label={`Remove ${productionScheduleLabel(draft)}`}
                                onClick={() => removeCategory(draft.id_key)}
                              >
                                <Trash2 className="size-3.5" aria-hidden />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {editingType.id === "submission_deadline" ? (
                <ScheduleDateTimeFields
                  draft={deadlineDraft}
                  onChange={setDeadlineDraft}
                  dateLabel="Deadline date"
                  timeLabel="Deadline time"
                />
              ) : null}

              {editingType.id === "audition" ? (
                <div className="casting-schedule-rail__auditions">
                  {auditionDraft.map((session, index) => (
                    <AuditionSessionEditor
                      key={session.id_key}
                      session={session}
                      index={index}
                      canRemove={auditionDraft.length > 1}
                      onChange={(next) =>
                        setAuditionDraft((current) =>
                          current.map((item) => (item.id_key === next.id_key ? next : item)),
                        )
                      }
                      onRemove={() =>
                        setAuditionDraft((current) =>
                          current.filter((item) => item.id_key !== session.id_key),
                        )
                      }
                    />
                  ))}
                  <button
                    type="button"
                    className="casting-schedule-rail__add-audition"
                    onClick={() =>
                      setAuditionDraft((current) => [
                        ...current,
                        createEmptyAuditionSession({ title: `Audition ${current.length + 1}` }),
                      ])
                    }
                  >
                    <Plus className="size-4" aria-hidden />
                    Add audition
                  </button>
                </div>
              ) : null}
            </div>

            <footer className="casting-schedule-rail__footer">
              {hasScheduleValues(form, editingType.id) || categoriesWithDays.length > 0 ? (
                <AuthButton type="button" variant="secondary" onClick={clearAndClose}>
                  Clear
                </AuthButton>
              ) : (
                <span />
              )}
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

      <div className="grid gap-3 sm:grid-cols-2">
        {SCHEDULE_DATE_TYPES.map((type) => {
          const selected = hasScheduleValues(form, type.id);
          const summary = getAppliedSummary(form, type.id);
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              type="button"
              className={`casting-schedule-step__type-card ${selected ? "casting-schedule-step__type-card--selected" : ""}`}
              onClick={() => openEditor(type.id)}
              aria-pressed={selected}
            >
              <span className="casting-schedule-step__type-copy">
                <span className="casting-schedule-step__type-icon" aria-hidden>
                  <Icon className="size-4" />
                </span>
                <span className="block font-semibold text-[var(--ink)]">{type.label}</span>
                {summary ? (
                  <span className="casting-schedule-step__type-summary">{summary}</span>
                ) : (
                  <span className="mt-1 block text-sm text-[var(--ink-soft)]">{type.description}</span>
                )}
              </span>
              <CastingWizardChoiceCheck selected={selected} />
            </button>
          );
        })}
      </div>

      {rail}
    </div>
  );
}
