"use client";

import { useMemo } from "react";

import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";
import {
  getProjectCreateConfig,
  type ProjectCreateConfig,
} from "@/lib/talent-buyers/project-create-registry";
import type { ProjectType } from "@/lib/talent-buyers/project-types";

import { ProjectCreateShell } from "./ProjectCreateShell";
import { seedProjectFormForType } from "./ProjectSelectionsPanel";

export function TypedProjectCreatePage({ projectType }: { projectType: ProjectType }) {
  const createConfig = useMemo(() => getProjectCreateConfig(projectType), [projectType]);
  const initialForm = useMemo(() => seedProjectFormForType(projectType, createConfig), [projectType, createConfig]);

  useRegisterBuyerChrome({
    breadcrumbs: [
      { label: "Projects", href: "/projects" },
      { label: createConfig.breadcrumbLabel },
    ],
    title: createConfig.pageTitle,
  });

  return (
    <ProjectCreateShell
      mode="create"
      projectType={projectType}
      createConfig={createConfig}
      initialForm={initialForm}
    />
  );
}

export type { ProjectCreateConfig };
