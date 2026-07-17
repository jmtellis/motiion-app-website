"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { AuthButton, AuthField, AuthInput, AuthTextArea } from "@/components/auth/ui";
import {
  DEFAULT_SUBMISSION_MATERIALS,
  PRIVATE_SUBMITTER_POLICY_OPTIONS,
  SUBMISSION_MATERIAL_OPTIONS,
} from "@/lib/talent-buyers/casting-composer-defaults";
import type { CastingComposerForm } from "@/types/casting";

import {
  CastingTagSelector,
  CastingWizardChoiceBody,
  CastingWizardChoiceCheck,
  PrefillBadge,
  castingWizardChoiceCard,
} from "./casting-wizard-shared";

function sanitizeMaterials(selected: string[]): string[] {
  const allowed = new Set<string>(SUBMISSION_MATERIAL_OPTIONS);
  return selected.filter((item) => allowed.has(item));
}

export function CastingSubmissionStep({
  form,
  updateConfiguration,
  showAdvanced = false,
  showPrefillBadge,
}: {
  form: CastingComposerForm;
  updateConfiguration: (patch: Partial<CastingComposerForm["configuration"]>) => void;
  showAdvanced?: boolean;
  showPrefillBadge?: boolean;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(showAdvanced);
  const isPrivate = form.visibility === "private";
  const materials = sanitizeMaterials(form.configuration.submission_required_material_raws ?? []);
  const requiresSelfTape = materials.includes("Self-tape");
  const requiresAvailability = materials.includes("Availability");

  useEffect(() => {
    const patch: Partial<CastingComposerForm["configuration"]> = {};

    if (form.configuration.submission_method_raw !== "in_app") {
      patch.submission_method_raw = "in_app";
    }

    const sanitized = sanitizeMaterials(form.configuration.submission_required_material_raws ?? []);
    const raw = form.configuration.submission_required_material_raws ?? [];
    const needsSanitize =
      sanitized.length !== raw.length || sanitized.some((item, index) => item !== raw[index]);
    if (needsSanitize) {
      patch.submission_required_material_raws =
        sanitized.length > 0 ? sanitized : [...DEFAULT_SUBMISSION_MATERIALS];
    } else if (sanitized.length === 0) {
      patch.submission_required_material_raws = [...DEFAULT_SUBMISSION_MATERIALS];
    }

    if (!isPrivate && form.configuration.submitter_policy_raw !== "any_viewer") {
      patch.submitter_policy_raw = "any_viewer";
    }
    if (
      isPrivate &&
      (!form.configuration.submitter_policy_raw ||
        form.configuration.submitter_policy_raw === "any_viewer")
    ) {
      patch.submitter_policy_raw = "invited_only";
    }

    if (Object.keys(patch).length > 0) {
      updateConfiguration(patch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrivate, form.visibility, form.configuration.submission_method_raw, form.configuration.submitter_policy_raw]);

  function setMaterials(next: string[]) {
    const sanitized = sanitizeMaterials(next);
    updateConfiguration({
      submission_required_material_raws: sanitized,
      ...(!sanitized.includes("Self-tape") ? { self_tape: null } : {}),
    });
  }

  return (
    <div className="space-y-4">
      {showPrefillBadge ? <PrefillBadge /> : null}

      <p className="text-sm text-[var(--ink-soft)]">
        Talent submits through their Motiion profile. Choose what they must include for this casting.
      </p>

      <CastingTagSelector
        label="Required materials"
        options={SUBMISSION_MATERIAL_OPTIONS}
        selected={materials}
        onChange={setMaterials}
      />

      {requiresSelfTape ? (
        <section className="casting-where-category space-y-3">
          <div>
            <h3 className="casting-where-category__title">Self-tape requirements</h3>
            <p className="casting-where-category__meta">
              Tell talent exactly what to film and how to deliver it.
            </p>
          </div>

          <AuthField label="Prompt / instructions">
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
              placeholder="What should talent perform or show in the tape?"
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
              placeholder="Name, height, location, agency…"
            />
          </AuthField>

          <div className="grid gap-3 md:grid-cols-2">
            <AuthField label="Video length">
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
                placeholder="e.g. 60–90 seconds"
              />
            </AuthField>
            <AuthField label="Choreography link">
              <AuthInput
                type="url"
                value={form.configuration.self_tape?.choreography_link ?? ""}
                onChange={(event) =>
                  updateConfiguration({
                    self_tape: {
                      ...(form.configuration.self_tape ?? {}),
                      choreography_link: event.target.value,
                    },
                  })
                }
                placeholder="https://..."
              />
            </AuthField>
          </div>

          <AuthField label="Upload or link requirements">
            <AuthTextArea
              value={form.configuration.self_tape?.upload_or_link_requirements ?? ""}
              onChange={(event) =>
                updateConfiguration({
                  self_tape: {
                    ...(form.configuration.self_tape ?? {}),
                    upload_or_link_requirements: event.target.value,
                  },
                })
              }
              placeholder="Upload via profile, unlisted YouTube/Vimeo link, file size, framing…"
            />
          </AuthField>
        </section>
      ) : null}

      {requiresAvailability ? (
        <div className="rounded-[0.85rem] border border-[var(--line)] bg-[var(--surface-card)] px-4 py-3 text-sm text-[var(--ink-soft)]">
          Talent should only submit if they are available for all project dates you set on the
          Schedule step.
        </div>
      ) : null}

      <AuthField label="Who can submit">
        {!isPrivate ? (
          <div className="rounded-[0.85rem] border border-[var(--line)] bg-[var(--surface-card)] px-4 py-3">
            <p className="font-medium text-[var(--ink)]">Anyone with a Motiion profile</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              This casting is an open call, so anyone can discover it and submit.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {PRIVATE_SUBMITTER_POLICY_OPTIONS.map((option) => {
              const selected = form.configuration.submitter_policy_raw === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={castingWizardChoiceCard(selected)}
                  aria-pressed={selected}
                  onClick={() => updateConfiguration({ submitter_policy_raw: option.value })}
                >
                  <CastingWizardChoiceBody>
                    <span className="font-semibold text-[var(--ink)]">{option.label}</span>
                  </CastingWizardChoiceBody>
                  <CastingWizardChoiceCheck selected={selected} />
                </button>
              );
            })}
          </div>
        )}
      </AuthField>

      <button
        type="button"
        className="text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]"
        onClick={() => setAdvancedOpen((current) => !current)}
      >
        {advancedOpen ? "Hide optional questions" : "Add optional questions"}
      </button>

      {advancedOpen ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--ink)]">Supplemental questions</h3>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Optional questions talent answers when submitting through their profile.
            </p>
          </div>

          {(form.configuration.additional_submission_questions ?? []).map((question, index) => (
            <div key={question.id_key} className="space-y-2">
              <AuthField label={`Question ${index + 1}`}>
                <AuthInput
                  value={question.prompt}
                  onChange={(event) => {
                    const next = [...form.configuration.additional_submission_questions];
                    next[index] = { ...question, prompt: event.target.value };
                    updateConfiguration({ additional_submission_questions: next });
                  }}
                  placeholder="Question for applicants"
                />
              </AuthField>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-[var(--ink-soft)]">
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
                  className="text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]"
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
      ) : null}
    </div>
  );
}
