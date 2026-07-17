import {
  CASTING_KIND_OPTIONS,
  COMPENSATION_CATEGORY_OPTIONS,
  createDefaultRole,
  LOCATION_MODE_OPTIONS,
  RATE_TYPE_OPTIONS,
  SUBMISSION_METHOD_OPTIONS,
  SUBMITTER_POLICY_OPTIONS,
} from "@/lib/talent-buyers/casting-composer-defaults";
import type { ExtractedBreakdownData } from "@/lib/talent-buyers/breakdown-types";
import type { CastingComposerForm } from "@/types/casting";
import type { ProjectComposerForm } from "@/types/project";

export type BreakdownPrefillSources = {
  sections: Set<string>;
  fields: Set<string>;
};

export type BreakdownFormsMergeResult = {
  container: ProjectComposerForm;
  casting: CastingComposerForm;
  prefillSources: BreakdownPrefillSources;
};

function isEmpty(value: string) {
  return !value.trim();
}

function pickEnum<T extends string>(value: string | null | undefined, allowed: readonly T[]): T | null {
  if (!value) return null;
  return allowed.includes(value as T) ? (value as T) : null;
}

function fillString(current: string, extracted: string | null | undefined) {
  return isEmpty(current) && extracted ? extracted : current;
}

function fillNullable(current: string | null | undefined, extracted: string | null | undefined) {
  if (current?.trim()) return current;
  return extracted?.trim() ? extracted.trim() : current ?? null;
}

function markSection(sources: BreakdownPrefillSources, section: string, field?: string) {
  sources.sections.add(section);
  if (field) sources.fields.add(field);
}

export function createEmptyPrefillSources(): BreakdownPrefillSources {
  return { sections: new Set(), fields: new Set() };
}

export function mergeBreakdownIntoForm(
  form: ProjectComposerForm,
  extracted: ExtractedBreakdownData,
): ProjectComposerForm {
  const canPrefillType = !form.projectId && isEmpty(form.title) && isEmpty(form.description);

  return {
    ...form,
    title: isEmpty(form.title) && extracted.title ? extracted.title : form.title,
    description: isEmpty(form.description) && extracted.description ? extracted.description : form.description,
    productionCompany:
      isEmpty(form.productionCompany) && extracted.productionCompany
        ? extracted.productionCompany
        : form.productionCompany,
    projectType: canPrefillType && extracted.projectType ? extracted.projectType : form.projectType,
    startDate: isEmpty(form.startDate) && extracted.startDate ? extracted.startDate : form.startDate,
    endDate: isEmpty(form.endDate) && extracted.endDate ? extracted.endDate : form.endDate,
    location: isEmpty(form.location) && extracted.location ? extracted.location : form.location,
  };
}

export function mergeBreakdownIntoCastingForms(
  containerForm: ProjectComposerForm,
  castingForm: CastingComposerForm,
  extracted: ExtractedBreakdownData,
): BreakdownFormsMergeResult {
  const prefillSources = createEmptyPrefillSources();
  const container = mergeBreakdownIntoForm(containerForm, extracted);

  if (extracted.title) markSection(prefillSources, "basics", "title");
  if (extracted.description) markSection(prefillSources, "basics", "description");
  if (extracted.productionCompany) markSection(prefillSources, "basics", "productionCompany");

  const castingKinds = (extracted.castingKinds ?? []).filter((kind) =>
    CASTING_KIND_OPTIONS.some((option) => option.value === kind),
  );
  if (castingKinds.length) markSection(prefillSources, "type_visibility", "castingKinds");

  const visibility = pickEnum(extracted.visibility, ["public", "unlisted", "private"] as const);
  if (visibility) markSection(prefillSources, "type_visibility", "visibility");

  if (extracted.startDate || extracted.endDate || extracted.submissionDeadline) {
    markSection(prefillSources, "schedule");
  }

  if (extracted.location || extracted.locationCity || extracted.locationRegion || extracted.locationCountry) {
    markSection(prefillSources, "where");
  }

  const compensationCategory = pickEnum(
    extracted.compensationCategory,
    COMPENSATION_CATEGORY_OPTIONS.map((option) => option.value),
  );
  const rateType = pickEnum(extracted.rateType, RATE_TYPE_OPTIONS.map((option) => option.value));
  if (compensationCategory || rateType || extracted.isUnion !== null || extracted.compensationNotes) {
    markSection(prefillSources, "compensation");
  }

  const submissionMethod = pickEnum(
    extracted.submissionMethod,
    SUBMISSION_METHOD_OPTIONS.map((option) => option.value),
  );
  const submitterPolicy = pickEnum(
    extracted.submitterPolicy,
    SUBMITTER_POLICY_OPTIONS.map((option) => option.value),
  );
  if (submissionMethod || submitterPolicy || (extracted.submissionMaterials?.length ?? 0) > 0) {
    markSection(prefillSources, "submission");
  }

  const locationMode = pickEnum(
    extracted.locationMode,
    LOCATION_MODE_OPTIONS.map((option) => option.value),
  );

  const extractedRoles = (extracted.roles ?? []).filter((role) => role.title?.trim());
  if (extractedRoles.length) markSection(prefillSources, "roles");

  const roles =
    extractedRoles.length > 0
      ? extractedRoles.map((role) => ({
          ...createDefaultRole(),
          title: role.title?.trim() ?? "",
          description: role.description?.trim() ?? "",
          ageRangeMin: role.ageRangeMin?.trim() ?? "",
          ageRangeMax: role.ageRangeMax?.trim() ?? "",
          gender: role.gender?.trim() ?? "",
          peopleNeeded: role.peopleNeeded?.trim() || "1",
          ethnicityPreferences: role.ethnicityPreferences ?? [],
          unionStatus: role.unionStatus?.trim() ?? "",
        }))
      : castingForm.roles;

  const title = fillString(castingForm.title, extracted.title) || container.title;
  const description = fillString(castingForm.description, extracted.description) || container.description;
  const productionCompany =
    fillString(castingForm.productionCompany, extracted.productionCompany) || container.productionCompany;

  const casting: CastingComposerForm = {
    ...castingForm,
    title,
    description,
    productionCompany,
    visibility: visibility ?? castingForm.visibility,
    location:
      fillString(castingForm.location, extracted.location) ||
      fillString(castingForm.location, extracted.locationCity),
    startDate: fillString(castingForm.startDate, extracted.startDate) || container.startDate,
    endDate: fillString(castingForm.endDate, extracted.endDate) || container.endDate,
    rateType: rateType ?? castingForm.rateType,
    isUnion: extracted.isUnion ?? castingForm.isUnion,
    roles,
    configuration: {
      ...castingForm.configuration,
      casting_kinds: (() => {
        const kind =
          castingForm.configuration.casting_kind ??
          castingForm.configuration.casting_kinds[0] ??
          castingKinds[0] ??
          null;
        return kind ? [kind] : [];
      })(),
      casting_kind:
        castingForm.configuration.casting_kind ??
        castingForm.configuration.casting_kinds[0] ??
        castingKinds[0] ??
        null,
      location_mode_raw: locationMode ?? castingForm.configuration.location_mode_raw,
      location_city: fillNullable(
        castingForm.configuration.location_city,
        extracted.locationCity ?? extracted.location,
      ),
      location_region: fillNullable(castingForm.configuration.location_region, extracted.locationRegion),
      location_country: fillNullable(castingForm.configuration.location_country, extracted.locationCountry),
      submission_deadline_iso8601: fillNullable(
        castingForm.configuration.submission_deadline_iso8601,
        extracted.submissionDeadline,
      ),
      audition_date_iso8601: fillNullable(castingForm.configuration.audition_date_iso8601, extracted.auditionDate),
      callback_date_iso8601: fillNullable(castingForm.configuration.callback_date_iso8601, extracted.callbackDate),
      production_dates_yyyymmdd:
        castingForm.configuration.production_dates_yyyymmdd?.length
          ? castingForm.configuration.production_dates_yyyymmdd
          : [extracted.startDate, extracted.endDate]
              .filter((value): value is string => Boolean(value))
              .map((value) => value.replaceAll("-", "")),
      audition_sessions:
        castingForm.configuration.audition_sessions?.length
          ? castingForm.configuration.audition_sessions
          : extracted.auditionDate
            ? [
                {
                  id_key: crypto.randomUUID(),
                  title: "Audition",
                  datetime_iso8601: extracted.auditionDate.includes("T")
                    ? extracted.auditionDate
                    : `${extracted.auditionDate}T00:00`,
                  has_callback: Boolean(extracted.callbackDate),
                  callback_datetime_iso8601: extracted.callbackDate
                    ? extracted.callbackDate.includes("T")
                      ? extracted.callbackDate
                      : `${extracted.callbackDate}T00:00`
                    : null,
                  location_mode_raw: "in_person",
                  remote_url: null,
                  location_same_as_production: true,
                  location_label: null,
                  location_city: null,
                  location_region: null,
                  location_notes: null,
                },
              ]
            : [],
      compensation_category_raw: compensationCategory ?? castingForm.configuration.compensation_category_raw,
      compensation_amount_notes: fillNullable(
        castingForm.configuration.compensation_amount_notes,
        extracted.compensationNotes,
      ),
      submission_method_raw: submissionMethod ?? castingForm.configuration.submission_method_raw,
      submission_required_material_raws:
        castingForm.configuration.submission_required_material_raws.length > 0
          ? castingForm.configuration.submission_required_material_raws
          : (extracted.submissionMaterials ?? []).filter((material) =>
              ["Headshot", "Resume", "Reel / video", "Self-tape", "Dance photos", "Availability"].includes(material),
            ),
      submitter_policy_raw: submitterPolicy ?? castingForm.configuration.submitter_policy_raw,
    },
  };

  return {
    container: {
      ...container,
      title,
      description,
      productionCompany,
    },
    casting,
    prefillSources,
  };
}
