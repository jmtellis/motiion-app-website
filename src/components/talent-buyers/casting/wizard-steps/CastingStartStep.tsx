"use client";

import { FileText, PenLine } from "lucide-react";

import type { CastingWizardPath } from "@/lib/talent-buyers/casting-create-wizard";

import {
  CastingWizardChoiceBody,
  CastingWizardChoiceCheck,
  castingWizardChoiceCard,
} from "./casting-wizard-shared";

export function CastingStartStep({
  onSelectPath,
}: {
  onSelectPath: (path: CastingWizardPath) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <button type="button" className={castingWizardChoiceCard(false)} onClick={() => onSelectPath("breakdown")}>
        <CastingWizardChoiceBody>
          <FileText className="mb-3 size-6 text-[var(--ink-soft)]" />
          <span className="block font-semibold text-[var(--ink)]">I have a breakdown</span>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Upload your document and we&apos;ll prefill project details, roles, and submission settings.
          </p>
        </CastingWizardChoiceBody>
        <CastingWizardChoiceCheck selected={false} />
      </button>

      <button type="button" className={castingWizardChoiceCard(false)} onClick={() => onSelectPath("scratch")}>
        <CastingWizardChoiceBody>
          <PenLine className="mb-3 size-6 text-[var(--ink-soft)]" />
          <span className="block font-semibold text-[var(--ink)]">Start from scratch</span>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Step through each section and fill in your casting details manually.
          </p>
        </CastingWizardChoiceBody>
        <CastingWizardChoiceCheck selected={false} />
      </button>
    </div>
  );
}
