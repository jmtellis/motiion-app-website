import type {
  CastingAuditionSessionCodable,
  CastingCodableDateRange,
  CastingComposerForm,
  CastingConfiguration,
  CastingScheduleCategoryCodable,
} from "@/types/casting";

/** Matches iOS `ScheduleActivityType.castingComposerScheduleTypes` raw values. */
export const PRODUCTION_SCHEDULE_ACTIVITY_OPTIONS = [
  { value: "Travel Day", label: "Travel day" },
  { value: "Rehearsal", label: "Rehearsal" },
  { value: "Shoot or Show Day", label: "Show / shoot day" },
  { value: "Fitting", label: "Fitting" },
  { value: "Custom", label: "Other" },
] as const;

export type ProductionScheduleActivityType =
  (typeof PRODUCTION_SCHEDULE_ACTIVITY_OPTIONS)[number]["value"];

export type ProductionScheduleCategoryDraft = {
  id_key: string;
  activity_type_raw: ProductionScheduleActivityType | string;
  custom_schedule_title: string;
  selected_days_iso: string[];
};

export function isoDateToYyyymmdd(value: string): string {
  return value.replaceAll("-", "").slice(0, 8);
}

export function yyyymmddToIsoDate(value: string): string {
  if (value.includes("-")) return value.slice(0, 10);
  if (value.length !== 8) return value;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export function sortIsoDates(dates: string[]): string[] {
  return [...new Set(dates.filter(Boolean))].sort();
}

export function expandInclusiveDateRange(startIso: string, endIso?: string | null): string[] {
  const start = startIso.includes("-") ? startIso : yyyymmddToIsoDate(startIso);
  const endRaw = endIso ? (endIso.includes("-") ? endIso : yyyymmddToIsoDate(endIso)) : start;
  if (!start) return [];

  const cursor = new Date(`${start}T12:00:00`);
  const end = new Date(`${endRaw}T12:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return start ? [start] : [];

  const dates: string[] = [];
  while (cursor.getTime() <= end.getTime() && dates.length < 366) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function productionDatesToRanges(isoDates: string[]): CastingCodableDateRange[] {
  return sortIsoDates(isoDates).map((iso) => ({
    start_yyyymmdd: isoDateToYyyymmdd(iso),
    end_yyyymmdd: isoDateToYyyymmdd(iso),
  }));
}

export function productionScheduleLabel(category: {
  activity_type_raw: string;
  custom_schedule_title?: string | null;
}): string {
  if (category.activity_type_raw === "Custom") {
    return category.custom_schedule_title?.trim() || "Other";
  }
  return (
    PRODUCTION_SCHEDULE_ACTIVITY_OPTIONS.find((option) => option.value === category.activity_type_raw)
      ?.label ?? category.activity_type_raw
  );
}

function categoryDaysToIso(category: CastingScheduleCategoryCodable): string[] {
  return sortIsoDates((category.selected_days_yyyymmdd ?? []).map(yyyymmddToIsoDate));
}

export function getScheduleCategoryDrafts(form: CastingComposerForm): ProductionScheduleCategoryDraft[] {
  const categories = form.configuration.schedule_categories ?? [];
  if (categories.length) {
    return categories.map((category) => ({
      id_key: category.id_key || crypto.randomUUID(),
      activity_type_raw: category.activity_type_raw || "Shoot or Show Day",
      custom_schedule_title: category.custom_schedule_title?.trim() || "",
      selected_days_iso: categoryDaysToIso(category),
    }));
  }

  // Legacy untyped production days → Shoot or Show Day bucket.
  const legacyDates = (() => {
    const fromList = (form.configuration.production_dates_yyyymmdd ?? []).map(yyyymmddToIsoDate);
    if (fromList.length) return sortIsoDates(fromList);
    const fromRanges = (form.configuration.production_date_ranges ?? []).flatMap((range) =>
      expandInclusiveDateRange(range.start_yyyymmdd, range.end_yyyymmdd),
    );
    if (fromRanges.length) return sortIsoDates(fromRanges);
    return sortIsoDates([form.startDate, form.endDate].filter(Boolean));
  })();

  if (!legacyDates.length) return [];

  return [
    {
      id_key: crypto.randomUUID(),
      activity_type_raw: "Shoot or Show Day",
      custom_schedule_title: "",
      selected_days_iso: legacyDates,
    },
  ];
}

export function collectProductionIsoDatesFromCategories(
  categories: ProductionScheduleCategoryDraft[],
): string[] {
  return sortIsoDates(categories.flatMap((category) => category.selected_days_iso));
}

export function getProductionIsoDates(form: CastingComposerForm): string[] {
  const categories = form.configuration.schedule_categories ?? [];
  if (categories.length) {
    return sortIsoDates(categories.flatMap((category) => categoryDaysToIso(category)));
  }

  const fromList = (form.configuration.production_dates_yyyymmdd ?? []).map(yyyymmddToIsoDate);
  if (fromList.length) return sortIsoDates(fromList);

  const fromRanges = (form.configuration.production_date_ranges ?? []).flatMap((range) =>
    expandInclusiveDateRange(range.start_yyyymmdd, range.end_yyyymmdd),
  );
  if (fromRanges.length) return sortIsoDates(fromRanges);

  return sortIsoDates([form.startDate, form.endDate].filter(Boolean));
}

export function createEmptyAuditionSession(
  overrides: Partial<CastingAuditionSessionCodable> = {},
): CastingAuditionSessionCodable {
  return {
    id_key: crypto.randomUUID(),
    title: "",
    datetime_iso8601: "",
    has_callback: false,
    callback_datetime_iso8601: null,
    location_mode_raw: "in_person",
    remote_url: null,
    location_label: null,
    location_city: null,
    location_region: null,
    location_notes: null,
    location_same_as_production: false,
    ...overrides,
  };
}

export function resolveAuditionLocation(
  session: CastingAuditionSessionCodable,
  form: CastingComposerForm,
): {
  mode: "in_person" | "remote";
  label: string | null;
  city: string | null;
  region: string | null;
  notes: string | null;
  remoteUrl: string | null;
} {
  const mode = session.location_mode_raw === "remote" ? "remote" : "in_person";
  if (mode === "remote") {
    return {
      mode,
      label: null,
      city: null,
      region: null,
      notes: null,
      remoteUrl: session.remote_url?.trim() || null,
    };
  }

  if (session.location_same_as_production) {
    return {
      mode,
      label: form.location.trim() || null,
      city: form.configuration.location_city?.trim() || null,
      region: form.configuration.location_region?.trim() || null,
      notes: form.configuration.location_notes?.trim() || null,
      remoteUrl: null,
    };
  }

  return {
    mode,
    label: session.location_label?.trim() || null,
    city: session.location_city?.trim() || null,
    region: session.location_region?.trim() || null,
    notes: session.location_notes?.trim() || null,
    remoteUrl: null,
  };
}

export function getAuditionSessions(form: CastingComposerForm): CastingAuditionSessionCodable[] {
  const sessions = form.configuration.audition_sessions ?? [];
  if (sessions.length) return sessions;

  if (form.configuration.audition_date_iso8601) {
    return [
      createEmptyAuditionSession({
        title: "Audition",
        datetime_iso8601: form.configuration.audition_date_iso8601,
        has_callback: Boolean(form.configuration.callback_date_iso8601),
        callback_datetime_iso8601: form.configuration.callback_date_iso8601 ?? null,
      }),
    ];
  }

  return [];
}

function draftsToScheduleCategories(
  drafts: ProductionScheduleCategoryDraft[],
): CastingScheduleCategoryCodable[] {
  return drafts
    .map((draft) => ({
      id_key: draft.id_key,
      activity_type_raw: draft.activity_type_raw,
      custom_schedule_title:
        draft.activity_type_raw === "Custom" ? draft.custom_schedule_title.trim() || null : null,
      // Store dashed ISO dates for iOS parity (field name is historical).
      selected_days_yyyymmdd: sortIsoDates(draft.selected_days_iso),
    }))
    .filter((category) => {
      if (!category.selected_days_yyyymmdd.length) return false;
      if (category.activity_type_raw === "Custom" && !category.custom_schedule_title) return false;
      return true;
    });
}

export function buildScheduleConfigurationPatch(input: {
  productionIsoDates?: string[];
  scheduleCategoryDrafts?: ProductionScheduleCategoryDraft[];
  auditionSessions?: CastingAuditionSessionCodable[];
  submissionDeadline?: string | null;
}): Partial<CastingConfiguration> {
  const patch: Partial<CastingConfiguration> = {};

  if (input.scheduleCategoryDrafts) {
    const categories = draftsToScheduleCategories(input.scheduleCategoryDrafts);
    const allIsoDates = collectProductionIsoDatesFromCategories(input.scheduleCategoryDrafts);
    const rehearsalIso = sortIsoDates(
      input.scheduleCategoryDrafts
        .filter((draft) => draft.activity_type_raw === "Rehearsal")
        .flatMap((draft) => draft.selected_days_iso),
    );
    const shootIso = sortIsoDates(
      input.scheduleCategoryDrafts
        .filter((draft) => draft.activity_type_raw === "Shoot or Show Day")
        .flatMap((draft) => draft.selected_days_iso),
    );

    patch.schedule_categories = categories;
    patch.production_dates_yyyymmdd = allIsoDates.map(isoDateToYyyymmdd);
    patch.production_date_ranges = productionDatesToRanges(shootIso.length ? shootIso : allIsoDates);
    patch.rehearsal_date_ranges = productionDatesToRanges(rehearsalIso);
  } else if (input.productionIsoDates) {
    const sorted = sortIsoDates(input.productionIsoDates);
    patch.production_dates_yyyymmdd = sorted.map(isoDateToYyyymmdd);
    patch.production_date_ranges = productionDatesToRanges(sorted);
  }

  if (input.auditionSessions) {
    const sessions = input.auditionSessions
      .map((session) => {
        const mode = session.location_mode_raw === "remote" ? "remote" : "in_person";
        return {
          ...session,
          title: session.title.trim() || "Audition",
          datetime_iso8601: session.datetime_iso8601.trim(),
          callback_datetime_iso8601: session.has_callback
            ? session.callback_datetime_iso8601?.trim() || null
            : null,
          location_mode_raw: mode,
          remote_url: mode === "remote" ? session.remote_url?.trim() || null : null,
          location_same_as_production: false,
          location_label: mode === "in_person" ? session.location_label?.trim() || null : null,
          location_city: mode === "in_person" ? session.location_city?.trim() || null : null,
          location_region: mode === "in_person" ? session.location_region?.trim() || null : null,
          location_notes: mode === "in_person" ? session.location_notes?.trim() || null : null,
        };
      })
      .filter((session) => session.datetime_iso8601);

    patch.audition_sessions = sessions;
    patch.audition_date_iso8601 = sessions[0]?.datetime_iso8601 ?? null;
    patch.callback_date_iso8601 =
      sessions.find((session) => session.has_callback && session.callback_datetime_iso8601)
        ?.callback_datetime_iso8601 ?? null;
  }

  if (input.submissionDeadline !== undefined) {
    patch.submission_deadline_iso8601 = input.submissionDeadline;
  }

  return patch;
}

export function productionBoundsFromIsoDates(isoDates: string[]): {
  startDate: string;
  endDate: string;
} {
  const sorted = sortIsoDates(isoDates);
  return {
    startDate: sorted[0] ?? "",
    endDate: sorted[sorted.length - 1] ?? "",
  };
}
