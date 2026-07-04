import { digestCastingPassword } from "@/lib/talent-buyers/casting-password";
import type { ParsedCastingComposerForm } from "@/lib/talent-buyers/casting-schema";
import type {
  CastingComposerForm,
  CastingConfiguration,
  CastingProjectRecord,
  CastingRoleRecord,
} from "@/types/casting";

function nullableTrim(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalInt(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function projectPasswordHash(form: ParsedCastingComposerForm) {
  if (form.visibility !== "private") return null;
  const trimmed = form.password.trim();
  return trimmed ? digestCastingPassword(trimmed) : null;
}

function rolePasswordHash(role: ParsedCastingComposerForm["roles"][number]) {
  if (role.visibility !== "private") return null;
  const trimmed = role.password.trim();
  return trimmed ? digestCastingPassword(trimmed) : null;
}

function cleanRateDetails(rateDetails: ParsedCastingComposerForm["rateDetails"]) {
  const entries = Object.entries(rateDetails).filter(([, value]) => value != null && value !== "");
  return entries.length ? Object.fromEntries(entries) : null;
}

export function buildCastingConfiguration(
  configuration: CastingConfiguration | ParsedCastingComposerForm["configuration"],
  isDraft: boolean,
): CastingConfiguration {
  return {
    ...(configuration as CastingConfiguration),
    composer_draft: isDraft,
  };
}

export function buildRpcProjectPayload(form: ParsedCastingComposerForm, isDraft: boolean) {
  return {
    title: form.title.trim(),
    description: nullableTrim(form.description),
    production_company: nullableTrim(form.productionCompany),
    production_company_logo_url: nullableTrim(form.productionCompanyLogoUrl),
    rate_type: form.rateType,
    rate_details: cleanRateDetails(form.rateDetails),
    is_union: form.isUnion,
    visibility: form.visibility,
    password_hash: projectPasswordHash(form),
    cover_image_url: nullableTrim(form.coverImageUrl),
    location: nullableTrim(form.location),
    start_date: nullableTrim(form.startDate) ?? null,
    end_date: nullableTrim(form.endDate) ?? null,
    casting_configuration: buildCastingConfiguration(form.configuration, isDraft),
    is_active: !isDraft,
  };
}

export function buildRpcRolesPayload(form: ParsedCastingComposerForm, isDraft: boolean) {
  return form.roles.map((role) => ({
    title: role.title.trim(),
    production: form.title.trim(),
    description: nullableTrim(role.description),
    age_range_min: parseOptionalInt(role.ageRangeMin),
    age_range_max: parseOptionalInt(role.ageRangeMax),
    gender: nullableTrim(role.gender),
    ethnicity_preferences: role.ethnicityPreferences,
    special_skills: role.specialSkills,
    card_color_preset: role.cardColorPreset,
    cover_image_url: nullableTrim(role.coverImageUrl) ?? nullableTrim(form.coverImageUrl),
    visibility: role.visibility,
    password_hash: rolePasswordHash(role),
    height_min: nullableTrim(role.heightMin),
    height_max: nullableTrim(role.heightMax),
    agency_required: role.agencyRequired,
    union_status: nullableTrim(role.unionStatus),
    people_needed: parseOptionalInt(role.peopleNeeded) ?? 1,
    client_match_filters: role.clientMatchFilters,
    is_active: !isDraft,
  }));
}

export function buildProjectInsertRow(
  posterId: string,
  form: ParsedCastingComposerForm,
  isDraft: boolean,
) {
  return {
    poster_id: posterId,
    title: form.title.trim() || "Untitled casting",
    description: nullableTrim(form.description),
    production_company: nullableTrim(form.productionCompany),
    production_company_logo_url: nullableTrim(form.productionCompanyLogoUrl),
    rate_type: form.rateType,
    rate_details: cleanRateDetails(form.rateDetails),
    is_union: form.isUnion,
    visibility: form.visibility,
    password_hash: projectPasswordHash(form),
    cover_image_url: nullableTrim(form.coverImageUrl),
    cover_thumbnail_alignment: form.coverThumbnailAlignment,
    location: nullableTrim(form.location),
    start_date: nullableTrim(form.startDate),
    end_date: nullableTrim(form.endDate),
    casting_configuration: buildCastingConfiguration(form.configuration, isDraft),
    is_active: !isDraft,
  };
}

export function buildRoleInsertRow(
  posterId: string,
  projectId: string,
  form: ParsedCastingComposerForm,
  role: ParsedCastingComposerForm["roles"][number],
  isDraft: boolean,
) {
  return {
    poster_id: posterId,
    project_id: projectId,
    title: role.title.trim(),
    production: form.title.trim() || "Untitled casting",
    description: nullableTrim(role.description),
    age_range_min: parseOptionalInt(role.ageRangeMin),
    age_range_max: parseOptionalInt(role.ageRangeMax),
    gender: nullableTrim(role.gender),
    ethnicity_preferences: role.ethnicityPreferences.length ? role.ethnicityPreferences : null,
    special_skills: role.specialSkills.length ? role.specialSkills : null,
    card_color_preset: role.cardColorPreset,
    cover_image_url: nullableTrim(role.coverImageUrl) ?? nullableTrim(form.coverImageUrl),
    visibility: role.visibility,
    password_hash: rolePasswordHash(role),
    height_min: nullableTrim(role.heightMin),
    height_max: nullableTrim(role.heightMax),
    agency_required: role.agencyRequired,
    union_status: nullableTrim(role.unionStatus),
    people_needed: parseOptionalInt(role.peopleNeeded) ?? 1,
    client_match_filters: role.clientMatchFilters,
    is_active: !isDraft,
  };
}

export function mapRpcErrorMessage(code?: string, fallback?: string) {
  switch (code) {
    case "auth_required":
      return "You must be signed in to publish a casting.";
    case "subscription_required_for_casting_create":
      return "Choreographer Pro is required to publish castings. You can still save a draft.";
    case "roles_required":
      return "Add at least one role before publishing.";
    case "invalid_project":
    case "invalid_casting_configuration":
      return fallback ?? "Check your casting details and try again.";
    default:
      return fallback ?? "Something went wrong while saving your casting.";
  }
}

export function castingRecordToComposerForm(
  project: CastingProjectRecord,
  roles: CastingRoleRecord[],
): CastingComposerForm {
  const configuration = project.casting_configuration ?? {
    schema_version: 7,
    casting_kinds: [],
    confidential_project_client: false,
    local_hire_only: false,
    location_cities: [],
    travel_required_for_locations: false,
    rehearsal_date_ranges: [],
    production_date_ranges: [],
    schedule_categories: [],
    production_dates_not_known_confirmed: false,
    compensation_coverage_raws: [],
    submission_required_material_raws: [],
    additional_submission_questions: [],
    close_submissions_automatically_at_deadline: true,
    eligibility_raws: [],
    visibility_agency_names: [],
    allow_external_invites: false,
    attachments: [],
    composer_draft: true,
  };

  return {
    projectId: project.id,
    title: project.title ?? "",
    description: project.description ?? "",
    productionCompany: project.production_company ?? "",
    productionCompanyLogoUrl: project.production_company_logo_url ?? "",
    rateType: (project.rate_type as ParsedCastingComposerForm["rateType"]) ?? "fixed",
    rateDetails: project.rate_details ?? {},
    isUnion: project.is_union ?? false,
    visibility: (project.visibility as ParsedCastingComposerForm["visibility"]) ?? "public",
    password: "",
    coverImageUrl: project.cover_image_url ?? "",
    coverThumbnailAlignment:
      (project.cover_thumbnail_alignment as ParsedCastingComposerForm["coverThumbnailAlignment"]) ??
      "top",
    location: project.location ?? "",
    startDate: project.start_date ?? "",
    endDate: project.end_date ?? "",
    configuration,
    roles: roles.length
      ? roles.map((role) => ({
          clientId: role.id,
          id: role.id,
          title: role.title,
          description: role.description ?? "",
          ageRangeMin: role.age_range_min != null ? String(role.age_range_min) : "",
          ageRangeMax: role.age_range_max != null ? String(role.age_range_max) : "",
          gender: role.gender ?? "",
          ethnicityPreferences: role.ethnicity_preferences ?? [],
          specialSkills: role.special_skills ?? [],
          heightMin: role.height_min ?? "",
          heightMax: role.height_max ?? "",
          agencyRequired: role.agency_required ?? false,
          unionStatus: role.union_status ?? "",
          peopleNeeded: role.people_needed != null ? String(role.people_needed) : "1",
          visibility: (role.visibility as ParsedCastingComposerForm["roles"][number]["visibility"]) ?? "public",
          password: "",
          cardColorPreset:
            (role.card_color_preset as ParsedCastingComposerForm["roles"][number]["cardColorPreset"]) ??
            "midnight",
          coverImageUrl: role.cover_image_url ?? "",
          clientMatchFilters: role.client_match_filters,
        }))
      : [],
  } satisfies CastingComposerForm;
}
