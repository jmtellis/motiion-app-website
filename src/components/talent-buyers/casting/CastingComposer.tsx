"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

import {
  publishCasting,
  saveCastingDraft,
  updatePublishedCasting,
} from "@/app/(buyer-app)/projects/actions";
import {
  AuthButton,
  AuthCard,
  AuthCardContent,
  AuthCardHeader,
  AuthCardTitle,
  AuthError,
  AuthField,
  AuthInput,
  AuthMuted,
  AuthTextArea,
  authChoiceCard,
  authPill,
} from "@/components/auth/ui";
import {
  CARD_COLOR_OPTIONS,
  CASTING_COMPOSER_STEPS,
  CASTING_KIND_OPTIONS,
  COMPENSATION_CATEGORY_OPTIONS,
  createDefaultRole,
  LOCATION_MODE_OPTIONS,
  RATE_TYPE_OPTIONS,
  SUBMISSION_MATERIAL_OPTIONS,
  SUBMISSION_METHOD_OPTIONS,
  VISIBILITY_OPTIONS,
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
  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  return (
    <AuthField label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={authPill(selected.includes(option))}
          >
            {option}
          </button>
        ))}
      </div>
    </AuthField>
  );
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
  mode = "create",
}: {
  initialForm: CastingComposerForm;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<CastingComposerForm>(initialForm);
  const [currentStep, setCurrentStep] = useState<CastingComposerStep>("basics");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stepIndex = CASTING_COMPOSER_STEPS.findIndex((step) => step.id === currentStep);
  const isEditingPublished = mode === "edit" && !form.configuration.composer_draft;

  const parsedForm = useMemo(() => form, [form]);

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
      const result = await saveCastingDraft(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setForm((current) => ({ ...current, projectId: result.projectId }));
      setNotice("Draft saved.");
      router.push(`/projects/${result.projectId}`);
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

      const payload = {
        ...form,
        configuration: { ...form.configuration, composer_draft: false },
      };

      const result = isEditingPublished
        ? await updatePublishedCasting(payload)
        : await publishCasting(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/projects/${result.projectId}`);
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/projects" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]">
          <ChevronLeft className="size-4" />
          Back to projects
        </Link>
        <AuthMuted>{mode === "edit" ? "Edit casting" : "Create casting"}</AuthMuted>
      </div>

      <AuthCard>
        <AuthCardHeader>
          <AuthCardTitle>{mode === "edit" ? "Edit casting" : "Create a casting"}</AuthCardTitle>
          <AuthMuted>
            Build a casting that matches the Motiion app structure, then save a draft or publish when ready.
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
              <AuthField label="Project title">
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

              <div className="grid gap-4 md:grid-cols-2">
                <AuthField label="Production company">
                  <AuthInput
                    value={form.productionCompany}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, productionCompany: event.target.value }))
                    }
                  />
                </AuthField>
                <AuthField label="Cover image URL">
                  <AuthInput
                    value={form.coverImageUrl}
                    onChange={(event) => setForm((current) => ({ ...current, coverImageUrl: event.target.value }))}
                    placeholder="https://..."
                  />
                </AuthField>
              </div>

              <AuthField label="Casting type">
                <div className="grid gap-3 md:grid-cols-2">
                  {CASTING_KIND_OPTIONS.map((option) => {
                    const selected =
                      form.configuration.casting_kind === option.value ||
                      form.configuration.casting_kinds.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={authChoiceCard(selected)}
                        onClick={() =>
                          updateConfiguration({
                            casting_kind: option.value,
                            casting_kinds: selected
                              ? form.configuration.casting_kinds.filter((kind) => kind !== option.value)
                              : [...form.configuration.casting_kinds, option.value],
                          })
                        }
                      >
                        <span className="font-semibold text-[var(--ink)]">{option.label}</span>
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

              {form.visibility === "private" ? (
                <AuthField label="Project password">
                  <AuthInput
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  />
                </AuthField>
              ) : null}
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

              <label className="flex items-center gap-3 text-sm text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={form.isUnion}
                  onChange={(event) => setForm((current) => ({ ...current, isUnion: event.target.checked }))}
                  className="size-4 rounded border-[var(--line)]"
                />
                Union contract
              </label>
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
                Save draft
              </AuthButton>
              {currentStep === "review" ? (
                <AuthButton onClick={handlePublish} disabled={isPending}>
                  {isEditingPublished ? "Save changes" : "Publish casting"}
                </AuthButton>
              ) : null}
            </div>
          </div>
        </AuthCardContent>
      </AuthCard>
    </div>
  );
}
