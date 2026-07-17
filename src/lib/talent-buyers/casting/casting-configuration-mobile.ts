import type { ParsedCastingComposerForm } from "@/lib/talent-buyers/casting-schema";
import type { CastingAttachmentCodable, CastingConfiguration } from "@/types/casting";

type ComposerMeta = {
  rate_type?: string;
  rate_details?: Record<string, unknown>;
  is_union?: boolean;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

const SUBMISSION_METHOD_TO_MOBILE: Record<string, string> = {
  in_app: "submit_through_motiion",
  submit_through_motiion: "submit_through_motiion",
  external_link: "external_link",
  email: "submit_through_motiion",
  agency_only: "agency_only",
  invite_only: "invite_only",
};

const VISIBILITY_TO_MOBILE: Record<string, string> = {
  public: "public_listing",
  unlisted: "private_link",
  private: "private_link",
  public_listing: "public_listing",
  invite_only: "invite_only",
  private_link: "private_link",
  agency_only_posting: "agency_only_posting",
  roster_restricted: "roster_restricted",
};

const SUBMITTER_POLICY_TO_MOBILE: Record<string, string> = {
  any_viewer: "any_viewer",
  invited_only: "invited_only",
  represented_only: "represented_only",
  roster_only: "roster_only",
};

const MATERIAL_LABEL_TO_MOBILE: Record<string, string> = {
  Headshot: "headshot",
  Resume: "resume",
  "Reel / video": "dance_reel",
  "Self-tape": "self_tape",
  "Dance photos": "full_body_photo",
  Availability: "availability_confirmation",
};

const LOCATION_MODE_TO_MOBILE: Record<string, string> = {
  in_person: "in_person",
  remote: "remote_submission",
  remote_submission: "remote_submission",
  hybrid: "hybrid",
  travel_required: "travel_required",
};

const COMPENSATION_CATEGORY_TO_MOBILE: Record<string, string> = {
  paid: "paid",
  unpaid: "unpaid",
  deferred: "deferred",
  stipend: "trade_exposure",
  trade_exposure: "trade_exposure",
  tbd: "tbd",
};

const RATE_TYPE_TO_PAID_PRESENTATION: Record<string, string> = {
  fixed: "flat_fee",
  segmented: "day_rate",
  union: "weekly",
  tbd: "flat_fee",
};

export function mapSubmissionMethodToMobile(raw: string | null | undefined): string {
  if (!raw) return "submit_through_motiion";
  return SUBMISSION_METHOD_TO_MOBILE[raw] ?? raw;
}

export function mapVisibilityToMobile(raw: string | null | undefined, fallbackVisibility: string): string {
  const key = raw ?? fallbackVisibility;
  return VISIBILITY_TO_MOBILE[key] ?? "public_listing";
}

export function mapSubmitterPolicyToMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return SUBMITTER_POLICY_TO_MOBILE[raw] ?? raw;
}

export function mapSubmissionMaterialsToMobile(materials: string[]): string[] {
  return materials.map((item) => MATERIAL_LABEL_TO_MOBILE[item] ?? item);
}

export function mapLocationModeToMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return LOCATION_MODE_TO_MOBILE[raw] ?? raw;
}

export function mapCompensationCategoryToMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return COMPENSATION_CATEGORY_TO_MOBILE[raw] ?? raw;
}

/** Normalize datetime-local / partial ISO values to RFC3339 for iOS parsers. */
export function normalizeDeadlineToIso8601(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  // Already timezone-aware ISO.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return value;
  }

  // datetime-local: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
  const localMatch = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/);
  if (localMatch) {
    const [, date, time, seconds = "00"] = localMatch;
    const parsed = new Date(`${date}T${time}:${seconds}`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  // Date-only
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T23:59:59`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const fallback = new Date(value);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toISOString();
  }

  return value;
}

function cleanRateDetails(rateDetails: Record<string, unknown> | null | undefined) {
  if (!rateDetails || typeof rateDetails !== "object") return {};
  const entries = Object.entries(rateDetails).filter(([, value]) => value != null && value !== "");
  return Object.fromEntries(entries);
}

function normalizeAttachments(attachments: CastingAttachmentCodable[] | undefined): CastingAttachmentCodable[] {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((item) => item && typeof item.id === "string")
    .map((item) => ({
      ...item,
      file_name: item.file_name?.trim() || item.title?.trim() || "attachment",
      file_url_string: item.file_url_string?.trim() || null,
      content_type: item.content_type?.trim() || null,
      uploaded_at_iso8601: item.uploaded_at_iso8601 ?? null,
    }));
}

export function stripComposerMeta(configuration: CastingConfiguration): CastingConfiguration {
  const { _composer_meta: _, ...clean } = configuration as CastingConfiguration & {
    _composer_meta?: ComposerMeta;
  };
  return clean;
}

export function readComposerMeta(configuration: CastingConfiguration | null | undefined): ComposerMeta {
  const meta = (configuration as CastingConfiguration & { _composer_meta?: ComposerMeta })?._composer_meta;
  return meta ?? {};
}

/** Normalize website composer config to iOS schema v7 values for mobile detail/submit. */
export function normalizeCastingConfigurationForMobile(
  form: ParsedCastingComposerForm,
  isDraft: boolean,
  options?: { preserveAttachments?: CastingAttachmentCodable[] },
): CastingConfiguration {
  const clean = stripComposerMeta(form.configuration);
  const rateType = form.rateType ?? "tbd";
  const formAttachments = normalizeAttachments(clean.attachments);
  const preservedAttachments = normalizeAttachments(options?.preserveAttachments);
  const attachments = formAttachments.length ? formAttachments : preservedAttachments;

  const compensationCategory =
    mapCompensationCategoryToMobile(clean.compensation_category_raw) ??
    (rateType === "tbd" ? "tbd" : "paid");

  return {
    ...clean,
    schema_version: clean.schema_version ?? 7,
    composer_draft: isDraft,
    location_city: clean.location_city ?? (form.location?.trim() || null),
    location_mode_raw: mapLocationModeToMobile(clean.location_mode_raw) ?? clean.location_mode_raw,
    submission_deadline_iso8601: normalizeDeadlineToIso8601(clean.submission_deadline_iso8601),
    submission_method_raw: mapSubmissionMethodToMobile(clean.submission_method_raw),
    submission_required_material_raws: mapSubmissionMaterialsToMobile(
      clean.submission_required_material_raws ?? [],
    ),
    visibility_presentation_raw: mapVisibilityToMobile(
      clean.visibility_presentation_raw,
      form.visibility ?? "public",
    ),
    submitter_policy_raw: mapSubmitterPolicyToMobile(clean.submitter_policy_raw),
    compensation_category_raw: compensationCategory,
    paid_rate_presentation_raw:
      clean.paid_rate_presentation_raw ??
      (compensationCategory === "paid" ? RATE_TYPE_TO_PAID_PRESENTATION[rateType] ?? null : null),
    attachments,
    close_submissions_automatically_at_deadline:
      clean.close_submissions_automatically_at_deadline ?? true,
  };
}

const PRIVATE_VISIBILITY_PRESENTATIONS = new Set([
  "invite_only",
  "private_link",
  "agency_only_posting",
  "roster_restricted",
]);

/** Map casting visibility onto projects.visibility so talent RLS / public API can load detail. */
export function mapProjectVisibilityColumn(
  formVisibility: string | null | undefined,
  presentationRaw: string | null | undefined,
): string {
  const presentation = (presentationRaw ?? "").trim().toLowerCase();
  const visibility = (formVisibility ?? "").trim().toLowerCase();

  // Non-public presentations always win — never fan out match notifications as public.
  if (PRIVATE_VISIBILITY_PRESENTATIONS.has(presentation) || presentation === "unlisted") {
    return presentation === "private_link" && visibility === "private" ? "private" : "unlisted";
  }

  if (visibility === "public" || presentation === "public_listing") return "public";
  if (
    visibility === "unlisted" ||
    visibility === "invite_only" ||
    visibility === "private_link"
  ) {
    // Invite-only / link castings still need talent detail access via role + public API.
    return "unlisted";
  }
  if (visibility === "private") return "private";
  return visibility || "public";
}

/** True only for public open calls eligible for casting_match fan-out. */
export function isPublicOpenCallForMatchNotify(form: {
  visibility?: string | null;
  configuration?: { visibility_presentation_raw?: string | null } | null;
}): boolean {
  const presentation = (form.configuration?.visibility_presentation_raw ?? "").trim().toLowerCase();
  const visibility = (form.visibility ?? "").trim().toLowerCase();

  if (PRIVATE_VISIBILITY_PRESENTATIONS.has(presentation)) return false;
  if (visibility === "private" || visibility === "unlisted" || visibility === "invite_only") {
    return false;
  }

  return mapProjectVisibilityColumn(visibility, presentation) === "public";
}

export function buildProjectColumnsFromComposer(form: ParsedCastingComposerForm): Record<string, unknown> {
  const meta = readComposerMeta(form.configuration);
  const config = form.configuration;

  const venue = config.location_venue?.trim();
  const cityRegion = [config.location_city, config.location_region].filter(Boolean).join(", ");
  const location =
    (venue && cityRegion ? `${venue} — ${cityRegion}` : null) ||
    form.location?.trim() ||
    cityRegion ||
    venue ||
    null;

  const rateType = meta.rate_type ?? form.rateType ?? "tbd";
  const rateDetails = cleanRateDetails(
    (meta.rate_details as Record<string, unknown> | undefined) ??
      (form.rateDetails as Record<string, unknown> | undefined),
  );

  return {
    title: form.title.trim() || "Untitled casting",
    description: form.description?.trim() || null,
    location,
    rate_type: rateType,
    rate_details: rateDetails,
    is_union: meta.is_union ?? form.isUnion ?? false,
    cover_image_url: form.coverImageUrl?.trim() || null,
    cover_thumbnail_alignment: form.coverThumbnailAlignment ?? "top",
    start_date: meta.start_date ?? (form.startDate?.trim() || null),
    end_date: meta.end_date ?? (form.endDate?.trim() || null),
    production_company: form.productionCompany?.trim() || null,
    production_company_logo_url: form.productionCompanyLogoUrl?.trim() || null,
    visibility: mapProjectVisibilityColumn(form.visibility, config.visibility_presentation_raw),
    is_active: !config.composer_draft,
  };
}
