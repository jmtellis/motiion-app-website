import { z } from "zod";

const projectModulesSchema = z.object({
  casting: z.boolean(),
  activities: z.boolean(),
  roster: z.boolean().optional(),
  classes: z.boolean().optional(),
});

const composableConfigSchema = z
  .object({
    version: z.number(),
    paused: z.array(z.enum(["casting", "roster", "classes"])).default([]),
    prompt_dismissed_at: z.string().nullable().optional(),
    archived_at: z.string().nullable().optional(),
    created_via: z.string().nullable().optional(),
  })
  .passthrough();

const projectAttachmentSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  file_url_string: z.string().nullable().optional(),
  file_name: z.string().nullable().optional(),
  content_type: z.string().nullable().optional(),
  uploaded_at_iso8601: z.string().nullable().optional(),
});

const projectConfigurationSchema = z.object({
  attachments: z.array(projectAttachmentSchema).default([]),
  composer_draft: z.boolean().optional(),
  create_metadata: z.record(z.string(), z.string()).optional(),
  composable: composableConfigSchema.optional(),
});

export const projectComposerFormSchema = z.object({
  projectId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1, "Give your project a title."),
  description: z.string().trim().default(""),
  productionCompany: z.string().trim().default(""),
  projectType: z.enum([
    "job",
    "casting",
    "audition",
    "campaign",
    "tour",
    "production",
    "event",
    "talent_submission",
    "client_presentation",
    "class_program",
    "training_program",
    "internal_planning",
  ]),
  coverImageUrl: z.string().trim().default(""),
  location: z.string().trim().default(""),
  startDate: z.string().trim().default(""),
  endDate: z.string().trim().default(""),
  enabledModules: projectModulesSchema,
  configuration: projectConfigurationSchema,
});

export const projectDraftFormSchema = projectComposerFormSchema;

export function parseProjectComposerForm(payload: unknown) {
  return projectComposerFormSchema.safeParse(payload);
}

export function parseProjectDraftForm(payload: unknown) {
  return projectDraftFormSchema.safeParse(payload);
}

export function validateProjectForm(_form: z.infer<typeof projectComposerFormSchema>) {
  return null;
}
