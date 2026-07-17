"use client";

import { AuthField, AuthInput, AuthTextArea } from "@/components/auth/ui";
import type { ClientEntityKind } from "@/lib/clients/types";
import type { CastingComposerForm } from "@/types/casting";

import {
  ClientEntityAutocomplete,
  type SelectedClient,
} from "./ClientEntityAutocomplete";
import { CastingWizardChoiceCheck, PrefillBadge, castingWizardPill } from "./casting-wizard-shared";

/** Matches iOS CastingComposerState.descriptionBounds.maximum */
export const CASTING_DESCRIPTION_MAX_CHARS = 600;

export function CastingBasicsStep({
  form,
  onFormChange,
  showPrefillBadge,
}: {
  form: CastingComposerForm;
  onFormChange: (form: CastingComposerForm) => void;
  showPrefillBadge?: boolean;
}) {
  const clientKind: ClientEntityKind = form.clientEntityKind ?? "company";
  const descriptionLength = form.description.length;
  const clientUndisclosed = form.configuration.confidential_project_client;

  function applyClientSelect(client: SelectedClient) {
    onFormChange({
      ...form,
      productionCompany: client.name,
      productionCompanyLogoUrl: client.imageUrl ?? "",
      clientEntityKind: client.kind,
      configuration: {
        ...form.configuration,
        confidential_project_client: false,
      },
    });
  }

  function setUndisclosedClient(undisclosed: boolean) {
    onFormChange({
      ...form,
      productionCompany: undisclosed ? "" : form.productionCompany,
      productionCompanyLogoUrl: undisclosed ? "" : form.productionCompanyLogoUrl,
      configuration: {
        ...form.configuration,
        confidential_project_client: undisclosed,
      },
    });
  }

  return (
    <div className="space-y-4">
      {showPrefillBadge ? <PrefillBadge /> : null}

      <AuthField label="Casting Title">
        <AuthInput
          value={form.title}
          onChange={(event) => onFormChange({ ...form, title: event.target.value })}
          placeholder="Nike Summer Campaign"
        />
      </AuthField>

      <AuthField label="Description">
        <AuthTextArea
          value={form.description}
          maxLength={CASTING_DESCRIPTION_MAX_CHARS}
          onChange={(event) =>
            onFormChange({
              ...form,
              description: event.target.value.slice(0, CASTING_DESCRIPTION_MAX_CHARS),
            })
          }
          placeholder="What dancers should know about this casting."
        />
        <p className="mt-1.5 text-xs text-[var(--ink-soft)] tabular-nums">
          {descriptionLength} / {CASTING_DESCRIPTION_MAX_CHARS}
        </p>
      </AuthField>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-[var(--ink)]">Client</span>
          <button
            type="button"
            className={castingWizardPill(clientUndisclosed)}
            aria-pressed={clientUndisclosed}
            onClick={() => setUndisclosedClient(!clientUndisclosed)}
          >
            <span>Undisclosed client</span>
            <CastingWizardChoiceCheck selected={clientUndisclosed} />
          </button>
        </div>

        {clientUndisclosed ? (
          <p className="text-sm text-[var(--ink-soft)]">
            Client name will stay hidden on the public casting.
          </p>
        ) : (
          <ClientEntityAutocomplete
            kind={clientKind}
            onKindChange={(kind) => onFormChange({ ...form, clientEntityKind: kind })}
            value={form.productionCompany}
            imageUrl={form.productionCompanyLogoUrl || undefined}
            onChange={(value) =>
              onFormChange({
                ...form,
                productionCompany: value,
                productionCompanyLogoUrl:
                  value === form.productionCompany ? form.productionCompanyLogoUrl : "",
                configuration: {
                  ...form.configuration,
                  confidential_project_client: false,
                },
              })
            }
            onSelect={applyClientSelect}
          />
        )}
      </div>

      <AuthField label="Project type">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={castingWizardPill(form.isUnion === true)}
            aria-pressed={form.isUnion === true}
            onClick={() => onFormChange({ ...form, isUnion: true })}
          >
            <span>Union</span>
            <CastingWizardChoiceCheck selected={form.isUnion === true} />
          </button>
          <button
            type="button"
            className={castingWizardPill(form.isUnion === false)}
            aria-pressed={form.isUnion === false}
            onClick={() =>
              onFormChange({
                ...form,
                isUnion: false,
                ...(form.rateType === "union" ? { rateType: "fixed" as const } : {}),
              })
            }
          >
            <span>Non-union</span>
            <CastingWizardChoiceCheck selected={form.isUnion === false} />
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          Union projects use SAG-AFTRA scale rates on the Compensation step.
        </p>
      </AuthField>
    </div>
  );
}
