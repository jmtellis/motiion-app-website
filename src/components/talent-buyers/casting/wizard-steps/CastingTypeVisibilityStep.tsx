"use client";

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
    <div>
      {showPrefillBadge ? (
        <div className="mb-4">
          <PrefillBadge />
        </div>
      ) : null}

      <section className="casting-wizard-section" aria-labelledby="casting-type-heading">
        <h2 id="casting-type-heading" className="casting-wizard-section__title">
          Casting type
        </h2>
        <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-labelledby="casting-type-heading">
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
      </section>

      <section className="casting-wizard-section" aria-labelledby="casting-visibility-heading">
        <h2 id="casting-visibility-heading" className="casting-wizard-section__title">
          Visibility
        </h2>
        <div className="grid gap-3" role="radiogroup" aria-labelledby="casting-visibility-heading">
          {VISIBILITY_OPTIONS.map((option) => {
            const selected = form.visibility === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                className={castingWizardChoiceCard(selected)}
                aria-checked={selected}
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
      </section>
    </div>
  );
}
