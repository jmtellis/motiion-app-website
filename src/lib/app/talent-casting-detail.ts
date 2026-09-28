import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicCasting, PublicCastingRole, PublicCastingScheduleGroup } from "@/types/public";

const COMPENSATION_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  deferred: "Deferred",
  trade_exposure: "Trade / Exposure",
};

export type SignedInCastingRole = {
  id: string;
  agencyRequired: boolean;
  isActive: boolean;
  isCastingFinalized: boolean;
  finalSelectIds: string[];
};

export type SignedInCasting = {
  casting: PublicCasting;
  configuration: Record<string, unknown> | null;
  roles: SignedInCastingRole[];
};

/** Talent-readable casting detail. Does not depend on the public edge function. */
export async function fetchSignedInCasting(roleId: string): Promise<SignedInCasting | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: lead } = await supabase
    .from("roles")
    .select("id, project_id")
    .eq("id", roleId)
    .maybeSingle<{ id: string; project_id: string | null }>();
  if (!lead?.project_id) return null;

  const [{ data: project }, { data: roles }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, description, production_company, production_company_logo_url, cover_image_url, location, poster_id, is_union, rate_type, rate_details, casting_configuration")
      .eq("id", lead.project_id)
      .maybeSingle(),
    supabase
      .from("roles")
      .select("id, title, description, cover_image_url, is_active, is_casting_finalized, final_select_ids, age_range_min, age_range_max, gender, ethnicity_preferences, special_skills, height_min, height_max, union_status, people_needed, agency_required, casting:castings(submission_deadline)")
      .eq("project_id", lead.project_id)
      .order("created_at", { ascending: true }),
  ]);

  const projectRow = asRecord(project);
  const roleRows = (roles ?? []).map(asRecord).filter((row): row is Record<string, unknown> => Boolean(row));
  if (!projectRow || !roleRows.length) return null;

  const configuration = asRecord(projectRow.casting_configuration);
  const confidential = configuration?.confidential_project_client === true;
  const deadline =
    roleRows.map((role) => text(one(role.casting)?.submission_deadline)).find(Boolean) ??
    text(configuration?.submission_deadline_iso8601);
  const externalSubmissionURL = text(configuration?.external_submission_link_url_string);
  const posterId = text(projectRow.poster_id);
  const organizer = posterId ? await fetchOrganizer(posterId) : null;

  const publicRoles = roleRows.map((role) => mapRole(role, deadline, externalSubmissionURL));
  const selected = publicRoles.some((role) => role.id === roleId) ? roleId : publicRoles[0]?.id ?? null;

  return {
    casting: {
      id: text(projectRow.id) ?? lead.project_id,
      title: text(projectRow.title) ?? publicRoles[0]?.title ?? "Casting",
      production: confidential ? null : text(projectRow.production_company),
      description: text(projectRow.description),
      coverImageURL: text(projectRow.cover_image_url) ?? text(roleRows[0]?.cover_image_url),
      location: projectLocation(configuration, text(projectRow.location)),
      deadline,
      compensationSummary: compensationSummary(projectRow, configuration),
      compensationBreakdown: [],
      requirementsSummary: null,
      usageNotes: text(configuration?.compensation_story_notes),
      additionalNotes: text(configuration?.compensation_story_notes),
      schedule: scheduleFrom(configuration),
      externalSubmissionURL,
      organizerName: organizer?.name ?? null,
      organizerHeadshotURL: organizer?.headshot ?? null,
      selectedRoleId: selected,
      roles: publicRoles,
    },
    configuration,
    roles: roleRows.flatMap((role) => {
      const id = text(role.id);
      if (!id) return [];
      return [{
        id,
        agencyRequired: role.agency_required === true,
        isActive: role.is_active !== false,
        isCastingFinalized: role.is_casting_finalized === true,
        finalSelectIds: stringList(role.final_select_ids),
      }];
    }),
  };
}

async function fetchOrganizer(userId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("display_name, headshot_urls")
    .eq("user_id", userId)
    .maybeSingle<{ display_name: string | null; headshot_urls: string[] | null }>();
  return {
    name: text(data?.display_name),
    headshot: data?.headshot_urls?.find((url) => url.trim()) ?? null,
  };
}

function mapRole(role: Record<string, unknown>, deadline: string | null, externalSubmissionURL: string | null): PublicCastingRole {
  const min = numberOr(role.age_range_min, 18);
  const max = numberOr(role.age_range_max, 65);
  const active = role.is_active !== false;
  const finalized = role.is_casting_finalized === true;
  const deadlinePassed = Boolean(deadline) && new Date(deadline ?? "").getTime() < Date.now();
  return {
    id: text(role.id) ?? "",
    title: text(role.title) ?? "Role",
    description: text(role.description),
    coverImageURL: text(role.cover_image_url),
    isActive: active,
    isCastingFinalized: finalized,
    ageRangeMin: min,
    ageRangeMax: max,
    ageRangeText: `${min}-${max}`,
    gender: text(role.gender),
    ethnicityPreferences: stringList(role.ethnicity_preferences),
    specialSkills: stringList(role.special_skills),
    heightRangeText: heightRange(text(role.height_min), text(role.height_max)),
    unionStatus: text(role.union_status),
    peopleNeeded: numberOr(role.people_needed, 1),
    eligibleForSubmission: active && !finalized && !deadlinePassed && !externalSubmissionURL,
  };
}

function compensationSummary(project: Record<string, unknown>, configuration: Record<string, unknown> | null) {
  const details = asRecord(project.rate_details);
  const fixed = Number(details?.fixed_amount);
  if (project.rate_type === "fixed" && fixed > 0) {
    return fixed.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  const category = text(configuration?.compensation_category_raw);
  return (category && COMPENSATION_LABELS[category]) || "TBD";
}

function projectLocation(configuration: Record<string, unknown> | null, fallback: string | null) {
  const city = text(configuration?.location_city);
  const region = text(configuration?.location_region);
  const venue = text(configuration?.location_venue);
  if (venue && city) return `${venue} — ${city}${region ? `, ${region}` : ""}`;
  return [city, region].filter(Boolean).join(", ") || fallback;
}

function scheduleFrom(configuration: Record<string, unknown> | null): PublicCastingScheduleGroup[] {
  const categories = configuration?.schedule_categories;
  if (!Array.isArray(categories)) return [];
  return categories.flatMap((item) => {
    const record = asRecord(item);
    const days = stringList(record?.selected_days_yyyymmdd);
    const category = text(record?.custom_schedule_title) ?? text(record?.activity_type_raw);
    if (!record || !category || !days.length) return [];
    return [{ category: category.replaceAll("_", " "), days }];
  });
}

function heightRange(min: string | null, max: string | null) {
  if (min && max) return `${min} - ${max}`;
  if (min) return `${min}+`;
  if (max) return `Up to ${max}`;
  return null;
}

function numberOr(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function one(value: unknown) {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
}
