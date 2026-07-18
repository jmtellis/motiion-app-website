"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

import {
  publishCasting,
  saveCastingDraft,
  updatePublishedCasting,
} from "@/app/(buyer-app)/(paid)/projects/actions";
import {
  publishProjectCasting,
  saveProjectCastingDraft,
} from "@/app/(buyer-app)/(paid)/projects/[id]/castings/actions";
import {
  AuthButton,
  AuthCard,
  AuthCardContent,
  AuthCardHeader,
  AuthError,
  AuthField,
  AuthInput,
  AuthMuted,
  AuthTextArea,
  authChoiceCard,
  authPill,
} from "@/components/auth/ui";
import { CastingTagSelector } from "@/components/talent-buyers/casting/wizard-steps/casting-wizard-shared";
import {
  CARD_COLOR_OPTIONS,
  CASTING_COMPOSER_STEPS,
  CASTING_KIND_OPTIONS,
  COMPENSATION_CATEGORY_OPTIONS,
  createDefaultCastingComposerForm,
  createDefaultRole,
  LOCATION_MODE_OPTIONS,
  RATE_TYPE_OPTIONS,
  SUBMISSION_MATERIAL_OPTIONS,
  SUBMISSION_METHOD_OPTIONS,
  SUBMITTER_POLICY_OPTIONS,
  VISIBILITY_OPTIONS,
  VISIBILITY_PRESENTATION_OPTIONS,
  COMPENSATION_COVERAGE_OPTIONS,
  ELIGIBILITY_OPTIONS,
} from "@/lib/talent-buyers/casting-composer-defaults";
import { validateCastingStep } from "@/lib/talent-buyers/casting-schema";
import { ETHNICITY_OPTIONS, GENDER_OPTIONS, GENRE_OPTIONS, UNION_STATUS_OPTIONS } from "@/lib/talent-navigator/filter-options";
import type { CastingComposerForm, CastingComposerStep } from "@/types/casting";

function StepNav({
  currentStep,
  onSelect,
}: {
  currentStep: CastingComposerStep;
  onSelect: (step: CastingComposerStep) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CASTING_COMPOSER_STEPS.map((step) => {
        const selected = step.id === currentStep;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelect(step.id)}
            className={authPill(selected)}
          >
            {step.label}
          </button>
        );
      })}
    </div>
  );
}

function TagSelector({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  return <CastingTagSelector label={label} options={options} selected={selected} onChange={onChange} />;
}

function RoleEditor({
  role,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  role: CastingComposerForm["roles"][number];
  index: number;
  onChange: (role: CastingComposerForm["roles"][number]) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="space-y-4 ui-muted-panel border-solid p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--ink)]">Role {index + 1}</h3>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 text-sm font-medium text-rose-700 hover:text-rose-800"
          >
            <Trash2 className="size-4" />
            Remove
          </button>
        ) : null}
      </div>

      <AuthField label="Role title">
        <AuthInput
          value={role.title}
          onChange={(event) => onChange({ ...role, title: event.target.value })}
          placeholder="Lead dancer, ensemble, etc."
        />
      </AuthField>

      <AuthField label="Role description">
        <AuthTextArea
          value={role.description}
          onChange={(event) => onChange({ ...role, description: event.target.value })}
          placeholder="Describe the role, look, and expectations."
        />
      </AuthField>

      <div className="grid gap-4 md:grid-cols-2">
        <AuthField label="Age min">
          <AuthInput
            value={role.ageRangeMin}
            onChange={(event) => onChange({ ...role, ageRangeMin: event.target.value })}
            inputMode="numeric"
            placeholder="18"
          />
        </AuthField>
        <AuthField label="Age max">
          <AuthInput
            value={role.ageRangeMax}
            onChange={(event) => onChange({ ...role, ageRangeMax: event.target.value })}
            inputMode="numeric"
            placeholder="35"
          />
        </AuthField>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AuthField label="Gender">
          <select
            value={role.gender}
            onChange={(event) => onChange({ ...role, gender: event.target.value })}
            className="w-full rounded-[0.85rem] border border-[var(--line)] bg-white px-3 py-3 text-sm text-[var(--ink)]"
          >
            <option value="">Any</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </AuthField>
        <AuthField label="People needed">
          <AuthInput
            value={role.peopleNeeded}
            onChange={(event) => onChange({ ...role, peopleNeeded: event.target.value })}
            inputMode="numeric"
          />
        </AuthField>
      </div>

      <TagSelector
        label="Ethnicity preferences"
        options={ETHNICITY_OPTIONS}
        selected={role.ethnicityPreferences}
        onChange={(values) => onChange({ ...role, ethnicityPreferences: values })}
      />

      <TagSelector
        label="Special skills / styles"
        options={GENRE_OPTIONS}
        selected={role.specialSkills}
        onChange={(values) => onChange({ ...role, specialSkills: values })}
      />

      <AuthMuted>
        Talent browse filters for profile matching are built from these role requirements when you publish.
      </AuthMuted>

      <div className="grid gap-4 md:grid-cols-2">
        <AuthField label="Height min">
          <AuthInput
            value={role.heightMin}
            onChange={(event) => onChange({ ...role, heightMin: event.target.value })}
            placeholder={"5'4\""}
          />
        </AuthField>
        <AuthField label="Height max">
          <AuthInput
            value={role.heightMax}
            onChange={(event) => onChange({ ...role, heightMax: event.target.value })}
            placeholder={"5'10\""}
          />
        </AuthField>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AuthField label="Union status">
          <select
            value={role.unionStatus}
            onChange={(event) => onChange({ ...role, unionStatus: event.target.value })}
            className="w-full rounded-[0.85rem] border border-[var(--line)] bg-white px-3 py-3 text-sm text-[var(--ink)]"
          >
            <option value="">Any</option>
            {UNION_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </AuthField>
        <AuthField label="Card color">
          <select
            value={role.cardColorPreset}
            onChange={(event) =>
              onChange({
                ...role,
                cardColorPreset: event.target.value as CastingComposerForm["roles"][number]["cardColorPreset"],
              })
            }
            className="w-full rounded-[0.85rem] border border-[var(--line)] bg-white px-3 py-3 text-sm text-[var(--ink)]"
          >
            {CARD_COLOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AuthField>
      </div>

      <label className="flex items-center gap-3 text-sm text-[var(--ink)]">
        <input
          type="checkbox"
          checked={role.agencyRequired}
          onChange={(event) => onChange({ ...role, agencyRequired: event.target.checked })}
          className="size-4 rounded border-[var(--line)]"
        />
        Agency representation required
      </label>
    </div>
  );
}

export function CastingComposer({
  initialForm,
  form: controlledForm,
  onFormChange,
  mode = "create",
  presentation = "page",
  onComplete,
  onCancel,
  ensureProjectId,
  scopedLabelVariant,
}: {
  initialForm?: CastingComposerForm;
  form?: CastingComposerForm;
  onFormChange?: (form: CastingComposerForm) => void;
  mode?: "create" | "edit";
  presentation?: "page" | "overlay" | "split" | "scoped";
  onComplete?: (projectId: string) => void;
  onCancel?: () => void;
  ensureProjectId?: () => Promise<string | null>;
  scopedLabelVariant?: "casting";
}) {
  const router = useRouter();
  const [internalForm, setInternalForm] = useState<CastingComposerForm>(
    () => initialForm ?? createDefaultCastingComposerForm(),
  );
  const form = controlledForm ?? internalForm;

  function setForm(updater: CastingComposerForm | ((current: CastingComposerForm) => CastingComposerForm)) {
    const next = typeof updater === "function" ? updater(form) : updater;
    if (onFormChange) {
      onFormChange(next);
      return;
    }
    setInternalForm(next);
  }

  const [currentStep, setCurrentStep] = useState<CastingComposerStep>("basics");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stepIndex = CASTING_COMPOSER_STEPS.findIndex((step) => step.id === currentStep);
  const isEditingPublished = mode === "edit" && !form.configuration.composer_draft;
  const isOverlay = presentation === "overlay";
  const isSplit = presentation === "split";
  const isScoped = presentation === "scoped";
  const isCastingScoped = isScoped && scopedLabelVariant === "casting";

  const parsedForm = useMemo(() => form, [form]);

  async function resolveScopedProjectId() {
    if (form.projectId) return form.projectId;
    if (!isScoped || !ensureProjectId) return form.projectId ?? null;
    const projectId = await ensureProjectId();
    if (!projectId) return null;
    setForm((current) => ({ ...current, projectId }));
    return projectId;
  }

  function updateConfiguration(patch: Partial<CastingComposerForm["configuration"]>) {
    setForm((current) => ({
      ...current,
      configuration: { ...current.configuration, ...patch },
    }));
  }

  function updateRole(index: number, role: CastingComposerForm["roles"][number]) {
    setForm((current) => ({
      ...current,
      roles: current.roles.map((item, itemIndex) => (itemIndex === index ? role : item)),
    }));
  }

  function goToStep(step: CastingComposerStep) {
    setError(null);
    setCurrentStep(step);
  }

  function goNext() {
    const validation = validateCastingStep(currentStep, parsedForm as never);
    if (validation) {
      setError(validation);
      return;
    }

    const nextStep = CASTING_COMPOSER_STEPS[stepIndex + 1];
    if (nextStep) {
      setError(null);
      setCurrentStep(nextStep.id);
    }
  }

  function goBack() {
    const previousStep = CASTING_COMPOSER_STEPS[stepIndex - 1];
    if (previousStep) {
      setError(null);
      setCurrentStep(previousStep.id);
    }
  }

  function handleSaveDraft() {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const projectId = isScoped ? await resolveScopedProjectId() : form.projectId;
      if (isScoped && !projectId) return;

      const payload = projectId ? { ...form, projectId } : form;
      const result =
        isScoped && projectId
          ? await saveProjectCastingDraft(projectId, payload)
          : await saveCastingDraft(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setForm((current) => ({
        ...current,
        projectId: result.projectId,
        castingId: result.castingId ?? current.castingId,
      }));
      setNotice(isCastingScoped ? "Draft saved." : "Draft saved.");
      router.push(`/projects/${result.projectId}/overview`);
    });
  }

  function handlePublish() {
    startTransition(async () => {
      setError(null);
      setNotice(null);

      const validation = validateCastingStep("review", parsedForm as never);
      if (validation) {
        setError(validation);
        setCurrentStep("review");
        return;
      }

      const projectId = isScoped ? await resolveScopedProjectId() : form.projectId;
      if (isScoped && !projectId) return;

      const payload = {
        ...(projectId ? { ...form, projectId } : form),
        configuration: { ...form.configuration, composer_draft: false },
      };

      const result =
        isScoped && projectId
          ? await publishProjectCasting(projectId, payload)
          : isEditingPublished
            ? await updatePublishedCasting(payload)
            : await publishCasting(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (onComplete) {
        onComplete(result.projectId);
        return;
      }

      router.push(`/projects/${result.projectId}/overview`);
    });
  }

  return (
    <div
      className={
        isOverlay || isSplit || isScoped ? "w-full space-y-4" : "mx-auto w-full max-w-4xl space-y-6"
      }
    >
      {!isOverlay && !isSplit && !isScoped ? (
        <div className="flex items-center justify-between gap-4">
          <Link href="/projects" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]">
            <ChevronLeft className="size-4" />
            Back to projects
          </Link>
          <AuthMuted>{mode === "edit" ? "Edit project" : "Create project"}</AuthMuted>
        </div>
      ) : null}

      <AuthCard>
        <AuthCardHeader>
          <AuthMuted>
            {isOverlay
              ? "Set up your project, add roles, and choose how talent can submit."
              : isSplit
                ? "Add project details, roles, and submission settings."
                : isScoped
                  ? "Configure this casting, add roles, and choose how talent can submit."
                  : "Build a project that matches the Motiion app structure, then save a draft or publish when ready."}
          </AuthMuted>
          <StepNav currentStep={currentStep} onSelect={goToStep} />
        </AuthCardHeader>

        <AuthCardContent>
          {error ? <AuthError>{error}</AuthError> : null}
          {notice ? (
            <div className="rounded-[var(--radius-field)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {notice}
            </div>
          ) : null}

          {currentStep === "basics" ? (
            <div className="space-y-4">
              <AuthField label={isScoped ? "Casting title" : "Project title"}>
                <AuthInput
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Nike Summer Campaign"
                />
              </AuthField>

              <AuthField label="Description">
                <AuthTextArea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="What dancers should know about this casting."
                />
              </AuthField>

              {!isScoped ? (
              <div className={isSplit ? "space-y-4" : "grid gap-4 md:grid-cols-2"}>
                <AuthField label="Client">
                  <AuthInput
                    value={form.productionCompany}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, productionCompany: event.target.value }))
                    }
                  />
                </AuthField>
                {!isSplit ? (
                  <AuthField label="Cover image URL">
                    <AuthInput
                      value={form.coverImageUrl}
                      onChange={(event) => setForm((current) => ({ ...current, coverImageUrl: event.target.value }))}
                      placeholder="https://..."
                    />
                  </AuthField>
                ) : null}
              </div>
              ) : null}

              <AuthField label="Project type">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={authChoiceCard(form.isUnion === true)}
                    aria-pressed={form.isUnion === true}
                    onClick={() => setForm((current) => ({ ...current, isUnion: true }))}
                  >
                    <span className="font-semibold text-[var(--ink)]">Union</span>
                  </button>
                  <button
                    type="button"
                    className={authChoiceCard(form.isUnion === false)}
                    aria-pressed={form.isUnion === false}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        isUnion: false,
                        rateType: current.rateType === "union" ? "fixed" : current.rateType,
                      }))
                    }
                  >
                    <span className="font-semibold text-[var(--ink)]">Non-union</span>
                  </button>
                </div>
              </AuthField>

              <AuthField label="Casting type">
                <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Casting type">
                  {CASTING_KIND_OPTIONS.map((option) => {
                    const selectedKind =
                      form.configuration.casting_kind ?? form.configuration.casting_kinds[0] ?? null;
                    const selected = selectedKind === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        className={authChoiceCard(selected)}
                        aria-checked={selected}
                        onClick={() =>
                          updateConfiguration({
                            casting_kind: option.value,
                            casting_kinds: [option.value],
                          })
                        }
                      >
                        <span className="font-semibold text-[var(--ink)]">{option.label}</span>
                        <p className="mt-1 text-sm text-[var(--ink-soft)]">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </AuthField>

              <AuthField label="Visibility">
                <div className="grid gap-3">
                  {VISIBILITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={authChoiceCard(form.visibility === option.value)}
                      onClick={() => setForm((current) => ({ ...current, visibility: option.value }))}
                    >
                      <span className="font-semibold text-[var(--ink)]">{option.label}</span>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">{option.description}</p>
                    </button>
                  ))}
                </div>
              </AuthField>

            </div>
          ) : null}

          {currentStep === "location" ? (
            <div className="space-y-4">
              <AuthField label="Location mode">
                <div className="flex flex-wrap gap-2">
                  {LOCATION_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={authPill(form.configuration.location_mode_raw === option.value)}
                      onClick={() => updateConfiguration({ location_mode_raw: option.value })}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </AuthField>

              <div className="grid gap-4 md:grid-cols-2">
                <AuthField label="City">
                  <AuthInput
                    value={form.configuration.location_city ?? ""}
                    onChange={(event) => updateConfiguration({ location_city: event.target.value })}
                  />
                </AuthField>
                <AuthField label="Region / state">
                  <AuthInput
                    value={form.configuration.location_region ?? ""}
                    onChange={(event) => updateConfiguration({ location_region: event.target.value })}
                  />
                </AuthField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <AuthField label="Country">
                  <AuthInput
                    value={form.configuration.location_country ?? ""}
                    onChange={(event) => updateConfiguration({ location_country: event.target.value })}
                  />
                </AuthField>
                <AuthField label="Venue">
                  <AuthInput
                    value={form.configuration.location_venue ?? ""}
                    onChange={(event) => updateConfiguration({ location_venue: event.target.value })}
                  />
                </AuthField>
              </div>

              <AuthField label="Primary location label">
                <AuthInput
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Los Angeles, CA"
                />
              </AuthField>

              <AuthField label="Location notes">
                <AuthTextArea
                  value={form.configuration.location_notes ?? ""}
                  onChange={(event) => updateConfiguration({ location_notes: event.target.value })}
                />
              </AuthField>

              <label className="flex items-center gap-3 text-sm text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={form.configuration.travel_required_for_locations}
                  onChange={(event) =>
                    updateConfiguration({ travel_required_for_locations: event.target.checked })
                  }
                  className="size-4 rounded border-[var(--line)]"
                />
                Travel required for this production
              </label>

              <AuthField label="Travel expense policy">
                <AuthInput
                  value={form.configuration.travel_expense_policy_raw ?? ""}
                  onChange={(event) => updateConfiguration({ travel_expense_policy_raw: event.target.value })}
                  placeholder="Flights covered, per diem provided, etc."
                />
              </AuthField>

              <label className="flex items-center gap-3 text-sm text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={form.configuration.local_hire_only}
                  onChange={(event) => updateConfiguration({ local_hire_only: event.target.checked })}
                  className="size-4 rounded border-[var(--line)]"
                />
                Local hire only
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <AuthField label="Start date">
                  <AuthInput
                    type="date"
                    value={form.startDate}
                    onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                  />
                </AuthField>
                <AuthField label="End date">
                  <AuthInput
                    type="date"
                    value={form.endDate}
                    onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                  />
                </AuthField>
                <AuthField label="Submission deadline">
                  <AuthInput
                    type="datetime-local"
                    value={form.configuration.submission_deadline_iso8601 ?? ""}
                    onChange={(event) =>
                      updateConfiguration({ submission_deadline_iso8601: event.target.value || null })
                    }
                  />
                </AuthField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <AuthField label="Audition date">
                  <AuthInput
                    type="datetime-local"
                    value={form.configuration.audition_date_iso8601 ?? ""}
                    onChange={(event) =>
                      updateConfiguration({ audition_date_iso8601: event.target.value || null })
                    }
                  />
                </AuthField>
                <AuthField label="Callback date">
                  <AuthInput
                    type="datetime-local"
                    value={form.configuration.callback_date_iso8601 ?? ""}
                    onChange={(event) =>
                      updateConfiguration({ callback_date_iso8601: event.target.value || null })
                    }
                  />
                </AuthField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <AuthField label="Production start">
                  <AuthInput
                    type="date"
                    value={
                      form.configuration.production_date_ranges?.[0]?.start_yyyymmdd
                        ? `${form.configuration.production_date_ranges[0].start_yyyymmdd.slice(0, 4)}-${form.configuration.production_date_ranges[0].start_yyyymmdd.slice(4, 6)}-${form.configuration.production_date_ranges[0].start_yyyymmdd.slice(6, 8)}`
                        : ""
                    }
                    onChange={(event) => {
                      const start = event.target.value.replace(/-/g, "");
                      const end = form.configuration.production_date_ranges?.[0]?.end_yyyymmdd ?? null;
                      updateConfiguration({
                        production_date_ranges: start
                          ? [{ start_yyyymmdd: start, end_yyyymmdd: end }]
                          : [],
                      });
                    }}
                  />
                </AuthField>
                <AuthField label="Production end">
                  <AuthInput
                    type="date"
                    value={
                      form.configuration.production_date_ranges?.[0]?.end_yyyymmdd
                        ? `${form.configuration.production_date_ranges[0].end_yyyymmdd!.slice(0, 4)}-${form.configuration.production_date_ranges[0].end_yyyymmdd!.slice(4, 6)}-${form.configuration.production_date_ranges[0].end_yyyymmdd!.slice(6, 8)}`
                        : ""
                    }
                    onChange={(event) => {
                      const end = event.target.value ? event.target.value.replace(/-/g, "") : null;
                      const start = form.configuration.production_date_ranges?.[0]?.start_yyyymmdd;
                      updateConfiguration({
                        production_date_ranges: start
                          ? [{ start_yyyymmdd: start, end_yyyymmdd: end }]
                          : [],
                      });
                    }}
                  />
                </AuthField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <AuthField label="Rehearsal start">
                  <AuthInput
                    type="date"
                    value={
                      form.configuration.rehearsal_date_ranges?.[0]?.start_yyyymmdd
                        ? `${form.configuration.rehearsal_date_ranges[0].start_yyyymmdd.slice(0, 4)}-${form.configuration.rehearsal_date_ranges[0].start_yyyymmdd.slice(4, 6)}-${form.configuration.rehearsal_date_ranges[0].start_yyyymmdd.slice(6, 8)}`
                        : ""
                    }
                    onChange={(event) => {
                      const start = event.target.value.replace(/-/g, "");
                      const end = form.configuration.rehearsal_date_ranges?.[0]?.end_yyyymmdd ?? null;
                      updateConfiguration({
                        rehearsal_date_ranges: start
                          ? [{ start_yyyymmdd: start, end_yyyymmdd: end }]
                          : [],
                      });
                    }}
                  />
                </AuthField>
                <AuthField label="Rehearsal end">
                  <AuthInput
                    type="date"
                    value={
                      form.configuration.rehearsal_date_ranges?.[0]?.end_yyyymmdd
                        ? `${form.configuration.rehearsal_date_ranges[0].end_yyyymmdd!.slice(0, 4)}-${form.configuration.rehearsal_date_ranges[0].end_yyyymmdd!.slice(4, 6)}-${form.configuration.rehearsal_date_ranges[0].end_yyyymmdd!.slice(6, 8)}`
                        : ""
                    }
                    onChange={(event) => {
                      const end = event.target.value ? event.target.value.replace(/-/g, "") : null;
                      const start = form.configuration.rehearsal_date_ranges?.[0]?.start_yyyymmdd;
                      updateConfiguration({
                        rehearsal_date_ranges: start
                          ? [{ start_yyyymmdd: start, end_yyyymmdd: end }]
                          : [],
                      });
                    }}
                  />
                </AuthField>
              </div>

              <AuthField label="Schedule notes">
                <AuthTextArea
                  value={(form.configuration.schedule_categories?.[0]?.custom_schedule_title as string | undefined) ?? ""}
                  onChange={(event) =>
                    updateConfiguration({
                      schedule_categories: event.target.value
                        ? [
                            {
                              id_key: form.configuration.schedule_categories?.[0]?.id_key ?? crypto.randomUUID(),
                              activity_type_raw: "production",
                              custom_schedule_title: event.target.value,
                              selected_days_yyyymmdd:
                                form.configuration.schedule_categories?.[0]?.selected_days_yyyymmdd ?? [],
                            },
                          ]
                        : [],
                    })
                  }
                  placeholder="Rehearsal week, shoot days, or other schedule details."
                />
              </AuthField>
            </div>
          ) : null}

          {currentStep === "compensation" ? (
            <div className="space-y-4">
              <AuthField label="Rate type">
                <div className="flex flex-wrap gap-2">
                  {RATE_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={authPill(form.rateType === option.value)}
                      onClick={() => setForm((current) => ({ ...current, rateType: option.value }))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </AuthField>

              <AuthField label="Compensation category">
                <div className="flex flex-wrap gap-2">
                  {COMPENSATION_CATEGORY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={authPill(form.configuration.compensation_category_raw === option.value)}
                      onClick={() => updateConfiguration({ compensation_category_raw: option.value })}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </AuthField>

              <div className="grid gap-4 md:grid-cols-2">
                <AuthField label="Fixed amount">
                  <AuthInput
                    inputMode="decimal"
                    value={form.rateDetails.fixed_amount ?? ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rateDetails: {
                          ...current.rateDetails,
                          fixed_amount: event.target.value ? Number(event.target.value) : null,
                        },
                      }))
                    }
                  />
                </AuthField>
                <AuthField label="Rehearsal rate">
                  <AuthInput
                    inputMode="decimal"
                    value={form.rateDetails.rehearsal ?? ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rateDetails: {
                          ...current.rateDetails,
                          rehearsal: event.target.value ? Number(event.target.value) : null,
                        },
                      }))
                    }
                  />
                </AuthField>
              </div>

              <AuthField label="Compensation notes">
                <AuthTextArea
                  value={form.configuration.compensation_amount_notes ?? ""}
                  onChange={(event) => updateConfiguration({ compensation_amount_notes: event.target.value })}
                />
              </AuthField>

              <TagSelector
                label="Coverage included"
                options={COMPENSATION_COVERAGE_OPTIONS}
                selected={form.configuration.compensation_coverage_raws ?? []}
                onChange={(values) => updateConfiguration({ compensation_coverage_raws: values })}
              />

              <AuthField label="Compensation story notes">
                <AuthTextArea
                  value={form.configuration.compensation_story_notes ?? ""}
                  onChange={(event) => updateConfiguration({ compensation_story_notes: event.target.value })}
                />
              </AuthField>
            </div>
          ) : null}

          {currentStep === "submission" ? (
            <div className="space-y-4">
              <AuthField label="Submission method">
                <div className="grid gap-3 md:grid-cols-2">
                  {SUBMISSION_METHOD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={authChoiceCard(form.configuration.submission_method_raw === option.value)}
                      onClick={() => updateConfiguration({ submission_method_raw: option.value })}
                    >
                      <span className="font-semibold text-[var(--ink)]">{option.label}</span>
                    </button>
                  ))}
                </div>
              </AuthField>

              <TagSelector
                label="Required materials"
                options={SUBMISSION_MATERIAL_OPTIONS}
                selected={form.configuration.submission_required_material_raws}
                onChange={(values) => updateConfiguration({ submission_required_material_raws: values })}
              />

              <AuthField label="Listing presentation">
                <div className="grid gap-3 md:grid-cols-2">
                  {VISIBILITY_PRESENTATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={authChoiceCard(form.configuration.visibility_presentation_raw === option.value)}
                      onClick={() => updateConfiguration({ visibility_presentation_raw: option.value })}
                    >
                      <span className="font-semibold text-[var(--ink)]">{option.label}</span>
                    </button>
                  ))}
                </div>
              </AuthField>

              <AuthField label="Who can submit">
                <div className="grid gap-3 md:grid-cols-2">
                  {SUBMITTER_POLICY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={authChoiceCard(form.configuration.submitter_policy_raw === option.value)}
                      onClick={() => updateConfiguration({ submitter_policy_raw: option.value })}
                    >
                      <span className="font-semibold text-[var(--ink)]">{option.label}</span>
                    </button>
                  ))}
                </div>
              </AuthField>

              <div className="grid gap-4 md:grid-cols-2">
                <AuthField label="Submission limit">
                  <AuthInput
                    inputMode="numeric"
                    value={form.configuration.submission_limit?.toString() ?? ""}
                    onChange={(event) =>
                      updateConfiguration({
                        submission_limit: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                    placeholder="Uncapped"
                  />
                </AuthField>
              </div>

              <TagSelector
                label="Eligibility requirements"
                options={ELIGIBILITY_OPTIONS.map((option) => option.label)}
                selected={(form.configuration.eligibility_raws ?? []).map(
                  (raw) => ELIGIBILITY_OPTIONS.find((option) => option.value === raw)?.label ?? raw,
                )}
                onChange={(labels) =>
                  updateConfiguration({
                    eligibility_raws: labels.map(
                      (label) =>
                        ELIGIBILITY_OPTIONS.find((option) => option.label === label)?.value ?? label,
                    ),
                  })
                }
              />

              {form.configuration.submission_method_raw === "external_link" ? (
                <AuthField label="External submission link">
                  <AuthInput
                    value={form.configuration.external_submission_link_url_string ?? ""}
                    onChange={(event) =>
                      updateConfiguration({ external_submission_link_url_string: event.target.value })
                    }
                    placeholder="https://..."
                  />
                </AuthField>
              ) : null}

              <AuthField label="Self-tape instructions">
                <AuthTextArea
                  value={form.configuration.self_tape?.prompt_instructions ?? ""}
                  onChange={(event) =>
                    updateConfiguration({
                      self_tape: {
                        ...(form.configuration.self_tape ?? {}),
                        prompt_instructions: event.target.value,
                      },
                    })
                  }
                />
              </AuthField>

              <AuthField label="Slate instructions">
                <AuthTextArea
                  value={form.configuration.self_tape?.slate_instructions ?? ""}
                  onChange={(event) =>
                    updateConfiguration({
                      self_tape: {
                        ...(form.configuration.self_tape ?? {}),
                        slate_instructions: event.target.value,
                      },
                    })
                  }
                />
              </AuthField>

              <AuthField label="Video length notes">
                <AuthInput
                  value={form.configuration.self_tape?.video_length_notes ?? ""}
                  onChange={(event) =>
                    updateConfiguration({
                      self_tape: {
                        ...(form.configuration.self_tape ?? {}),
                        video_length_notes: event.target.value,
                      },
                    })
                  }
                />
              </AuthField>

              <AuthField label="Supplemental questions">
                <div className="space-y-3">
                  {(form.configuration.additional_submission_questions ?? []).map((question, index) => (
                    <div key={question.id_key} className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                      <AuthInput
                        value={question.prompt}
                        onChange={(event) => {
                          const next = [...form.configuration.additional_submission_questions];
                          next[index] = { ...question, prompt: event.target.value };
                          updateConfiguration({ additional_submission_questions: next });
                        }}
                        placeholder="Question for applicants"
                      />
                      <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                        <input
                          type="checkbox"
                          checked={question.requires_answer}
                          onChange={(event) => {
                            const next = [...form.configuration.additional_submission_questions];
                            next[index] = { ...question, requires_answer: event.target.checked };
                            updateConfiguration({ additional_submission_questions: next });
                          }}
                          className="size-4 rounded border-[var(--line)]"
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        className="text-sm font-medium text-rose-700"
                        onClick={() =>
                          updateConfiguration({
                            additional_submission_questions:
                              form.configuration.additional_submission_questions.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <AuthButton
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      updateConfiguration({
                        additional_submission_questions: [
                          ...form.configuration.additional_submission_questions,
                          {
                            id_key: crypto.randomUUID(),
                            prompt: "",
                            requires_answer: false,
                          },
                        ],
                      })
                    }
                  >
                    <Plus className="size-4" />
                    Add question
                  </AuthButton>
                </div>
              </AuthField>

              <label className="flex items-center gap-3 text-sm text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={form.configuration.allow_external_invites}
                  onChange={(event) => updateConfiguration({ allow_external_invites: event.target.checked })}
                  className="size-4 rounded border-[var(--line)]"
                />
                Allow external invites
              </label>
            </div>
          ) : null}

          {currentStep === "roles" ? (
            <div className="space-y-4">
              {form.roles.map((role, index) => (
                <RoleEditor
                  key={role.clientId}
                  role={role}
                  index={index}
                  onChange={(nextRole) => updateRole(index, nextRole)}
                  onRemove={() =>
                    setForm((current) => ({
                      ...current,
                      roles: current.roles.filter((item) => item.clientId !== role.clientId),
                    }))
                  }
                  canRemove={form.roles.length > 1}
                />
              ))}

              <AuthButton
                variant="secondary"
                className="inline-flex items-center gap-2"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    roles: [...current.roles, createDefaultRole()],
                  }))
                }
              >
                <Plus className="size-4" />
                Add role
              </AuthButton>
            </div>
          ) : null}

          {currentStep === "review" ? (
            <div className="space-y-4">
              <div className="ui-muted-panel border-solid p-5">
                <h3 className="text-sm font-semibold text-[var(--ink)]">Summary</h3>
                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-[var(--ink-soft)]">Title</dt>
                    <dd className="font-medium text-[var(--ink)]">{form.title || "Untitled casting"}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ink-soft)]">Visibility</dt>
                    <dd className="font-medium text-[var(--ink)]">{form.visibility}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ink-soft)]">Location</dt>
                    <dd className="font-medium text-[var(--ink)]">
                      {form.location || form.configuration.location_city || "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ink-soft)]">Roles</dt>
                    <dd className="font-medium text-[var(--ink)]">{form.roles.length}</dd>
                  </div>
                </dl>
              </div>

              <AuthMuted>
                Publishing uses the Motiion casting RPC and requires Choreographer Pro. Drafts can be saved without publishing.
              </AuthMuted>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-6">
            <div className="flex gap-2">
              {stepIndex > 0 ? (
                <AuthButton variant="secondary" onClick={goBack} disabled={isPending}>
                  <ChevronLeft className="mr-1 size-4" />
                  Back
                </AuthButton>
              ) : null}
              {stepIndex < CASTING_COMPOSER_STEPS.length - 1 ? (
                <AuthButton onClick={goNext} disabled={isPending}>
                  Next
                  <ChevronRight className="ml-1 size-4" />
                </AuthButton>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <AuthButton variant="secondary" onClick={handleSaveDraft} disabled={isPending}>
                {isCastingScoped ? "Save draft" : "Save draft"}
              </AuthButton>
              {currentStep === "review" ? (
                <AuthButton onClick={handlePublish} disabled={isPending}>
                  {isEditingPublished
                    ? "Save changes"
                    : isCastingScoped
                      ? "Publish casting"
                      : "Publish project"}
                </AuthButton>
              ) : null}
              {onCancel ? (
                <AuthButton variant="secondary" onClick={onCancel} disabled={isPending}>
                  Cancel
                </AuthButton>
              ) : null}
            </div>
          </div>
        </AuthCardContent>
      </AuthCard>
    </div>
  );
}
