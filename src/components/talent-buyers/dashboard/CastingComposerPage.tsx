"use client";

import { CastingComposer } from "@/components/talent-buyers/casting/CastingComposer";
import type { CastingComposerForm } from "@/types/casting";

import { CastingComposerPageChrome } from "./CastingComposerPageChrome";

/** @deprecated Use project create + scoped casting routes instead. */
export function CastingComposerPage({
  initialForm,
  mode = "create",
}: {
  initialForm: CastingComposerForm;
  mode?: "create" | "edit";
}) {
  return (
    <>
      <CastingComposerPageChrome
        mode={mode}
        projectId={initialForm.projectId}
        projectTitle={initialForm.title}
      />
      <CastingComposer initialForm={initialForm} mode={mode} presentation="page" />
    </>
  );
}
