import type { z } from "zod";

import type { projectComposerFormSchema } from "@/lib/talent-buyers/project-schema";
import type { ProjectComposerForm, ProjectRecord } from "@/types/project";
import type { BuyerProjectSummary } from "@/types/talent-buyer-dashboard";

import { parseProjectModules } from "./project-composer-defaults";
import { getNormalizedProjectType } from "./project-types";

type ParsedProjectForm = z.infer<typeof projectComposerFormSchema>;

function nullableTrim(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

type ProjectDraftSource = {
  is_active: boolean | null;
  project_configuration?: { composer_draft?: boolean } | null;
  casting_configuration?: { composer_draft?: boolean } | null;
};

/** Container projects use project_configuration.composer_draft; legacy casting rows use casting_configuration. */
export function isProjectDraft(record: ProjectDraftSource): boolean {
  if (record.is_active === false) return true;

  if (record.project_configuration && "composer_draft" in record.project_configuration) {
    return record.project_configuration.composer_draft === true;
  }

  return record.casting_configuration?.composer_draft === true;
}

function isDraftProject(record: ProjectDraftSource) {
  return isProjectDraft(record);
}

export function buildContainerProjectInsertRow(
  posterId: string,
  form: ParsedProjectForm,
  isDraft: boolean,
  lockedProjectType?: string | null,
) {
  return {
    poster_id: posterId,
    title: form.title.trim(),
    description: nullableTrim(form.description),
    production_company: nullableTrim(form.productionCompany),
    cover_image_url: nullableTrim(form.coverImageUrl),
    location: nullableTrim(form.location),
    start_date: nullableTrim(form.startDate),
    end_date: nullableTrim(form.endDate),
    project_type: lockedProjectType ?? form.projectType,
    enabled_modules: form.enabledModules,
    project_configuration: {
      ...form.configuration,
      composer_draft: isDraft,
    },
    is_active: !isDraft,
    visibility: "private",
    // Container projects do not publish castings on create; keep casting config in draft
    // so choreographer quota triggers do not treat the project row as a published casting.
    casting_configuration: { schema_version: 7, composer_draft: true },
  };
}

/** Update payload for existing projects — never wipe casting_configuration (iOS source of truth). */
export function buildContainerProjectUpdateRow(
  posterId: string,
  form: ParsedProjectForm,
  isDraft: boolean,
  lockedProjectType?: string | null,
) {
  const projectType = lockedProjectType ?? form.projectType;
  const row: Record<string, unknown> = {
    poster_id: posterId,
    title: form.title.trim(),
    description: nullableTrim(form.description),
    production_company: nullableTrim(form.productionCompany),
    cover_image_url: nullableTrim(form.coverImageUrl),
    location: nullableTrim(form.location),
    start_date: nullableTrim(form.startDate),
    end_date: nullableTrim(form.endDate),
    project_type: projectType,
    enabled_modules: form.enabledModules,
    project_configuration: {
      ...form.configuration,
      composer_draft: isDraft,
    },
    is_active: !isDraft,
  };

  // Casting visibility/config are owned by casting publish sync — don't clobber them here.
  if (projectType !== "casting") {
    row.visibility = "private";
  }

  return row;
}

export function projectRecordToComposerForm(record: ProjectRecord): ProjectComposerForm {
  const isDraft = isProjectDraft(record);

  return {
    projectId: record.id,
    title: record.title ?? "",
    description: record.description ?? "",
    productionCompany: record.production_company ?? "",
    projectType: getNormalizedProjectType(record.project_type),
    coverImageUrl: record.cover_image_url ?? "",
    location: record.location ?? "",
    startDate: record.start_date ?? "",
    endDate: record.end_date ?? "",
    enabledModules: parseProjectModules(record.enabled_modules),
    configuration: {
      attachments: record.project_configuration?.attachments ?? [],
      composer_draft: isDraft,
      create_metadata: record.project_configuration?.create_metadata ?? {},
    },
  };
}

export function mapProjectRecordToSummary(record: ProjectRecord): BuyerProjectSummary {
  return {
    id: record.id,
    title: record.title || "Untitled project",
    projectType: getNormalizedProjectType(record.project_type),
    status: isDraftProject(record) ? "draft" : record.is_active ? "active" : "archived",
    lastUpdated: record.updated_at ?? record.created_at ?? new Date().toISOString(),
    talentCount: 0,
    coverImageUrl: record.cover_image_url,
  };
}
