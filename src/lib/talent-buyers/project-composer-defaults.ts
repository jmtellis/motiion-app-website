import {
  PROJECT_TYPE_DESCRIPTIONS,
  PROJECT_TYPE_INTENTION_GROUPS,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPES,
  type ProjectType,
} from "@/lib/talent-buyers/project-types";
import type { ProjectComposerForm, ProjectConfiguration } from "@/types/project";

export const PROJECT_TYPE_OPTIONS = PROJECT_TYPES.map((value) => ({
  value,
  label: PROJECT_TYPE_LABELS[value],
  description: PROJECT_TYPE_DESCRIPTIONS[value],
})) as ReadonlyArray<{ value: ProjectType; label: string; description: string }>;

export { PROJECT_TYPE_INTENTION_GROUPS };

export function createDefaultProjectConfiguration(isDraft = true): ProjectConfiguration {
  return {
    attachments: [],
    composer_draft: isDraft,
  };
}

export function createDefaultProjectComposerForm(): ProjectComposerForm {
  return {
    projectId: null,
    title: "",
    description: "",
    productionCompany: "",
    projectType: "production",
    coverImageUrl: "",
    location: "",
    startDate: "",
    endDate: "",
    enabledModules: {
      casting: false,
      activities: false,
    },
    configuration: createDefaultProjectConfiguration(true),
  };
}

export function parseProjectModules(value: unknown): ProjectComposerForm["enabledModules"] {
  if (!value || typeof value !== "object") {
    return { casting: false, activities: false };
  }

  const modules = value as Record<string, unknown>;
  return {
    casting: Boolean(modules.casting),
    activities: Boolean(modules.activities),
  };
}
