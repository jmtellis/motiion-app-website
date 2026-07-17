"use client";

import { useMemo } from "react";

import { AuthField, AuthInput } from "@/components/auth/ui";
import {
  LocationAutocomplete,
  type SelectedPlace,
} from "@/components/talent-buyers/project/LocationAutocomplete";
import {
  getAuditionSessions,
  getScheduleCategoryDrafts,
  productionScheduleLabel,
  sortIsoDates,
  yyyymmddToIsoDate,
  isoDateToYyyymmdd,
} from "@/lib/talent-buyers/casting/casting-schedule";
import type {
  CastingAuditionSessionCodable,
  CastingComposerForm,
  CastingProductionDayLocationCodable,
  CastingScheduleLocationGroupCodable,
} from "@/types/casting";

import { PrefillBadge, CastingWizardChoiceCheck, castingWizardPill } from "./casting-wizard-shared";

import "../../project/project-create.css";
import "../../project/casting-create-wizard.css";

const AUDITION_MODE_OPTIONS = [
  { value: "in_person", label: "In person" },
  { value: "remote", label: "Remote" },
] as const;

const CATEGORY_ORDER = [
  "Travel Day",
  "Rehearsal",
  "Fitting",
  "Shoot or Show Day",
  "Custom",
] as const;

function formatDayLabel(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function emptyDayLocation(isoDate: string): CastingProductionDayLocationCodable {
  return { date_yyyymmdd: isoDateToYyyymmdd(isoDate), location_label: null };
}

function placeFields(place: SelectedPlace) {
  return {
    location_label: place.displayLabel,
    location_venue: place.name || null,
    location_city: place.city,
    location_region: place.region,
    location_country: place.country,
    location_address: place.address,
  };
}

function defaultScopeForActivity(activityType: string): "single" | "none" {
  return activityType === "Travel Day" ? "none" : "single";
}

function resolveGroup(
  categoryId: string,
  activityType: string,
  groups: CastingScheduleLocationGroupCodable[],
): CastingScheduleLocationGroupCodable {
  const existing = groups.find((group) => group.category_id_key === categoryId);
  if (existing) {
    return {
      ...existing,
      day_locations: existing.day_locations ?? [],
      location_scope_raw: existing.location_scope_raw ?? defaultScopeForActivity(activityType),
    };
  }
  return {
    category_id_key: categoryId,
    location_scope_raw: defaultScopeForActivity(activityType),
    location_label: null,
    location_venue: null,
    location_city: null,
    location_region: null,
    location_country: null,
    location_address: null,
    day_locations: [],
  };
}

function flattenDayLocations(groups: CastingScheduleLocationGroupCodable[]) {
  const map = new Map<string, CastingProductionDayLocationCodable>();
  for (const group of groups) {
    const scope = group.location_scope_raw ?? "single";
    if (scope === "none") continue;
    if (scope === "per_day") {
      for (const day of group.day_locations ?? []) {
        map.set(day.date_yyyymmdd, day);
      }
      continue;
    }
    // Propagate shared location onto each known day slot when present.
    for (const day of group.day_locations ?? []) {
      map.set(day.date_yyyymmdd, {
        ...day,
        location_label: group.location_label ?? day.location_label,
        location_venue: group.location_venue ?? day.location_venue,
        location_city: group.location_city ?? day.location_city,
        location_region: group.location_region ?? day.location_region,
        location_country: group.location_country ?? day.location_country,
        location_address: group.location_address ?? day.location_address,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.date_yyyymmdd.localeCompare(b.date_yyyymmdd));
}

function primaryLocationFromGroups(groups: CastingScheduleLocationGroupCodable[]) {
  const preferred = groups.find(
    (group) =>
      group.location_scope_raw !== "none" &&
      (group.location_label?.trim() ||
        group.day_locations?.some((day) => day.location_label?.trim())),
  );
  if (!preferred) return null;
  if (preferred.location_label?.trim()) {
    return {
      label: preferred.location_label,
      venue: preferred.location_venue ?? null,
      city: preferred.location_city ?? null,
      region: preferred.location_region ?? null,
      country: preferred.location_country ?? null,
      address: preferred.location_address ?? null,
    };
  }
  const day = preferred.day_locations?.find((entry) => entry.location_label?.trim());
  if (!day) return null;
  return {
    label: day.location_label ?? "",
    venue: day.location_venue ?? null,
    city: day.location_city ?? null,
    region: day.location_region ?? null,
    country: day.location_country ?? null,
    address: day.location_address ?? null,
  };
}

function updateAuditionSession(
  form: CastingComposerForm,
  sessionId: string,
  patch: Partial<CastingAuditionSessionCodable>,
  updateConfiguration: (patch: Partial<CastingComposerForm["configuration"]>) => void,
) {
  const sessions = getAuditionSessions(form).map((session) =>
    session.id_key === sessionId ? { ...session, ...patch } : session,
  );
  updateConfiguration({ audition_sessions: sessions });
}

function upsertGroups(
  current: CastingScheduleLocationGroupCodable[],
  nextGroup: CastingScheduleLocationGroupCodable,
) {
  const without = current.filter((group) => group.category_id_key !== nextGroup.category_id_key);
  return [...without, nextGroup];
}

export function CastingWhereStep({
  form,
  onFormChange,
  updateConfiguration,
  showPrefillBadge,
}: {
  form: CastingComposerForm;
  onFormChange: (form: CastingComposerForm) => void;
  updateConfiguration: (patch: Partial<CastingComposerForm["configuration"]>) => void;
  showPrefillBadge?: boolean;
}) {
  const scheduleCategories = useMemo(() => {
    const drafts = getScheduleCategoryDrafts(form).filter((draft) => draft.selected_days_iso.length);
    return [...drafts].sort((a, b) => {
      const aIndex = CATEGORY_ORDER.indexOf(a.activity_type_raw as (typeof CATEGORY_ORDER)[number]);
      const bIndex = CATEGORY_ORDER.indexOf(b.activity_type_raw as (typeof CATEGORY_ORDER)[number]);
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
  }, [form]);

  const auditionSessions = getAuditionSessions(form).filter((session) => session.datetime_iso8601);
  const storedGroups = form.configuration.schedule_location_groups ?? [];

  function commitGroups(nextGroups: CastingScheduleLocationGroupCodable[]) {
    const primary = primaryLocationFromGroups(nextGroups);
    onFormChange({
      ...form,
      location: primary?.label || form.location,
      configuration: {
        ...form.configuration,
        schedule_location_groups: nextGroups,
        production_day_locations: flattenDayLocations(nextGroups),
        production_location_scope_raw: nextGroups.some(
          (group) => group.location_scope_raw === "per_day",
        )
          ? "per_day"
          : "single",
        location_venue: primary?.venue ?? form.configuration.location_venue,
        location_city: primary?.city ?? form.configuration.location_city,
        location_region: primary?.region ?? form.configuration.location_region,
        location_country: primary?.country ?? form.configuration.location_country,
        location_address: primary?.address ?? form.configuration.location_address,
      },
    });
  }

  function patchGroup(
    categoryId: string,
    activityType: string,
    daysIso: string[],
    patch: Partial<CastingScheduleLocationGroupCodable>,
  ) {
    const current = resolveGroup(categoryId, activityType, storedGroups);
    const next: CastingScheduleLocationGroupCodable = {
      ...current,
      ...patch,
      category_id_key: categoryId,
      day_locations: patch.day_locations ?? current.day_locations,
    };

    // Keep day slots aligned with schedule days when expanding per-day.
    if (next.location_scope_raw === "per_day") {
      const byDate = new Map(
        (next.day_locations ?? []).map((entry) => [yyyymmddToIsoDate(entry.date_yyyymmdd), entry]),
      );
      next.day_locations = sortIsoDates(daysIso).map((iso) => {
        const existing = byDate.get(iso);
        if (existing) return existing;
        return {
          ...emptyDayLocation(iso),
          location_label: next.location_label,
          location_venue: next.location_venue,
          location_city: next.location_city,
          location_region: next.location_region,
          location_country: next.location_country,
          location_address: next.location_address,
        };
      });
    }

    commitGroups(upsertGroups(storedGroups, next));
  }

  const hasAnyContainers = scheduleCategories.length > 0 || auditionSessions.length > 0;

  return (
    <div className="space-y-5">
      {showPrefillBadge ? <PrefillBadge /> : null}

      {!hasAnyContainers ? (
        <p className="text-sm text-[var(--ink-soft)]">
          Add production day types or auditions in Schedule first, then set locations here.
        </p>
      ) : null}

      {scheduleCategories.map((category) => {
        const group = resolveGroup(category.id_key, category.activity_type_raw, storedGroups);
        const scope = group.location_scope_raw ?? defaultScopeForActivity(category.activity_type_raw);
        const isTravel = category.activity_type_raw === "Travel Day";
        const title = productionScheduleLabel(category);
        const dayCount = category.selected_days_iso.length;
        const showDifferentToggle = !isTravel && dayCount > 1 && scope !== "none";
        const travelEnabled = isTravel && scope !== "none";
        const dayLocationsByIso = new Map(
          (group.day_locations ?? []).map((entry) => [
            yyyymmddToIsoDate(entry.date_yyyymmdd),
            entry,
          ]),
        );

        return (
          <section key={category.id_key} className="casting-where-category">
            <div className="casting-where-category__header">
              <div>
                <h3 className="casting-where-category__title">{title}</h3>
                <p className="casting-where-category__meta">
                  {dayCount} {dayCount === 1 ? "day" : "days"}
                  {isTravel ? " · optional destination" : ""}
                </p>
              </div>
            </div>

            {isTravel ? (
              <label className="casting-where-category__toggle">
                <input
                  type="checkbox"
                  checked={travelEnabled}
                  onChange={(event) =>
                    patchGroup(category.id_key, category.activity_type_raw, category.selected_days_iso, {
                      location_scope_raw: event.target.checked
                        ? dayCount > 1
                          ? "single"
                          : "single"
                        : "none",
                      ...(event.target.checked
                        ? {}
                        : {
                            location_label: null,
                            location_venue: null,
                            location_city: null,
                            location_region: null,
                            location_country: null,
                            location_address: null,
                            day_locations: [],
                          }),
                    })
                  }
                />
                <span>Add a travel destination</span>
              </label>
            ) : null}

            {!isTravel || travelEnabled ? (
              <>
                {showDifferentToggle ? (
                  <AuthField label="Location for these days">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={castingWizardPill(scope === "single")}
                        aria-pressed={scope === "single"}
                        onClick={() =>
                          patchGroup(
                            category.id_key,
                            category.activity_type_raw,
                            category.selected_days_iso,
                            {
                              location_scope_raw: "single",
                              day_locations: [],
                            },
                          )
                        }
                      >
                        <span>Same location for all</span>
                        <CastingWizardChoiceCheck selected={scope === "single"} />
                      </button>
                      <button
                        type="button"
                        className={castingWizardPill(scope === "per_day")}
                        aria-pressed={scope === "per_day"}
                        onClick={() =>
                          patchGroup(
                            category.id_key,
                            category.activity_type_raw,
                            category.selected_days_iso,
                            { location_scope_raw: "per_day" },
                          )
                        }
                      >
                        <span>Some days have different locations</span>
                        <CastingWizardChoiceCheck selected={scope === "per_day"} />
                      </button>
                    </div>
                  </AuthField>
                ) : null}

                {isTravel && travelEnabled && dayCount > 1 ? (
                  <label className="casting-where-category__toggle">
                    <input
                      type="checkbox"
                      checked={scope === "per_day"}
                      onChange={(event) =>
                        patchGroup(
                          category.id_key,
                          category.activity_type_raw,
                          category.selected_days_iso,
                          {
                            location_scope_raw: event.target.checked ? "per_day" : "single",
                            ...(event.target.checked ? {} : { day_locations: [] }),
                          },
                        )
                      }
                    />
                    <span>Different destinations on some travel days</span>
                  </label>
                ) : null}

                {scope !== "per_day" ? (
                  <LocationAutocomplete
                    label={isTravel ? "Travel destination" : "Establishment / venue"}
                    mode="establishments"
                    value={group.location_label ?? ""}
                    placeholder={
                      isTravel
                        ? "Search for a hotel, city, or destination"
                        : "Search for a studio, stage, or venue"
                    }
                    onChange={(value) =>
                      patchGroup(
                        category.id_key,
                        category.activity_type_raw,
                        category.selected_days_iso,
                        { location_label: value },
                      )
                    }
                    onPlaceSelect={(place) =>
                      patchGroup(
                        category.id_key,
                        category.activity_type_raw,
                        category.selected_days_iso,
                        placeFields(place),
                      )
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--ink-soft)]">
                      Set a location for each {title.toLowerCase()} day.
                    </p>
                    {category.selected_days_iso.map((isoDate) => {
                      const entry = dayLocationsByIso.get(isoDate);
                      return (
                        <div key={isoDate} className="casting-where-audition-location">
                          <div className="casting-where-audition-location__header">
                            <h4 className="casting-where-audition-location__title">
                              {formatDayLabel(isoDate)}
                            </h4>
                          </div>
                          <LocationAutocomplete
                            label="Location"
                            mode="establishments"
                            value={entry?.location_label ?? ""}
                            placeholder="Search for a venue"
                            onChange={(value) => {
                              const currentDays = group.day_locations ?? [];
                              const without = currentDays.filter(
                                (day) => yyyymmddToIsoDate(day.date_yyyymmdd) !== isoDate,
                              );
                              patchGroup(
                                category.id_key,
                                category.activity_type_raw,
                                category.selected_days_iso,
                                {
                                  location_scope_raw: "per_day",
                                  day_locations: [
                                    ...without,
                                    { ...(entry ?? emptyDayLocation(isoDate)), location_label: value },
                                  ].sort((a, b) => a.date_yyyymmdd.localeCompare(b.date_yyyymmdd)),
                                },
                              );
                            }}
                            onPlaceSelect={(place) => {
                              const yyyymmdd = isoDateToYyyymmdd(isoDate);
                              const currentDays = group.day_locations ?? [];
                              const without = currentDays.filter(
                                (day) => yyyymmddToIsoDate(day.date_yyyymmdd) !== isoDate,
                              );
                              patchGroup(
                                category.id_key,
                                category.activity_type_raw,
                                category.selected_days_iso,
                                {
                                  location_scope_raw: "per_day",
                                  day_locations: [
                                    ...without,
                                    { date_yyyymmdd: yyyymmdd, ...placeFields(place) },
                                  ].sort((a, b) => a.date_yyyymmdd.localeCompare(b.date_yyyymmdd)),
                                },
                              );
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-[var(--ink-soft)]">
                No destination required. Turn on travel destination if talent is going to a hotel or
                specific place.
              </p>
            )}
          </section>
        );
      })}

      {auditionSessions.map((session) => {
        const mode = session.location_mode_raw === "remote" ? "remote" : "in_person";
        return (
          <section key={session.id_key} className="casting-where-category">
            <div className="casting-where-category__header">
              <div>
                <h3 className="casting-where-category__title">
                  {session.title.trim() || "Audition"}
                </h3>
                <p className="casting-where-category__meta">Audition</p>
              </div>
            </div>

            <AuthField label="Location mode">
              <div className="flex flex-wrap gap-2">
                {AUDITION_MODE_OPTIONS.map((option) => {
                  const selected = mode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={castingWizardPill(selected)}
                      aria-pressed={selected}
                      onClick={() =>
                        updateAuditionSession(
                          form,
                          session.id_key,
                          {
                            location_mode_raw: option.value,
                            ...(option.value === "remote"
                              ? {
                                  location_label: null,
                                  location_city: null,
                                  location_region: null,
                                  location_notes: null,
                                }
                              : { remote_url: null }),
                          },
                          updateConfiguration,
                        )
                      }
                    >
                      <span>{option.label}</span>
                      <CastingWizardChoiceCheck selected={selected} />
                    </button>
                  );
                })}
              </div>
            </AuthField>

            {mode === "remote" ? (
              <AuthField label="Audition link">
                <AuthInput
                  type="url"
                  value={session.remote_url ?? ""}
                  onChange={(event) =>
                    updateAuditionSession(
                      form,
                      session.id_key,
                      { remote_url: event.target.value },
                      updateConfiguration,
                    )
                  }
                  placeholder="https://zoom.us/j/..."
                />
              </AuthField>
            ) : (
              <LocationAutocomplete
                label="Establishment / venue"
                mode="establishments"
                value={session.location_label ?? ""}
                placeholder="Search for an audition location"
                onChange={(value) =>
                  updateAuditionSession(
                    form,
                    session.id_key,
                    { location_label: value },
                    updateConfiguration,
                  )
                }
                onPlaceSelect={(place) =>
                  updateAuditionSession(
                    form,
                    session.id_key,
                    {
                      location_label: place.displayLabel,
                      location_city: place.city,
                      location_region: place.region,
                      location_notes: place.formattedAddress,
                    },
                    updateConfiguration,
                  )
                }
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
