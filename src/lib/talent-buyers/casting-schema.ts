import { z } from "zod";

const optionalTrimmedString = z.string().trim().optional().default("");
const optionalNumberString = z.string().trim().optional().default("");

const rateDetailsSchema = z
  .object({
    fixed_amount: z.number().nullable().optional(),
    rehearsal: z.number().nullable().optional(),
    shoot_day: z.number().nullable().optional(),
    travel_day: z.number().nullable().optional(),
    per_diem: z.number().nullable().optional(),
    weekly_rate: z.number().nullable().optional(),
    hazard_pay: z.number().nullable().optional(),
    personal_equipment: z.number().nullable().optional(),
    other_label: z.string().nullable().optional(),
    other_amount: z.number().nullable().optional(),
  })
  .default({});

const castingSubmissionQuestionSchema = z.object({
  id_key: z.string().uuid(),
  prompt: z.string().trim().min(1),
  requires_answer: z.boolean(),
});

const castingConfigurationSchema = z.object({
  schema_version: z.number().int().default(7),
  casting_kind: z.string().nullable().optional(),
  casting_kinds: z.array(z.string()).default([]),
  confidential_project_client: z.boolean().default(false),
  location_mode_raw: z.string().nullable().optional(),
  location_city: z.string().nullable().optional(),
  location_region: z.string().nullable().optional(),
  location_country: z.string().nullable().optional(),
  location_venue: z.string().nullable().optional(),
  location_address: z.string().nullable().optional(),
  local_hire_only: z.boolean().default(false),
  location_geography_scope_raw: z.string().nullable().optional(),
  location_cities: z.array(z.string()).default([]),
  travel_required_for_locations: z.boolean().default(false),
  travel_expense_policy_raw: z.string().nullable().optional(),
  location_notes: z.string().nullable().optional(),
  rehearsal_date_ranges: z
    .array(
      z.object({
        start_yyyymmdd: z.string(),
        end_yyyymmdd: z.string().nullable().optional(),
      }),
    )
    .default([]),
  production_date_ranges: z
    .array(
      z.object({
        start_yyyymmdd: z.string(),
        end_yyyymmdd: z.string().nullable().optional(),
      }),
    )
    .default([]),
  schedule_categories: z
    .array(
      z.object({
        id_key: z.string(),
        activity_type_raw: z.string(),
        custom_schedule_title: z.string().nullable().optional(),
        selected_days_yyyymmdd: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  submission_deadline_iso8601: z.string().nullable().optional(),
  audition_date_iso8601: z.string().nullable().optional(),
  callback_date_iso8601: z.string().nullable().optional(),
  production_dates_not_known_confirmed: z.boolean().default(false),
  compensation_category_raw: z.string().nullable().optional(),
  paid_rate_presentation_raw: z.string().nullable().optional(),
  compensation_amount_notes: z.string().nullable().optional(),
  compensation_coverage_raws: z.array(z.string()).default([]),
  compensation_story_notes: z.string().nullable().optional(),
  submission_method_raw: z.string().nullable().optional(),
  submission_required_material_raws: z.array(z.string()).default([]),
  self_tape: z
    .object({
      prompt_instructions: z.string().nullable().optional(),
      slate_instructions: z.string().nullable().optional(),
      choreography_link: z.string().nullable().optional(),
      video_length_notes: z.string().nullable().optional(),
      upload_or_link_requirements: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  additional_submission_questions: z.array(castingSubmissionQuestionSchema).default([]),
  submission_limit: z.number().int().nullable().optional(),
  close_submissions_automatically_at_deadline: z.boolean().default(true),
  eligibility_raws: z.array(z.string()).default([]),
  visibility_presentation_raw: z.string().nullable().optional(),
  submitter_policy_raw: z.string().nullable().optional(),
  visibility_roster_list_id: z.string().nullable().optional(),
  visibility_agency_names: z.array(z.string()).default([]),
  external_submission_link_url_string: z.string().nullable().optional(),
  allow_external_invites: z.boolean().default(false),
  attachments: z
    .array(
      z.object({
        id: z.string().uuid(),
        title: z.string(),
        file_url_string: z.string().nullable().optional(),
        content_type: z.string().nullable().optional(),
        uploaded_at_iso8601: z.string().nullable().optional(),
      }),
    )
    .default([]),
  composer_draft: z.boolean().default(true),
});

const castingRoleSchema = z.object({
  clientId: z.string().uuid(),
  id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1, "Each role needs a title."),
  description: optionalTrimmedString,
  ageRangeMin: optionalNumberString,
  ageRangeMax: optionalNumberString,
  gender: optionalTrimmedString,
  ethnicityPreferences: z.array(z.string()).default([]),
  specialSkills: z.array(z.string()).default([]),
  heightMin: optionalTrimmedString,
  heightMax: optionalTrimmedString,
  agencyRequired: z.boolean().default(false),
  unionStatus: optionalTrimmedString,
  peopleNeeded: z.string().trim().default("1"),
  visibility: z.enum(["public", "unlisted", "private"]).default("public"),
  password: optionalTrimmedString,
  cardColorPreset: z
    .enum(["midnight", "ocean", "sunset", "forest", "lavender", "slate", "rose", "amber"])
    .default("midnight"),
  coverImageUrl: optionalTrimmedString,
  clientMatchFilters: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const castingComposerFormSchema = z.object({
  projectId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1, "Project title is required."),
  description: optionalTrimmedString,
  productionCompany: optionalTrimmedString,
  productionCompanyLogoUrl: optionalTrimmedString,
  rateType: z.enum(["fixed", "segmented", "union", "tbd"]).default("fixed"),
  rateDetails: rateDetailsSchema,
  isUnion: z.boolean().default(false),
  visibility: z.enum(["public", "unlisted", "private"]).default("public"),
  password: optionalTrimmedString,
  coverImageUrl: optionalTrimmedString,
  coverThumbnailAlignment: z.enum(["top", "center", "bottom"]).default("top"),
  location: optionalTrimmedString,
  startDate: optionalTrimmedString,
  endDate: optionalTrimmedString,
  configuration: castingConfigurationSchema,
  roles: z.array(castingRoleSchema).min(1, "Add at least one role."),
});

export const castingDraftFormSchema = castingComposerFormSchema.extend({
  title: z.string().trim().optional().default(""),
});

export type ParsedCastingComposerForm = z.infer<typeof castingComposerFormSchema>;

export function parseCastingComposerForm(payload: unknown) {
  return castingComposerFormSchema.safeParse(payload);
}

export function parseCastingDraftForm(payload: unknown) {
  return castingDraftFormSchema.safeParse(payload);
}

export function validateCastingStep(
  step: "basics" | "location" | "compensation" | "submission" | "roles" | "review",
  form: ParsedCastingComposerForm,
): string | null {
  switch (step) {
    case "basics":
      if (!form.title.trim()) return "Project title is required.";
      return null;
    case "location":
      return null;
    case "compensation":
      return null;
    case "submission":
      if (
        form.configuration.submission_method_raw === "external_link" &&
        !form.configuration.external_submission_link_url_string?.trim()
      ) {
        return "Add an external submission link or choose another submission method.";
      }
      return null;
    case "roles":
      if (!form.roles.length) return "Add at least one role.";
      if (form.roles.some((role) => !role.title.trim())) return "Each role needs a title.";
      return null;
    case "review":
      return validateCastingStep("basics", form) ?? validateCastingStep("roles", form);
    default:
      return null;
  }
}
