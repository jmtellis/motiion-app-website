import {
  CASTING_CONFIGURATION_SCHEMA_VERSION,
  type CastingComposerForm,
  type CastingConfiguration,
  type CastingRoleForm,
} from "@/types/casting";

export const CASTING_KIND_OPTIONS = [
  {
    value: "commercial",
    label: "Print / Commercial",
    description: "Industrials, brand campaigns, and advertising work.",
  },
  {
    value: "television_film",
    label: "Television / Film",
    description: "Movies, TV shows on networks, or streaming services.",
  },
  {
    value: "live_performance",
    label: "Live Performance",
    description: "Festivals, corporate events, concerts, and tours.",
  },
  {
    value: "music_video",
    label: "Music Video",
    description: "Official videos for a song or music artist.",
  },
  {
    value: "other",
    label: "Other",
    description: "Only if the project doesn't fit the categories above.",
  },
] as const;

export const RATE_TYPE_OPTIONS = [
  { value: "fixed", label: "Fixed rate" },
  { value: "segmented", label: "Segmented rates" },
  { value: "union", label: "Union rates" },
  { value: "tbd", label: "TBD" },
] as const;

export const VISIBILITY_OPTIONS = [
  { value: "public", label: "Open call", description: "Talent can discover and submit." },
  {
    value: "private",
    label: "Private",
    description: "Talent can only submit when invited.",
  },
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
  { value: "in_app", label: "In-app submissions", mobile: "submit_through_motiion" },
  { value: "external_link", label: "External link", mobile: "external_link" },
  { value: "email", label: "Email submissions", mobile: "submit_through_motiion" },
  { value: "agency_only", label: "Agency only", mobile: "agency_only" },
  { value: "invite_only", label: "Invite only", mobile: "invite_only" },
] as const;

export const VISIBILITY_PRESENTATION_OPTIONS = [
  { value: "public_listing", label: "Public listing" },
  { value: "invite_only", label: "Invite only" },
  { value: "private_link", label: "Private link" },
  { value: "agency_only_posting", label: "Agency only posting" },
  { value: "roster_restricted", label: "Roster restricted" },
] as const;

export const SUBMITTER_POLICY_OPTIONS = [
  { value: "any_viewer", label: "Any viewer can submit" },
  { value: "invited_only", label: "Invited talent only" },
  { value: "represented_only", label: "Represented talent only" },
  { value: "roster_only", label: "Roster only" },
] as const;

/** Private castings only — public open calls always use any_viewer. */
export const PRIVATE_SUBMITTER_POLICY_OPTIONS = SUBMITTER_POLICY_OPTIONS.filter(
  (option) => option.value !== "any_viewer",
);

export const ELIGIBILITY_OPTIONS = [
  { value: "must_be_18_plus", label: "Must be 18+" },
  { value: "must_be_local_hire", label: "Local hire only" },
  { value: "union_only", label: "Union only" },
  { value: "non_union_only", label: "Non-union only" },
  { value: "agency_represented_only", label: "Agency represented only" },
] as const;

export const COMPENSATION_COVERAGE_OPTIONS = [
  "Travel covered",
  "Lodging covered",
  "Meals provided",
  "Parking covered",
  "Wardrobe provided",
  "Hair/makeup provided",
  "Per diem",
] as const;

export const SUBMISSION_MATERIAL_OPTIONS = [
  "Headshot",
  "Resume",
  "Reel / video",
  "Self-tape",
  "Availability",
] as const;

export const DEFAULT_SUBMISSION_MATERIALS = ["Headshot", "Resume"] as const;

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
    production_dates_yyyymmdd: [],
    production_location_scope_raw: "single",
    production_day_locations: [],
    schedule_location_groups: [],
    schedule_categories: [],
    submission_deadline_iso8601: null,
    audition_date_iso8601: null,
    callback_date_iso8601: null,
    audition_sessions: [],
    production_dates_not_known_confirmed: false,
    compensation_category_raw: null,
    paid_rate_presentation_raw: null,
    compensation_amount_notes: null,
    compensation_coverage_raws: [],
    compensation_story_notes: null,
    submission_method_raw: "in_app",
    submission_required_material_raws: [...DEFAULT_SUBMISSION_MATERIALS],
    self_tape: null,
    additional_submission_questions: [],
    submission_limit: null,
    close_submissions_automatically_at_deadline: true,
    eligibility_raws: [],
    visibility_presentation_raw: null,
    submitter_policy_raw: "any_viewer",
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
    castingId: null,
    title: "",
    description: "",
    productionCompany: "",
    productionCompanyLogoUrl: "",
    clientEntityKind: null,
    rateType: "fixed",
    rateDetails: {},
    isUnion: null,
    visibility: null,
    password: "",
    coverImageUrl: "",
    coverThumbnailAlignment: "top",
    location: "",
    startDate: "",
    endDate: "",
    configuration: createDefaultCastingConfiguration(true),
    roles: [],
  };
}
