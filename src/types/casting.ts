export const CASTING_CONFIGURATION_SCHEMA_VERSION = 8;

export type ProjectVisibility = "public" | "unlisted" | "private";
export type RateType = "fixed" | "segmented" | "union" | "tbd";
export type CardColorPreset =
  | "midnight"
  | "ocean"
  | "sunset"
  | "forest"
  | "lavender"
  | "slate"
  | "rose"
  | "amber";

export type CastingKind =
  | "television_film"
  | "live_performance"
  | "commercial"
  | "music_video"
  | "other";

export type CastingLocationMode = "in_person" | "remote" | "hybrid" | "travel_required";
export type CastingLocationGeographyScope = "single" | "multiple";
export type CastingCompensationCategory = "paid" | "unpaid" | "stipend" | "deferred" | "tbd";
export type CastingSubmissionMethod = "in_app" | "external_link" | "email" | "agency_only" | "invite_only";

export type RateDetails = {
  fixed_amount?: number | null;
  rehearsal?: number | null;
  shoot_day?: number | null;
  travel_day?: number | null;
  per_diem?: number | null;
  weekly_rate?: number | null;
  hazard_pay?: number | null;
  personal_equipment?: number | null;
  other_label?: string | null;
  other_amount?: number | null;
};

export type CastingCodableDateRange = {
  start_yyyymmdd: string;
  end_yyyymmdd?: string | null;
};

export type CastingScheduleCategoryCodable = {
  id_key: string;
  activity_type_raw: string;
  custom_schedule_title?: string | null;
  selected_days_yyyymmdd: string[];
};

export type CastingAuditionSessionCodable = {
  id_key: string;
  title: string;
  datetime_iso8601: string;
  has_callback: boolean;
  callback_datetime_iso8601?: string | null;
  location_mode_raw: "in_person" | "remote" | string | null;
  remote_url?: string | null;
  location_label?: string | null;
  location_city?: string | null;
  location_region?: string | null;
  location_notes?: string | null;
  location_same_as_production: boolean;
};

export type CastingProductionDayLocationCodable = {
  date_yyyymmdd: string;
  location_label?: string | null;
  location_venue?: string | null;
  location_city?: string | null;
  location_region?: string | null;
  location_country?: string | null;
  location_address?: string | null;
};

/** Per schedule-category location assignment (fitting, rehearsal, shoot, travel, etc.). */
export type CastingScheduleLocationGroupCodable = {
  category_id_key: string;
  /** single = shared; per_day = some/all days differ; none = travel location off */
  location_scope_raw: "single" | "per_day" | "none" | string | null;
  location_label?: string | null;
  location_venue?: string | null;
  location_city?: string | null;
  location_region?: string | null;
  location_country?: string | null;
  location_address?: string | null;
  day_locations: CastingProductionDayLocationCodable[];
};

export type CastingProductionLocationScope = "single" | "per_day";

export type CastingSelfTapePersistence = {
  prompt_instructions?: string | null;
  slate_instructions?: string | null;
  choreography_link?: string | null;
  video_length_notes?: string | null;
  upload_or_link_requirements?: string | null;
};

export type CastingSubmissionQuestionCodable = {
  id_key: string;
  prompt: string;
  requires_answer: boolean;
};

export type CastingAttachmentCodable = {
  id: string;
  title: string;
  file_url_string?: string | null;
  file_name?: string | null;
  content_type?: string | null;
  uploaded_at_iso8601?: string | null;
};

export type CastingConfiguration = {
  schema_version: number;
  casting_kind?: CastingKind | string | null;
  casting_kinds: (CastingKind | string)[];
  confidential_project_client: boolean;
  location_mode_raw?: CastingLocationMode | string | null;
  location_city?: string | null;
  location_region?: string | null;
  location_country?: string | null;
  location_venue?: string | null;
  location_address?: string | null;
  local_hire_only: boolean;
  location_geography_scope_raw?: CastingLocationGeographyScope | string | null;
  location_cities: string[];
  travel_required_for_locations: boolean;
  travel_expense_policy_raw?: string | null;
  location_notes?: string | null;
  rehearsal_date_ranges: CastingCodableDateRange[];
  production_date_ranges: CastingCodableDateRange[];
  production_dates_yyyymmdd: string[];
  production_location_scope_raw: CastingProductionLocationScope | string | null;
  production_day_locations: CastingProductionDayLocationCodable[];
  schedule_location_groups: CastingScheduleLocationGroupCodable[];
  schedule_categories: CastingScheduleCategoryCodable[];
  submission_deadline_iso8601?: string | null;
  audition_date_iso8601?: string | null;
  callback_date_iso8601?: string | null;
  audition_sessions: CastingAuditionSessionCodable[];
  production_dates_not_known_confirmed: boolean;
  compensation_category_raw?: CastingCompensationCategory | string | null;
  paid_rate_presentation_raw?: string | null;
  compensation_amount_notes?: string | null;
  compensation_coverage_raws: string[];
  compensation_story_notes?: string | null;
  submission_method_raw?: CastingSubmissionMethod | string | null;
  submission_required_material_raws: string[];
  self_tape?: CastingSelfTapePersistence | null;
  additional_submission_questions: CastingSubmissionQuestionCodable[];
  submission_limit?: number | null;
  close_submissions_automatically_at_deadline: boolean;
  eligibility_raws: string[];
  visibility_presentation_raw?: string | null;
  submitter_policy_raw?: string | null;
  visibility_roster_list_id?: string | null;
  visibility_agency_names: string[];
  external_submission_link_url_string?: string | null;
  allow_external_invites: boolean;
  attachments: CastingAttachmentCodable[];
  composer_draft: boolean;
};

export type CastingRoleForm = {
  clientId: string;
  id?: string | null;
  title: string;
  description: string;
  ageRangeMin: string;
  ageRangeMax: string;
  gender: string;
  ethnicityPreferences: string[];
  specialSkills: string[];
  heightMin: string;
  heightMax: string;
  agencyRequired: boolean;
  unionStatus: string;
  peopleNeeded: string;
  visibility: ProjectVisibility;
  password: string;
  cardColorPreset: CardColorPreset;
  coverImageUrl: string;
  clientMatchFilters: Record<string, unknown> | null;
};

export type CastingComposerForm = {
  projectId?: string | null;
  castingId?: string | null;
  title: string;
  description: string;
  productionCompany: string;
  productionCompanyLogoUrl: string;
  /** Artist / project / company segment for Client lookup UI. */
  clientEntityKind?: "artist" | "project" | "company" | null;
  rateType: RateType;
  rateDetails: RateDetails;
  /** Null until the user picks Union or Non-union. */
  isUnion: boolean | null;
  /** Null until the user picks a visibility option. */
  visibility: ProjectVisibility | null;
  password: string;
  coverImageUrl: string;
  coverThumbnailAlignment: "top" | "center" | "bottom";
  location: string;
  startDate: string;
  endDate: string;
  configuration: CastingConfiguration;
  roles: CastingRoleForm[];
};

export type CastingProjectRecord = {
  id: string;
  poster_id: string;
  project_type?: string | null;
  enabled_modules?: Record<string, boolean> | null;
  title: string;
  description: string | null;
  production_company: string | null;
  production_company_logo_url: string | null;
  rate_type: string | null;
  rate_details: RateDetails | null;
  is_union: boolean | null;
  visibility: string | null;
  password_hash: string | null;
  cover_image_url: string | null;
  cover_thumbnail_alignment: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  casting_configuration: CastingConfiguration | null;
  project_configuration?: { composer_draft?: boolean; attachments?: unknown[] } | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type CastingRoleRecord = {
  id: string;
  poster_id: string | null;
  project_id: string | null;
  title: string;
  production: string;
  description: string | null;
  age_range_min: number | null;
  age_range_max: number | null;
  gender: string | null;
  ethnicity_preferences: string[] | null;
  special_skills: string[] | null;
  is_active: boolean | null;
  cover_image_url: string | null;
  card_color_preset: string | null;
  visibility: string | null;
  password_hash: string | null;
  height_min: string | null;
  height_max: string | null;
  agency_required: boolean | null;
  union_status: string | null;
  people_needed: number | null;
  client_match_filters: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

export type CastingProjectDetail = {
  project: CastingProjectRecord;
  roles: CastingRoleRecord[];
  submissionCounts: Record<string, number>;
};

export type SaveCastingDraftResult =
  | { ok: true; projectId: string; roleIds: string[]; castingId?: string }
  | { ok: false; error: string; code?: string };

export type PublishCastingResult =
  | { ok: true; projectId: string; roleIds: string[]; publicRoleId?: string; castingId?: string }
  | { ok: false; error: string; code?: string };

export type CastingComposerStep =
  | "basics"
  | "location"
  | "compensation"
  | "submission"
  | "roles"
  | "review";
