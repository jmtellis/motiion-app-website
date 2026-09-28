import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type OpenCall = {
  projectId: string;
  roleId: string;
  title: string;
  subtitle: string;
  logoUrl: string | null;
  tags: string[];
  description: string | null;
  payLine: string;
  postedAt: string | null;
  deadline: string | null;
  href: string;
};

export type PublicActivityItem = {
  id: string;
  title: string;
  type: "class" | "session";
  activity_date: string;
  start_time: string | null;
  end_time: string | null;
  cover_image_url: string | null;
  location: string | null;
  href: string;
};

type ProjectRow = {
  id: string;
  title: string | null;
  description: string | null;
  production_company: string | null;
  production_company_logo_url: string | null;
  location: string | null;
  is_union: boolean | null;
  is_active: boolean | null;
  rate_type: string | null;
  rate_details: Record<string, unknown> | null;
  casting_configuration: Record<string, unknown> | null;
};

type RoleRow = {
  id: string;
  title: string | null;
  description: string | null;
  created_at: string | null;
  is_casting_finalized: boolean | null;
  project: ProjectRow | ProjectRow[] | null;
  casting: { submission_deadline: string | null } | { submission_deadline: string | null }[] | null;
};

const COMPENSATION_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  deferred: "Deferred",
  trade_exposure: "Trade / Exposure",
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Mirrors iOS `payStatDisplayLine`, minus the schedule-based day-rate estimate. */
function payLine(project: ProjectRow) {
  const fixed = Number(project.rate_details?.fixed_amount);
  if (project.rate_type === "fixed" && fixed > 0) {
    return fixed.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  const category = text(project.casting_configuration?.compensation_category_raw);
  return (category && COMPENSATION_LABELS[category]) || "TBD";
}

function city(location: string | null) {
  return location?.split(",")[0]?.trim() || null;
}

/** Public open calls, one card per project (iOS `TalentHomeViewModel` open segment). */
export const fetchOpenCalls = cache(async (): Promise<OpenCall[]> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("roles")
    .select(
      "id, title, description, created_at, is_casting_finalized, casting:castings(submission_deadline), project:projects!inner(id, title, description, production_company, production_company_logo_url, location, is_union, is_active, rate_type, rate_details, casting_configuration)",
    )
    .eq("is_active", true)
    .or("visibility.eq.public,visibility.is.null")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("Open calls unavailable", error.code);
    return [];
  }

  const now = Date.now();
  const byProject = new Map<string, { project: ProjectRow; roles: RoleRow[]; deadline: string | null }>();
  for (const role of (data ?? []) as unknown as RoleRow[]) {
    const project = one(role.project);
    if (!project || role.is_casting_finalized || project.is_active === false) continue;
    const presentation = text(project.casting_configuration?.visibility_presentation_raw);
    if (presentation && presentation !== "public_listing") continue;
    const deadline = one(role.casting)?.submission_deadline ?? null;
    if (deadline && new Date(deadline).getTime() < now) continue;
    const group = byProject.get(project.id) ?? { project, roles: [], deadline: null };
    group.roles.push(role);
    if (deadline && (!group.deadline || deadline < group.deadline)) group.deadline = deadline;
    byProject.set(project.id, group);
  }

  return [...byProject.values()].map(({ project, roles, deadline }) => {
    const [lead] = roles;
    const confidential = project.casting_configuration?.confidential_project_client === true;
    const company = confidential ? null : text(project.production_company);
    return {
      projectId: project.id,
      roleId: lead.id,
      title: text(project.title) ?? text(lead.title) ?? "Open casting",
      subtitle: confidential ? "Confidential client" : (company ?? text(lead.title) ?? "Casting"),
      logoUrl: company ? text(project.production_company_logo_url) : null,
      tags: [
        project.is_union || project.rate_type === "union" ? "Union" : "Non-union",
        city(project.location) ?? "TBD",
        roles.length === 1 ? "1 Role" : `${roles.length} Roles`,
      ],
      description: text(project.description) ?? text(lead.description),
      payLine: payLine(project),
      postedAt: lead.created_at,
      deadline,
      href: `/casting/${lead.id}`,
    };
  });
});

/** Public upcoming classes and sessions for the next year (iOS home rails). */
export const fetchUpcomingClassesAndSessions = cache(async (): Promise<PublicActivityItem[]> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date();
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  const { data, error } = await supabase
    .from("activities")
    .select("id, title, type, activity_date, start_time, end_time, cover_image_url, location")
    .in("type", ["class", "session"])
    .eq("status", "active")
    .eq("is_private", false)
    .gte("activity_date", today)
    .lte("activity_date", end.toISOString().slice(0, 10))
    .order("activity_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true })
    .limit(300);
  if (error) {
    console.error("Upcoming classes unavailable", error.code);
    return [];
  }
  return (data ?? []).map((row) => ({ ...row, href: `/activity/${row.id}` })) as PublicActivityItem[];
});
