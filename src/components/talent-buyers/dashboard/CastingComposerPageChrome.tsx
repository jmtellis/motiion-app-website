"use client";

import type { CastingComposerStep } from "@/types/casting";

import { useRegisterBuyerChrome } from "./BuyerPageChromeContext";

export function CastingComposerPageChrome({
  mode,
  projectTitle,
  projectId,
  currentStep,
}: {
  mode: "create" | "edit";
  projectTitle?: string;
  projectId?: string | null;
  currentStep?: CastingComposerStep;
}) {
  useRegisterBuyerChrome({
    revision: currentStep,
    breadcrumbs:
      mode === "create"
        ? [{ label: "Projects", href: "/projects" }, { label: "Create project" }]
        : projectId
          ? [
              { label: "Projects", href: "/projects" },
              { label: projectTitle || "Project", href: `/projects/${projectId}` },
              { label: "Edit project" },
            ]
          : [{ label: "Projects", href: "/projects" }],
  });

  return null;
}
