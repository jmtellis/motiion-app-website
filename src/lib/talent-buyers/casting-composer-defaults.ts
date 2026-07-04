import {
  CASTING_CONFIGURATION_SCHEMA_VERSION,
  type CastingComposerForm,
  type CastingConfiguration,
  type CastingRoleForm,
} from "@/types/casting";

export const CASTING_KIND_OPTIONS = [
  { value: "commercial", label: "Commercial" },
  { value: "television_film", label: "Television / Film" },
  { value: "live_performance", label: "Live Performance" },
  { value: "music_video", label: "Music Video" },
  { value: "other", label: "Other" },
] as const;

export const RATE_TYPE_OPTIONS = [
  { value: "fixed", label: "Fixed rate" },
  { value: "segmented", label: "Segmented rates" },
  { value: "union", label: "Union rates" },
  { value: "tbd", label: "TBD" },
] as const;

export const VISIBILITY_OPTIONS = [
  { value: "public", label: "Open call", description: "Talent can discover and submit." },
  { value: "unlisted", label: "Anyone with link", description: "Only visible with the direct link." },
  { value: "private", label: "Password protected", description: "Requires a password to view." },
] as const;

export const LOCATION_MODE_OPTIONS = [
  { value: "in_person", label: "In person" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "travel_required", label: "Travel required" },
] as const;

export const COMPENSATION_CATEGORY_OPTIONS = [
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
  { value: "stipend", label: "Stipend" },
  { value: "deferred", label: "Deferred" },
  { value: "tbd", label: "TBD" },
] as const;

export const SUBMISSION_METHOD_OPTIONS = [
  { value: "in_app", label: "In-app submissions" },
  { value: "external_link", label: "External link" },
  { value: "email", label: "Email submissions" },
  { value: "agency_only", label: "Agency only" },
] as const;

export const SUBMISSION_MATERIAL_OPTIONS = [
  "Headshot",
  "Resume",
  "Reel / video",
  "Self-tape",
  "Dance photos",
  "Availability",
] as const;

export const CARD_COLOR_OPTIONS = [
  { value: "midnight", label: "Midnight" },
  { value: "ocean", label: "Ocean" },
  { value: "sunset", label: "Sunset" },
  { value: "forest", label: "Forest" },
  { value: "lavender", label: "Lavender" },
  { value: "slate", label: "Slate" },
  { value: "rose", label: "Rose" },
  { value: "amber", label: "Amber" },
] as const;

export const CASTING_COMPOSER_STEPS = [
  { id: "basics", label: "Basics" },
  { id: "location", label: "Location & schedule" },
  { id: "compensation", label: "Compensation" },
  { id: "submission", label: "Submission" },
  { id: "roles", label: "Roles" },
  { id: "review", label: "Review" },
] as const;

export function createDefaultCastingConfiguration(isDraft = true): CastingConfiguration {
  return {
    schema_version: CASTING_CONFIGURATION_SCHEMA_VERSION,
    casting_kind: null,
    casting_kinds: [],
    confidential_project_client: false,
    location_mode_raw: "in_person",
    location_city: null,
    location_region: null,
    location_country: null,
    location_venue: null,
    location_address: null,
    local_hire_only: false,
    location_geography_scope_raw: "single",
    location_cities: [],
    travel_required_for_locations: false,
    travel_expense_policy_raw: null,
    location_notes: null,
    rehearsal_date_ranges: [],
    production_date_ranges: [],
    schedule_categories: [],
    submission_deadline_iso8601: null,
    audition_date_iso8601: null,
    callback_date_iso8601: null,
    production_dates_not_known_confirmed: false,
    compensation_category_raw: "paid",
    paid_rate_presentation_raw: null,
    compensation_amount_notes: null,
    compensation_coverage_raws: [],
    compensation_story_notes: null,
    submission_method_raw: "in_app",
    submission_required_material_raws: ["Headshot", "Reel / video"],
    self_tape: null,
    additional_submission_questions: [],
    submission_limit: null,
    close_submissions_automatically_at_deadline: true,
    eligibility_raws: [],
    visibility_presentation_raw: null,
    submitter_policy_raw: null,
    visibility_roster_list_id: null,
    visibility_agency_names: [],
    external_submission_link_url_string: null,
    allow_external_invites: false,
    attachments: [],
    composer_draft: isDraft,
  };
}

export function createDefaultRole(): CastingRoleForm {
  return {
    clientId: crypto.randomUUID(),
    title: "",
    description: "",
    ageRangeMin: "",
    ageRangeMax: "",
    gender: "",
    ethnicityPreferences: [],
    specialSkills: [],
    heightMin: "",
    heightMax: "",
    agencyRequired: false,
    unionStatus: "",
    peopleNeeded: "1",
    visibility: "public",
    password: "",
    cardColorPreset: "midnight",
    coverImageUrl: "",
    clientMatchFilters: null,
  };
}

export function createDefaultCastingComposerForm(): CastingComposerForm {
  return {
    projectId: null,
    title: "",
    description: "",
    productionCompany: "",
    productionCompanyLogoUrl: "",
    rateType: "fixed",
    rateDetails: {},
    isUnion: false,
    visibility: "public",
    password: "",
    coverImageUrl: "",
    coverThumbnailAlignment: "top",
    location: "",
    startDate: "",
    endDate: "",
    configuration: createDefaultCastingConfiguration(true),
    roles: [createDefaultRole()],
  };
}
