"use client";

import { AuthField } from "@/components/auth/ui";
import { CASTING_KIND_OPTIONS, VISIBILITY_OPTIONS } from "@/lib/talent-buyers/casting-composer-defaults";
import type { CastingComposerForm } from "@/types/casting";

import {
  CastingWizardChoiceBody,
  CastingWizardChoiceCheck,
  PrefillBadge,
  castingWizardChoiceCard,
} from "./casting-wizard-shared";

export function CastingTypeVisibilityStep({
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
  return (
    <div className="space-y-4">
      {showPrefillBadge ? <PrefillBadge /> : null}

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
                className={castingWizardChoiceCard(selected)}
                aria-checked={selected}
                onClick={() =>
                  updateConfiguration({
                    casting_kind: option.value,
                    casting_kinds: [option.value],
                  })
                }
              >
                <CastingWizardChoiceBody>
                  <span className="font-semibold text-[var(--ink)]">{option.label}</span>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">{option.description}</p>
                </CastingWizardChoiceBody>
                <CastingWizardChoiceCheck selected={selected} />
              </button>
            );
          })}
        </div>
      </AuthField>

      <AuthField label="Visibility">
        <div className="grid gap-3">
          {VISIBILITY_OPTIONS.map((option) => {
            const selected = form.visibility === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={castingWizardChoiceCard(selected)}
                aria-pressed={selected}
                onClick={() =>
                  onFormChange({
                    ...form,
                    visibility: option.value,
                    configuration: {
                      ...form.configuration,
                      submission_method_raw: "in_app",
                      submitter_policy_raw:
                        option.value === "private"
                          ? form.configuration.submitter_policy_raw &&
                            form.configuration.submitter_policy_raw !== "any_viewer"
                            ? form.configuration.submitter_policy_raw
                            : "invited_only"
                          : "any_viewer",
                      visibility_presentation_raw:
                        option.value === "private" ? "invite_only" : "public_listing",
                    },
                  })
                }
              >
                <CastingWizardChoiceBody>
                  <span className="font-semibold text-[var(--ink)]">{option.label}</span>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">{option.description}</p>
                </CastingWizardChoiceBody>
                <CastingWizardChoiceCheck selected={selected} />
              </button>
            );
          })}
        </div>
      </AuthField>
    </div>
  );
}
