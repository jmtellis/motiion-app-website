/**
 * Industry Schedule (MOT-95): calendar-only markers aggregated across the
 * user's projects. Each marker is a dated beat whose detail lives inside the
 * owning project or ability — Schedule never hosts boards, feeds, or create.
 *
 * Pure (no Supabase) so the marker contract is unit-testable; see
 * `schedule-markers-server.ts` for the loader.
 */

import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";
import {
  expandInclusiveDateRange,
  productionScheduleLabel,
  sortIsoDates,
  yyyymmddToIsoDate,
} from "@/lib/talent-buyers/casting/casting-schedule";
import { PROJECT_ABILITIES } from "@/lib/talent-buyers/project-abilities";
import {
  projectAbilityPath,
  projectHomePath,
  projectLandingPath,
} from "@/lib/talent-buyers/project-routes";
import type { CastingConfiguration } from "@/types/casting";

/** Dated beats per project are capped so a long tour never floods the grid. */
export const MAX_MARKERS_PER_WORK_ITEM = 200;

export type ScheduleMarker = CalendarEvent & {
  href: string;
  workId: string;
  workTitle: string;
  contextLabel: string;
  allDay: boolean;
  /** Timestamp-derived markers are re-localized on the client. */
  startsAtIso?: string;
};

export type ScheduleProjectInput = {
  id: string;
  title: string;
  composable: boolean;
  /** Normalized project type (legacy routing only). */
  projectType: string | null;
  /** Composable: Casting ability enabled. Legacy: casting-type project. */
  castingEnabled: boolean;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  castingConfiguration: Partial<CastingConfiguration> | null;
};

export type ScheduleActivityInput = {
  id: string;
  title: string;
  type: string;
  activityDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  attendeeCount: number;
  eventDays: Array<{ dayDate: string; startTime: string | null; endTime: string | null; label?: string | null }>;
  /** Owning project, when the activity was created inside one. */
  project: { id: string; title: string; composable: boolean } | null;
};

export type ScheduleJobInput = {
  id: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const NAIVE_DATETIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/;

function isoDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = value.slice(0, 10);
  return ISO_DATE.test(date) ? date : null;
}

function timeOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : null;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * Wall-clock date + time for a stored timestamp. Timezone-aware ISO values are
 * converted to the runtime's local zone; naive `YYYY-MM-DDTHH:mm` values are
 * already wall-clock; date-only values have no time.
 */
export function localDateTimeParts(value: string | null | undefined): { date: string; time: string | null } | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (ISO_DATE.test(raw)) return { date: raw, time: null };
  const naive = raw.match(NAIVE_DATETIME);
  if (naive) return { date: naive[1], time: naive[2] };
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    date: `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`,
  };
}

function projectHomeHref(project: ScheduleProjectInput) {
  return project.composable ? projectHomePath(project.id) : projectLandingPath(project.id, project.projectType);
}

function productionDays(config: Partial<CastingConfiguration>): Array<{ date: string; label: string }> {
  const categories = config.schedule_categories ?? [];
  if (categories.length) {
    return categories.flatMap((category) =>
      sortIsoDates((category.selected_days_yyyymmdd ?? []).map(yyyymmddToIsoDate)).map((date) => ({
        date,
        label: productionScheduleLabel(category),
      })),
    );
  }

  const rehearsal = sortIsoDates(
    (config.rehearsal_date_ranges ?? []).flatMap((range) =>
      expandInclusiveDateRange(range.start_yyyymmdd, range.end_yyyymmdd),
    ),
  ).map((date) => ({ date, label: "Rehearsal" }));

  const listed = (config.production_dates_yyyymmdd ?? []).map(yyyymmddToIsoDate);
  const production = sortIsoDates(
    listed.length
      ? listed
      : (config.production_date_ranges ?? []).flatMap((range) =>
          expandInclusiveDateRange(range.start_yyyymmdd, range.end_yyyymmdd),
        ),
  )
    .filter((date) => !rehearsal.some((day) => day.date === date))
    .map((date) => ({ date, label: "Show / shoot day" }));

  return [...rehearsal, ...production];
}

function auditionBeats(config: Partial<CastingConfiguration>): Array<{ at: string; label: string }> {
  const sessions = config.audition_sessions ?? [];
  if (sessions.length) {
    return sessions.flatMap((session) => {
      const title = session.title?.trim() || "Audition";
      const beats = session.datetime_iso8601?.trim() ? [{ at: session.datetime_iso8601.trim(), label: title }] : [];
      if (session.has_callback && session.callback_datetime_iso8601?.trim()) {
        beats.push({ at: session.callback_datetime_iso8601.trim(), label: `${title} callback` });
      }
      return beats;
    });
  }
  return [
    config.audition_date_iso8601?.trim() ? { at: config.audition_date_iso8601.trim(), label: "Audition" } : null,
    config.callback_date_iso8601?.trim() ? { at: config.callback_date_iso8601.trim(), label: "Callback" } : null,
  ].filter((beat): beat is { at: string; label: string } => Boolean(beat));
}

function startEndBeats(
  startDate: string | null,
  endDate: string | null,
): Array<{ date: string; label: string }> {
  const start = isoDateOnly(startDate);
  const end = isoDateOnly(endDate);
  if (start && end && start !== end) {
    return [
      { date: start, label: "Starts" },
      { date: end, label: "Wraps" },
    ];
  }
  const single = start ?? end;
  return single ? [{ date: single, label: start ? "Starts" : "Wraps" }] : [];
}

type MarkerSeed = {
  id: string;
  title: string;
  eventType: CalendarEvent["eventType"];
  date: string;
  startTime: string | null;
  endTime?: string | null;
  location?: string | null;
  attendeeCount?: number;
  href: string;
  workId: string;
  workTitle: string;
  contextLabel: string;
  startsAtIso?: string;
};

function toMarker(seed: MarkerSeed): ScheduleMarker {
  return {
    id: seed.id,
    title: seed.title,
    eventType: seed.eventType,
    date: seed.date,
    startTime: seed.startTime ?? "00:00",
    endTime: seed.startTime ? (seed.endTime ?? null) : null,
    location: seed.location?.trim() || "",
    attendeeCount: seed.attendeeCount ?? 0,
    allDay: !seed.startTime,
    href: seed.href,
    workId: seed.workId,
    workTitle: seed.workTitle,
    contextLabel: seed.contextLabel,
    ...(seed.startsAtIso ? { startsAtIso: seed.startsAtIso } : {}),
  };
}

function capped(markers: ScheduleMarker[]) {
  return markers.slice(0, MAX_MARKERS_PER_WORK_ITEM);
}

/** Rehearsal/show days, casting windows, and shell dates for one project. */
export function buildProjectScheduleMarkers(project: ScheduleProjectInput): ScheduleMarker[] {
  const title = project.title.trim() || "Untitled project";
  const homeHref = projectHomeHref(project);
  const castingHref = projectAbilityPath(project.id, "casting");
  const config = project.castingConfiguration ?? {};
  const markers: ScheduleMarker[] = [];

  const days = productionDays(config);
  const dayBeats = days.length ? days : startEndBeats(project.startDate, project.endDate);
  dayBeats.forEach((beat, index) => {
    markers.push(
      toMarker({
        id: `project:${project.id}:${beat.date}:${index}`,
        title: beat.label,
        eventType: "event",
        date: beat.date,
        startTime: null,
        location: project.location,
        href: homeHref,
        workId: project.id,
        workTitle: title,
        contextLabel: "Project",
      }),
    );
  });

  if (project.castingEnabled) {
    auditionBeats(config).forEach((beat, index) => {
      const parts = localDateTimeParts(beat.at);
      if (!parts) return;
      markers.push(
        toMarker({
          id: `casting:${project.id}:audition:${index}`,
          title: beat.label,
          eventType: "audition",
          date: parts.date,
          startTime: parts.time,
          location: project.location,
          href: castingHref,
          workId: project.id,
          workTitle: title,
          contextLabel: PROJECT_ABILITIES.casting.label,
          startsAtIso: parts.time ? beat.at : undefined,
        }),
      );
    });

    const deadline = localDateTimeParts(config.submission_deadline_iso8601);
    if (deadline) {
      markers.push(
        toMarker({
          id: `casting:${project.id}:deadline`,
          title: "Submissions close",
          eventType: "casting",
          date: deadline.date,
          startTime: null,
          href: castingHref,
          workId: project.id,
          workTitle: title,
          contextLabel: PROJECT_ABILITIES.casting.label,
          startsAtIso: deadline.time ? config.submission_deadline_iso8601 ?? undefined : undefined,
        }),
      );
    }
  }

  return capped(markers);
}

function activityEventType(type: string): CalendarEvent["eventType"] {
  return type === "class" || type === "session" ? type : "event";
}

function activityContextLabel(type: string, inComposable: boolean) {
  if (type === "class") return inComposable ? PROJECT_ABILITIES.classes.label : "Class";
  if (type === "session") return "Session";
  return "Event";
}

/**
 * Class sessions inside a composable project open its Classes ability. Other
 * activities open their own manage surface — the work item they are on Home.
 */
export function activityScheduleHref(activity: Pick<ScheduleActivityInput, "id" | "type" | "project">) {
  if (activity.project?.composable) {
    return activity.type === "class"
      ? projectAbilityPath(activity.project.id, "classes")
      : projectHomePath(activity.project.id);
  }
  return `/calendar/${activity.id}`;
}

export function buildActivityScheduleMarkers(activity: ScheduleActivityInput): ScheduleMarker[] {
  const eventType = activityEventType(activity.type);
  const title = activity.title.trim() || "Untitled activity";
  const inComposable = Boolean(activity.project?.composable);
  const workId = inComposable && activity.project ? activity.project.id : activity.id;
  const workTitle = inComposable && activity.project ? activity.project.title.trim() || "Untitled project" : title;
  const href = activityScheduleHref(activity);
  const contextLabel = activityContextLabel(activity.type, inComposable);

  const days = activity.eventDays
    .map((day) => ({ ...day, dayDate: isoDateOnly(day.dayDate) }))
    .filter((day): day is typeof day & { dayDate: string } => Boolean(day.dayDate))
    .sort((a, b) => a.dayDate.localeCompare(b.dayDate));

  const slots = days.length
    ? days.map((day) => ({
        date: day.dayDate,
        startTime: timeOnly(day.startTime) ?? timeOnly(activity.startTime),
        endTime: timeOnly(day.endTime) ?? timeOnly(activity.endTime),
      }))
    : isoDateOnly(activity.activityDate)
      ? [
          {
            date: isoDateOnly(activity.activityDate) as string,
            startTime: timeOnly(activity.startTime),
            endTime: timeOnly(activity.endTime),
          },
        ]
      : [];

  return capped(
    slots.map((slot, index) =>
      toMarker({
        id: `activity:${activity.id}:${slot.date}:${index}`,
        title,
        eventType,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: activity.location,
        attendeeCount: activity.attendeeCount,
        href,
        workId,
        workTitle,
        contextLabel,
      }),
    ),
  );
}

export function buildJobScheduleMarkers(job: ScheduleJobInput): ScheduleMarker[] {
  const title = job.title.trim() || "Untitled job";
  return startEndBeats(job.startDate, job.endDate).map((beat, index) =>
    toMarker({
      id: `job:${job.id}:${beat.date}:${index}`,
      title: beat.label,
      eventType: "job",
      date: beat.date,
      startTime: null,
      location: job.location,
      href: `/jobs/${job.id}`,
      workId: job.id,
      workTitle: title,
      contextLabel: "Job",
    }),
  );
}

export function sortScheduleMarkers<T extends CalendarEvent>(markers: T[]): T[] {
  return [...markers].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      Number(Boolean(b.allDay)) - Number(Boolean(a.allDay)) ||
      a.startTime.localeCompare(b.startTime) ||
      a.id.localeCompare(b.id),
  );
}

/** Re-derive wall-clock date/time for timestamp markers in the viewer's zone. */
export function localizeScheduleMarkers(markers: ScheduleMarker[]): ScheduleMarker[] {
  return sortScheduleMarkers(
    markers.map((marker) => {
      if (!marker.startsAtIso) return marker;
      const parts = localDateTimeParts(marker.startsAtIso);
      if (!parts) return marker;
      return {
        ...marker,
        date: parts.date,
        startTime: marker.allDay ? marker.startTime : (parts.time ?? marker.startTime),
      };
    }),
  );
}

/** Chip copy: work item first (tap opens it), then the beat. */
export function scheduleMarkerDisplay(marker: Pick<ScheduleMarker, "title" | "workTitle" | "contextLabel">) {
  const secondary = marker.title === marker.workTitle ? marker.contextLabel : marker.title;
  return { primary: marker.workTitle, secondary };
}

export function scheduleMarkerAccessibleLabel(
  marker: Pick<ScheduleMarker, "title" | "workTitle" | "contextLabel" | "date" | "startTime" | "allDay">,
  formatDate: (date: string) => string,
  formatTime: (time: string) => string,
) {
  const { primary, secondary } = scheduleMarkerDisplay(marker);
  const when = marker.allDay ? formatDate(marker.date) : `${formatDate(marker.date)}, ${formatTime(marker.startTime)}`;
  const context = marker.contextLabel && marker.contextLabel !== secondary ? ` · ${marker.contextLabel}` : "";
  return `${primary}: ${secondary}${context}, ${when}. Opens ${marker.contextLabel.toLowerCase()}.`;
}

export type ScheduleDayGroup<T extends ScheduleMarker = ScheduleMarker> = {
  workId: string;
  workTitle: string;
  href: string;
  markers: T[];
};

/** Same-day markers grouped by work item, for the disambiguation list. */
export function groupMarkersByWork<T extends ScheduleMarker>(markers: T[]): ScheduleDayGroup<T>[] {
  const groups = new Map<string, ScheduleDayGroup<T>>();
  for (const marker of markers) {
    const existing = groups.get(marker.workId);
    if (existing) {
      existing.markers.push(marker);
      continue;
    }
    groups.set(marker.workId, {
      workId: marker.workId,
      workTitle: marker.workTitle,
      href: marker.href,
      markers: [marker],
    });
  }
  return [...groups.values()];
}

export function isScheduleMarker(event: CalendarEvent): event is ScheduleMarker {
  return typeof (event as Partial<ScheduleMarker>).href === "string" &&
    typeof (event as Partial<ScheduleMarker>).workId === "string";
}

/**
 * First few beats on or after `fromDate` per Home row (project, standalone
 * activity, or job). More than one so the client can drop a beat that is
 * already past in the viewer's zone.
 */
export function upcomingBeatsByWork(
  markers: ScheduleMarker[],
  fromDate: string,
  limit = 3,
): Map<string, ScheduleMarker[]> {
  const upcoming = new Map<string, ScheduleMarker[]>();
  for (const marker of sortScheduleMarkers(markers)) {
    if (marker.date < fromDate) continue;
    const list = upcoming.get(marker.workId) ?? [];
    if (list.length >= limit) continue;
    list.push(marker);
    upcoming.set(marker.workId, list);
  }
  return upcoming;
}

export function pickNextBeat(markers: ScheduleMarker[] | undefined, today: string): ScheduleMarker | null {
  if (!markers?.length) return null;
  return localizeScheduleMarkers(markers).find((marker) => marker.date >= today) ?? null;
}

/** One line for a Home row: "Audition · Oct 3, 6 PM". */
export function formatNextBeat(
  marker: ScheduleMarker,
  formatDate: (date: string) => string,
  formatTime: (time: string) => string,
) {
  const { secondary } = scheduleMarkerDisplay(marker);
  const when = marker.allDay ? formatDate(marker.date) : `${formatDate(marker.date)}, ${formatTime(marker.startTime)}`;
  return `${secondary} · ${when}`;
}
