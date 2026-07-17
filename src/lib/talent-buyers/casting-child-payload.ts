import { digestCastingPassword } from "@/lib/talent-buyers/casting-password";
import {
  mapProjectVisibilityColumn,
  normalizeDeadlineToIso8601,
} from "@/lib/talent-buyers/casting/casting-configuration-mobile";
import {
  buildRolePublicationSnapshot,
  parseHeightToCm,
  roleSpecialSkillsForMatching,
  type RoleClientMatchFilters,
} from "@/lib/talent-buyers/casting/role-publication-snapshot";
import type { ParsedCastingComposerForm } from "@/lib/talent-buyers/casting-schema";
import type { CastingComposerForm, CastingConfiguration, CastingRoleForm } from "@/types/casting";
import type { CardColorPreset } from "@/types/casting";

export type ChildCastingRecord = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  visibility: string | null;
  password_hash: string | null;
  configuration: CastingConfiguration | null;
  submission_deadline: string | null;
  status: string;
  created_at: string | null;
  updated_at?: string | null;
};

export type ChildCastingRoleRecord = {
  id: string;
  casting_id: string;
  title: string;
  description: string | null;
  age_min: number | null;
  age_max: number | null;
  gender: string | null;
  ethnicity_preferences: string[] | null;
  special_skills: string[] | null;
  height_min_cm: number | null;
  height_max_cm: number | null;
  union_status: string | null;
  people_needed: number;
  match_filters: Record<string, unknown> | null;
};

type ComposerMeta = {
  rate_type: string;
  rate_details: Record<string, unknown>;
  is_union: boolean;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
};

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

function castingPasswordHash(form: ParsedCastingComposerForm) {
  if (form.visibility !== "private") return null;
  const trimmed = form.password.trim();
  return trimmed ? digestCastingPassword(trimmed) : null;
}

function rolePasswordHash(role: CastingRoleForm) {
  if (role.visibility !== "private") return null;
  const trimmed = role.password.trim();
  return trimmed ? digestCastingPassword(trimmed) : null;
}

function buildComposerMeta(form: ParsedCastingComposerForm): ComposerMeta {
  return {
    rate_type: form.rateType,
    rate_details: form.rateDetails,
    is_union: form.isUnion ?? false,
    location: nullableTrim(form.location),
    start_date: nullableTrim(form.startDate),
    end_date: nullableTrim(form.endDate),
  };
}

function readComposerMeta(configuration: CastingConfiguration | null | undefined): ComposerMeta {
  const meta = (configuration as CastingConfiguration & { _composer_meta?: ComposerMeta })?._composer_meta;
  return {
    rate_type: meta?.rate_type ?? "fixed",
    rate_details: meta?.rate_details ?? {},
    is_union: meta?.is_union ?? false,
    location: meta?.location ?? null,
    start_date: meta?.start_date ?? null,
    end_date: meta?.end_date ?? null,
  };
}

export function buildChildCastingRow(projectId: string, form: ParsedCastingComposerForm, isDraft: boolean) {
  const deadline = normalizeDeadlineToIso8601(form.configuration.submission_deadline_iso8601);
  const configuration = {
    ...form.configuration,
    submission_deadline_iso8601: deadline,
    composer_draft: isDraft,
    _composer_meta: buildComposerMeta(form),
  };

  return {
    project_id: projectId,
    title: form.title.trim() || "Untitled casting",
    description: nullableTrim(form.description),
    visibility: form.visibility ?? "public",
    password_hash: castingPasswordHash(form),
    configuration,
    submission_deadline: deadline,
    status: isDraft ? "draft" : "open",
  };
}

export function buildChildCastingRoleRow(
  castingId: string,
  role: CastingRoleForm,
  snapshot?: RoleClientMatchFilters,
) {
  return {
    casting_id: castingId,
    title: role.title.trim(),
    description: nullableTrim(role.description),
    age_min: parseOptionalInt(role.ageRangeMin),
    age_max: parseOptionalInt(role.ageRangeMax),
    gender: nullableTrim(role.gender),
    ethnicity_preferences: role.ethnicityPreferences,
    special_skills: role.specialSkills.length ? role.specialSkills : null,
    height_min_cm: parseHeightToCm(role.heightMin),
    height_max_cm: parseHeightToCm(role.heightMax),
    union_status: nullableTrim(role.unionStatus),
    people_needed: parseOptionalInt(role.peopleNeeded) ?? 1,
    match_filters: snapshot ?? role.clientMatchFilters,
  };
}

export function buildBridgedRoleRow(
  posterId: string,
  projectId: string,
  castingId: string,
  form: ParsedCastingComposerForm,
  role: CastingRoleForm,
  isDraft: boolean,
  snapshot?: RoleClientMatchFilters,
) {
  const publicationSnapshot = snapshot ?? buildRolePublicationSnapshot(role, form);
  const specialSkills = roleSpecialSkillsForMatching(role, publicationSnapshot);

  return {
    poster_id: posterId,
    project_id: projectId,
    casting_id: castingId,
    title: role.title.trim(),
    production: form.title.trim() || "Untitled casting",
    description: nullableTrim(role.description),
    age_range_min: parseOptionalInt(role.ageRangeMin),
    age_range_max: parseOptionalInt(role.ageRangeMax),
    gender: nullableTrim(role.gender),
    ethnicity_preferences: role.ethnicityPreferences.length ? role.ethnicityPreferences : null,
    special_skills: specialSkills.length ? specialSkills : null,
    card_color_preset: role.cardColorPreset,
    cover_image_url: nullableTrim(role.coverImageUrl) ?? nullableTrim(form.coverImageUrl),
    // Casting-level privacy always wins so private/invite posts never bridge as public roles.
    visibility: mapProjectVisibilityColumn(
      form.visibility,
      form.configuration.visibility_presentation_raw,
    ),
    password_hash: rolePasswordHash(role),
    height_min: nullableTrim(role.heightMin),
    height_max: nullableTrim(role.heightMax),
    agency_required: role.agencyRequired,
    union_status: nullableTrim(role.unionStatus),
    people_needed: parseOptionalInt(role.peopleNeeded) ?? 1,
    client_match_filters: publicationSnapshot,
    is_active: !isDraft,
  };
}

export type ChildCastingProjectContext = {
  title?: string | null;
  description?: string | null;
  production_company?: string | null;
  production_company_logo_url?: string | null;
  cover_image_url?: string | null;
  cover_thumbnail_alignment?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  rate_type?: string | null;
  rate_details?: Record<string, unknown> | null;
  casting_configuration?: CastingConfiguration | null;
};

export function childCastingToComposerForm(
  casting: ChildCastingRecord,
  roles: ChildCastingRoleRecord[],
  projectId: string,
  bridgedRoles: Array<{
    id?: string;
    title: string;
    visibility?: string | null;
    password_hash?: string | null;
    card_color_preset?: string | null;
    cover_image_url?: string | null;
    agency_required?: boolean | null;
    height_min?: string | null;
    height_max?: string | null;
  }> = [],
  project?: ChildCastingProjectContext | null,
): CastingComposerForm {
  const bridgedByTitle = new Map(bridgedRoles.map((role) => [role.title, role]));
  const configuration = casting.configuration ?? ({} as CastingConfiguration);
  const meta = readComposerMeta(configuration);
  const { _composer_meta: _, ...cleanConfiguration } = configuration as CastingConfiguration & {
    _composer_meta?: ComposerMeta;
  };

  const projectConfig = project?.casting_configuration;
  const castingAttachments = cleanConfiguration.attachments ?? [];
  const projectAttachments = projectConfig?.attachments ?? [];
  const attachments = castingAttachments.length ? castingAttachments : projectAttachments;

  return {
    projectId,
    castingId: casting.id,
    title: casting.title ?? project?.title ?? "",
    description: casting.description ?? project?.description ?? "",
    productionCompany: project?.production_company ?? "",
    productionCompanyLogoUrl: project?.production_company_logo_url ?? "",
    rateType: (meta.rate_type || project?.rate_type || "fixed") as CastingComposerForm["rateType"],
    rateDetails: Object.keys(meta.rate_details ?? {}).length
      ? meta.rate_details
      : (project?.rate_details ?? {}),
    isUnion: meta.is_union,
    visibility: (casting.visibility as CastingComposerForm["visibility"]) ?? "public",
    password: "",
    coverImageUrl: project?.cover_image_url ?? "",
    coverThumbnailAlignment:
      (project?.cover_thumbnail_alignment as CastingComposerForm["coverThumbnailAlignment"]) ?? "top",
    location: meta.location ?? project?.location ?? "",
    startDate: meta.start_date ?? project?.start_date ?? "",
    endDate: meta.end_date ?? project?.end_date ?? "",
    configuration: {
      ...cleanConfiguration,
      ...((!cleanConfiguration.submission_deadline_iso8601 && casting.submission_deadline)
        ? { submission_deadline_iso8601: casting.submission_deadline }
        : {}),
      attachments,
    },
    roles: roles.length
      ? roles.map((role) => {
          const bridged = bridgedByTitle.get(role.title);
          return {
          clientId: role.id,
          id: role.id,
          title: role.title,
          description: role.description ?? "",
          ageRangeMin: role.age_min != null ? String(role.age_min) : "",
          ageRangeMax: role.age_max != null ? String(role.age_max) : "",
          gender: role.gender ?? "",
          ethnicityPreferences: role.ethnicity_preferences ?? [],
          specialSkills: role.special_skills ?? [],
          heightMin: bridged?.height_min ?? (role.height_min_cm != null ? String(role.height_min_cm) : ""),
          heightMax: bridged?.height_max ?? (role.height_max_cm != null ? String(role.height_max_cm) : ""),
          agencyRequired: bridged?.agency_required ?? false,
          unionStatus: role.union_status ?? "",
          peopleNeeded: String(role.people_needed ?? 1),
          visibility: (bridged?.visibility as CastingComposerForm["roles"][0]["visibility"]) ?? "public",
          password: "",
          cardColorPreset: (bridged?.card_color_preset as CardColorPreset | undefined) ?? "midnight",
          coverImageUrl: bridged?.cover_image_url ?? "",
          clientMatchFilters: role.match_filters,
        };
        })
      : [],
  };
}
