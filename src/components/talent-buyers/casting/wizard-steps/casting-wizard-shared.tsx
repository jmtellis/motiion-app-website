"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Circle } from "lucide-react";

import { AuthField } from "@/components/auth/ui";
import { ChipGroup } from "@/components/ui/ChipGroup";

export function castingWizardChoiceCard(selected: boolean) {
  return `casting-wizard-choice${selected ? " casting-wizard-choice--selected" : ""}`;
}

export function castingWizardPill(selected: boolean) {
  return `casting-wizard-pill${selected ? " casting-wizard-pill--selected" : ""}`;
}

export function CastingWizardChoiceCheck({ selected }: { selected: boolean }) {
  if (selected) {
    return (
      <CheckCircle2
        className="casting-wizard-choice__check casting-wizard-choice__check--selected"
        fill="currentColor"
        stroke="#0a0a0a"
        aria-hidden
      />
    );
  }

  return <Circle className="casting-wizard-choice__check" aria-hidden />;
}

export function CastingWizardChoiceBody({ children }: { children: ReactNode }) {
  return <span className="casting-wizard-choice__body">{children}</span>;
}

export function CastingTagSelector({
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
  return (
    <AuthField label={label}>
      <ChipGroup multiple ariaLabel={label} options={options} value={selected} onChange={onChange} />
    </AuthField>
  );
}

export function PrefillBadge() {
  return <span className="casting-create-wizard__prefill-badge">From breakdown</span>;
}
