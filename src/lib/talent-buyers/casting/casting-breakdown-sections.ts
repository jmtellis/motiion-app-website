import {
  COMPENSATION_CATEGORY_OPTIONS,
  LOCATION_MODE_OPTIONS,
  SUBMISSION_METHOD_OPTIONS,
  SUBMITTER_POLICY_OPTIONS,
  VISIBILITY_PRESENTATION_OPTIONS,
  ELIGIBILITY_OPTIONS,
} from "@/lib/talent-buyers/casting-composer-defaults";
import type { CastingComposerForm, CastingConfiguration } from "@/types/casting";

function labelFor<T extends { value: string; label: string }>(options: readonly T[], value: string | null | undefined) {
  if (!value) return "—";
  return options.find((option) => option.value === value)?.label ?? value;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export type CastingBreakdownSection = {
  title: string;
  rows: { label: string; value: string }[];
};

export function buildCastingBreakdownSections(form: CastingComposerForm): CastingBreakdownSection[] {
  const config = form.configuration;

  return [
    {
      title: "Project basics",
      rows: [
        { label: "Title", value: form.title || "Untitled casting" },
        { label: "Description", value: form.description?.trim() || "—" },
        { label: "Client", value: form.configuration.confidential_project_client
          ? "Undisclosed"
          : form.productionCompany?.trim() || "—" },
        {
          label: "Project type",
          value: form.isUnion === true ? "Union" : form.isUnion === false ? "Non-union" : "—",
        },
        { label: "Casting type", value: config.casting_kinds?.join(", ") || config.casting_kind || "—" },
        { label: "Visibility", value: form.visibility ?? "—" },
      ],
    },
    {
      title: "Location & schedule",
      rows: [
        { label: "Location mode", value: labelFor(LOCATION_MODE_OPTIONS, config.location_mode_raw) },
        { label: "City", value: config.location_city || form.location || "—" },
        { label: "Region", value: config.location_region || "—" },
        { label: "Country", value: config.location_country || "—" },
        { label: "Venue", value: config.location_venue || "—" },
        { label: "Travel required", value: config.travel_required_for_locations ? "Yes" : "No" },
        { label: "Production dates", value: formatScheduleRanges(config) },
        { label: "Audition", value: formatDate(config.audition_date_iso8601) },
        { label: "Callback", value: formatDate(config.callback_date_iso8601) },
      ],
    },
    {
      title: "Compensation",
      rows: [
        { label: "Category", value: labelFor(COMPENSATION_CATEGORY_OPTIONS, config.compensation_category_raw) },
        { label: "Rate type", value: form.rateType },
        {
          label: "Project type",
          value: form.isUnion === true ? "Union" : form.isUnion === false ? "Non-union" : "—",
        },
        { label: "Amount notes", value: config.compensation_amount_notes || "—" },
        {
          label: "Coverage",
          value: config.compensation_coverage_raws?.length
            ? config.compensation_coverage_raws.join(", ")
            : "—",
        },
      ],
    },
    {
      title: "Submission settings",
      rows: [
        {
          label: "Method",
          value: labelFor(
            SUBMISSION_METHOD_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
            config.submission_method_raw,
          ),
        },
        {
          label: "Presentation",
          value: labelFor(VISIBILITY_PRESENTATION_OPTIONS, config.visibility_presentation_raw),
        },
        {
          label: "Submitter policy",
          value: labelFor(SUBMITTER_POLICY_OPTIONS, config.submitter_policy_raw),
        },
        { label: "Deadline", value: formatDate(config.submission_deadline_iso8601) },
        {
          label: "Submission limit",
          value: config.submission_limit != null ? String(config.submission_limit) : "Uncapped",
        },
        {
          label: "Required materials",
          value: config.submission_required_material_raws?.join(", ") || "—",
        },
        {
          label: "Self-tape instructions",
          value: config.self_tape?.prompt_instructions || "—",
        },
        {
          label: "Slate instructions",
          value: config.self_tape?.slate_instructions || "—",
        },
        {
          label: "Supplemental questions",
          value: config.additional_submission_questions?.length
            ? config.additional_submission_questions.map((question) => question.prompt).join("; ")
            : "—",
        },
        {
          label: "Eligibility",
          value: config.eligibility_raws?.length
            ? config.eligibility_raws.map((raw) => labelFor(ELIGIBILITY_OPTIONS, raw)).join(", ")
            : "—",
        },
      ],
    },
    ...form.roles.map((role, index) => ({
      title: `Role ${index + 1}: ${role.title || "Untitled"}`,
      rows: [
        { label: "People needed", value: role.peopleNeeded || "1" },
        { label: "Gender", value: role.gender || "Any" },
        {
          label: "Age range",
          value: [role.ageRangeMin, role.ageRangeMax].filter(Boolean).join("–") || "Any",
        },
        {
          label: "Skills / styles",
          value: role.specialSkills.length ? role.specialSkills.join(", ") : "—",
        },
        {
          label: "Height",
          value: [role.heightMin, role.heightMax].filter(Boolean).join("–") || "—",
        },
        { label: "Union", value: role.unionStatus || "—" },
        { label: "Agency required", value: role.agencyRequired ? "Yes" : "No" },
        {
          label: "Ethnicity preferences",
          value: role.ethnicityPreferences.length ? role.ethnicityPreferences.join(", ") : "—",
        },
      ],
    })),
  ];
}

function formatScheduleRanges(config: CastingConfiguration) {
  const production = config.production_date_ranges ?? [];
  const rehearsal = config.rehearsal_date_ranges ?? [];
  const scheduleDays = (config.schedule_categories ?? []).flatMap(
    (category) => category.selected_days_yyyymmdd ?? [],
  );

  const parts: string[] = [];
  if (production.length) {
    parts.push(
      `Production: ${production.map((range) => `${range.start_yyyymmdd}${range.end_yyyymmdd ? `–${range.end_yyyymmdd}` : ""}`).join(", ")}`,
    );
  }
  if (rehearsal.length) {
    parts.push(
      `Rehearsal: ${rehearsal.map((range) => `${range.start_yyyymmdd}${range.end_yyyymmdd ? `–${range.end_yyyymmdd}` : ""}`).join(", ")}`,
    );
  }
  if (scheduleDays.length) {
    parts.push(`Scheduled days: ${scheduleDays.join(", ")}`);
  }
  return parts.length ? parts.join(" · ") : "—";
}

export function castingConfigurationToComposerForm(
  projectId: string,
  casting: {
    id: string;
    title: string;
    description?: string | null;
    visibility?: string | null;
    location?: string | null;
    configuration?: CastingConfiguration | null;
  },
  roles: CastingComposerForm["roles"] = [],
): CastingComposerForm {
  const configuration = casting.configuration ?? ({} as CastingConfiguration);
  const meta = (configuration as CastingConfiguration & { _composer_meta?: Record<string, unknown> })._composer_meta;

  return {
    projectId,
    castingId: casting.id,
    title: casting.title,
    description: casting.description ?? "",
    productionCompany: "",
    productionCompanyLogoUrl: "",
    rateType: (meta?.rate_type as CastingComposerForm["rateType"]) ?? "fixed",
    rateDetails: (meta?.rate_details as CastingComposerForm["rateDetails"]) ?? {},
    isUnion: Boolean(meta?.is_union),
    visibility: (casting.visibility as CastingComposerForm["visibility"]) ?? "public",
    password: "",
    coverImageUrl: "",
    coverThumbnailAlignment: "top",
    location: casting.location ?? (meta?.location as string | undefined) ?? "",
    startDate: (meta?.start_date as string | undefined) ?? "",
    endDate: (meta?.end_date as string | undefined) ?? "",
    configuration,
    roles,
  };
}
