import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isComposableProject,
  parseAbilityModules,
  parseComposableConfig,
} from "@/lib/talent-buyers/project-abilities";
import { isProjectDraft } from "@/lib/talent-buyers/project-payload";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import {
  buildActivityScheduleMarkers,
  buildJobScheduleMarkers,
  buildProjectScheduleMarkers,
  sortScheduleMarkers,
  upcomingBeatsByWork,
  type ScheduleMarker,
} from "@/lib/talent-buyers/schedule-markers";
import type { CastingConfiguration } from "@/types/casting";

type ProjectRow = {
  id: string;
  title: string | null;
  is_active: boolean | null;
  project_type: string | null;
  enabled_modules: unknown;
  project_configuration: Record<string, unknown> | null;
  casting_configuration: (Partial<CastingConfiguration> & { composer_draft?: boolean }) | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
};

type ActivityRow = {
  id: string;
  title: string | null;
  type: string | null;
  project_id: string | null;
  location: string | null;
  activity_date: string | null;
  start_time: string | null;
  end_time: string | null;
};

type EventDayRow = {
  activity_id: string;
  day_date: string | null;
  start_time: string | null;
  end_time: string | null;
  label: string | null;
};

type JobRow = {
  id: string;
  title: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  location?: string | null;
};

function isArchivedProject(row: ProjectRow) {
  const composable = parseComposableConfig(row.project_configuration);
  if (composable) return Boolean(composable.archived_at);
  return row.is_active === false && !isProjectDraft(row as Parameters<typeof isProjectDraft>[0]);
}

/** Legacy event/job container rows are hidden on Home; their activities carry the dates. */
function isHiddenLegacyContainer(row: ProjectRow) {
  if (isComposableProject(row)) return false;
  const type = getNormalizedProjectType(row.project_type);
  return type === "event" || type === "job";
}

async function fetchProductionJobs(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  ownerId: string,
): Promise<{ jobs: JobRow[]; error: boolean }> {
  const { data: organized, error: organizerError } = await supabase.from("job_organizers").select("job_id").eq("user_id", ownerId);
  const organizedIds = (organized ?? []).map((row) => row.job_id as string);

  let query = supabase
    .from("jobs")
    .select("id, title, status, start_date, end_date")
    .eq("job_kind", "production")
    .limit(200);
  query = organizedIds.length
    ? query.or(`poster_id.eq.${ownerId},id.in.(${organizedIds.join(",")})`)
    : query.eq("poster_id", ownerId);

  const { data, error } = await query;
  if (error) {
    console.debug("fetchScheduleMarkers jobs:", error.message);
    return { jobs: [], error: true };
  }
  return { error: Boolean(organizerError), jobs: ((data ?? []) as JobRow[]).filter((job) => {
    const status = (job.status ?? "").toLowerCase();
    return status !== "cancelled";
  }) };
}

/** Every dated beat across the signed-in owner's projects, activities, and jobs. */
export async function fetchScheduleBundle(ownerId: string): Promise<{ markers: ScheduleMarker[]; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { markers: [], error: "Calendar is temporarily unavailable. Please try again." };

  const { data: memberships, error: membershipError } = await supabase.from("project_members")
    .select("project_id").eq("user_id", ownerId);
  const memberIds = [...new Set((memberships ?? []).map((row) => row.project_id as string))];
  let projectQuery = supabase.from("projects").select(
    "id, title, is_active, project_type, enabled_modules, project_configuration, casting_configuration, start_date, end_date, location",
  ).limit(500);
  projectQuery = memberIds.length ? projectQuery.or(`poster_id.eq.${ownerId},id.in.(${memberIds.join(",")})`) : projectQuery.eq("poster_id", ownerId);
  const [{ data: projectRows, error: projectError }, { data: activityRows, error: activityError }, jobResult] =
    await Promise.all([
      projectQuery,
      supabase
        .from("activities")
        .select("id, title, type, project_id, location, activity_date, start_time, end_time")
        .eq("creator_id", ownerId)
        .neq("status", "cancelled")
        .limit(500),
      fetchProductionJobs(supabase, ownerId),
    ]);

  if (projectError) console.debug("fetchScheduleMarkers projects:", projectError.message);
  if (activityError) console.debug("fetchScheduleMarkers activities:", activityError.message);

  const projects = (projectRows ?? []) as ProjectRow[];
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const activities = (activityRows ?? []) as ActivityRow[];

  let dayError = false;
  const eventDaysByActivity = new Map<string, EventDayRow[]>();
  if (activities.length) {
    const { data: dayRows, error: loadDaysError } = await supabase
      .from("activity_event_days")
      .select("activity_id, day_date, start_time, end_time, label")
      .in(
        "activity_id",
        activities.map((activity) => activity.id),
      );
    dayError = Boolean(loadDaysError);
    for (const row of (dayRows ?? []) as EventDayRow[]) {
      const list = eventDaysByActivity.get(row.activity_id) ?? [];
      list.push(row);
      eventDaysByActivity.set(row.activity_id, list);
    }
  }

  const markers: ScheduleMarker[] = [];

  for (const row of projects) {
    if (isArchivedProject(row) || isHiddenLegacyContainer(row)) continue;
    const composable = isComposableProject(row);
    const projectType = getNormalizedProjectType(row.project_type);
    markers.push(
      ...buildProjectScheduleMarkers({
        id: row.id,
        title: row.title ?? "",
        composable,
        projectType,
        castingEnabled: composable ? parseAbilityModules(row.enabled_modules).casting : projectType === "casting",
        startDate: row.start_date,
        endDate: row.end_date,
        location: row.location,
        castingConfiguration: row.casting_configuration,
      }),
    );
  }

  for (const row of activities) {
    const project = row.project_id ? projectById.get(row.project_id) : undefined;
    if (project && isArchivedProject(project)) continue;
    markers.push(
      ...buildActivityScheduleMarkers({
        id: row.id,
        title: row.title ?? "",
        type: row.type ?? "event",
        activityDate: row.activity_date,
        startTime: row.start_time,
        endTime: row.end_time,
        location: row.location,
        attendeeCount: 0,
        eventDays: (eventDaysByActivity.get(row.id) ?? []).map((day) => ({
          dayDate: day.day_date ?? "",
          startTime: day.start_time,
          endTime: day.end_time,
          label: day.label,
        })),
        project: project
          ? { id: project.id, title: project.title ?? "", composable: isComposableProject(project) }
          : null,
      }),
    );
  }

  for (const job of jobResult.jobs) {
    markers.push(
      ...buildJobScheduleMarkers({
        id: job.id,
        title: job.title ?? "",
        startDate: job.start_date,
        endDate: job.end_date,
        location: job.location ?? null,
      }),
    );
  }

  return { markers: sortScheduleMarkers(markers), error: projectError || activityError || membershipError || jobResult.error || dayError
    ? "Some project dates couldn't be loaded. Retry to see your complete schedule." : null };
}

export async function fetchScheduleMarkers(ownerId: string): Promise<ScheduleMarker[]> {
  return (await fetchScheduleBundle(ownerId)).markers;
}

/**
 * Next few dated beats per Home row, keyed by work id. Starts a day early
 * because the server's UTC date can run ahead of the viewer's; the client
 * picks the real next beat in its own zone.
 */
export async function fetchHomeNextBeats(ownerId: string): Promise<Record<string, ScheduleMarker[]>> {
  const markers = await fetchScheduleMarkers(ownerId);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return Object.fromEntries(upcomingBeatsByWork(markers, yesterday));
}
