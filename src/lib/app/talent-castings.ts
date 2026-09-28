import { cache } from "react";

import { jsonbToStringArray } from "@/lib/professional-profile/jsonb-fields";
import { scoreOpportunityMatch } from "@/lib/search/talent-filter-logic";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  classifyCastingRole,
  resolveTalentCastingOutcome,
  submissionIsClosed,
  type TalentCastingOutcome,
} from "./talent-casting-state";
import type { OpenCall } from "./home-opportunities";

export type TalentCastingCard = {
  key: string;
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
  matched: boolean;
};

export type TalentInviteCard = TalentCastingCard & { requestId: string };

export type TalentSubmissionCard = TalentCastingCard & {
  submissionId: string;
  submittedAt: string | null;
  outcome: TalentCastingOutcome;
  closed: boolean;
};

export type TalentOpportunities = {
  openCalls: TalentCastingCard[];
  invited: TalentInviteCard[];
  submitted: TalentSubmissionCard[];
};

type PendingRequest = {
  id: string;
  roleId: string;
  title: string;
  detail: string | null;
  inviterName: string | null;
  sortKey: string | null;
};

type SubmissionRow = {
  id: string;
  roleId: string;
  submittedAt: string | null;
};

type RoleSnapshot = {
  roleId: string;
  projectId: string;
  projectTitle: string;
  roleTitle: string;
  description: string | null;
  company: string | null;
  logoUrl: string | null;
  location: string | null;
  payLine: string;
  unionLabel: string;
  postedAt: string | null;
  deadline: string | null;
  publicOpen: boolean;
  finalized: boolean;
  active: boolean;
  finalSelectIds: string[];
  skills: string[];
  styles: string[];
  matchLocation: string | null;
  unionStatus: string | null;
};

const COMPENSATION_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  deferred: "Deferred",
  trade_exposure: "Trade / Exposure",
};

const ROLE_SELECT =
  "id, title, description, created_at, is_active, is_casting_finalized, final_select_ids, visibility, special_skills, casting:castings(submission_deadline), project:projects!inner(id, title, description, production_company, production_company_logo_url, location, is_union, is_active, rate_type, rate_details, casting_configuration)";

const empty: TalentOpportunities = { openCalls: [], invited: [], submitted: [] };

export function toOpenCall(card: TalentCastingCard): OpenCall {
  return {
    projectId: card.projectId,
    roleId: card.roleId,
    title: card.title,
    subtitle: card.subtitle,
    logoUrl: card.logoUrl,
    tags: card.tags,
    description: card.description,
    payLine: card.payLine,
    postedAt: card.postedAt,
    deadline: card.deadline,
    href: `/opportunities?casting=${encodeURIComponent(card.roleId)}`,
  };
}

export const fetchPendingCastingInviteCount = cache(async () => {
  const pending = await fetchPendingCastingRequests();
  return pending.length;
});

export const fetchTalentOpportunities = cache(async (): Promise<TalentOpportunities> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return empty;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const [pending, submissions, passes, publicRoles, talent] = await Promise.all([
    fetchPendingCastingRequests(),
    fetchSubmissions(user.id),
    fetchPassedRoleIds(user.id),
    fetchRoleRows((query) =>
      query
        .eq("is_active", true)
        .or("visibility.eq.public,visibility.is.null")
        .order("created_at", { ascending: false })
        .limit(200),
    ),
    loadTalentAttributes(user.id),
  ]);

  const snapshots = new Map<string, RoleSnapshot>();
  for (const row of publicRoles) {
    const snapshot = toSnapshot(row);
    if (snapshot) snapshots.set(snapshot.roleId, snapshot);
  }

  const missing = [
    ...submissions.map((row) => row.roleId),
    ...pending.map((row) => row.roleId),
  ].filter((id) => !snapshots.has(id));
  if (missing.length) {
    const extra = await fetchRoleRows((query) => query.in("id", [...new Set(missing)]));
    for (const row of extra) {
      const snapshot = toSnapshot(row);
      if (snapshot) snapshots.set(snapshot.roleId, snapshot);
    }
  }

  const submittedIds = new Set(submissions.map((row) => row.roleId));
  const invitedIds = new Set(pending.map((row) => row.roleId));
  const now = Date.now();

  const openByProject = new Map<string, RoleSnapshot[]>();
  for (const role of snapshots.values()) {
    const bucket = classifyCastingRole({
      submitted: submittedIds.has(role.roleId),
      invitedPending: invitedIds.has(role.roleId),
      passed: passes.has(role.roleId),
      publicOpen: role.publicOpen && roleStillOpen(role, now),
    });
    if (bucket !== "open") continue;
    openByProject.set(role.projectId, [...(openByProject.get(role.projectId) ?? []), role]);
  }

  const openCalls = [...openByProject.values()]
    .map((roles) => projectCard(roles, talent))
    .sort((a, b) => Number(b.matched) - Number(a.matched) || (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));

  const invited = pending
    .filter((request) => !submittedIds.has(request.roleId))
    .map((request) => inviteCard(request, snapshots.get(request.roleId) ?? null))
    .sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));

  const submitted = submissions
    .map((submission) => submissionCard(submission, snapshots.get(submission.roleId) ?? null, now))
    .filter((card): card is TalentSubmissionCard => Boolean(card))
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));

  return { openCalls, invited, submitted };
});

const fetchPendingCastingRequests = cache(async (): Promise<PendingRequest[]> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_pending_requests", { p_limit: 100 });
  if (error || !Array.isArray(data)) return [];
  return data.flatMap((row) => {
    const record = asRecord(row);
    if (text(record?.request_kind) !== "casting") return [];
    const roleId = text(record?.ref_role_id);
    const id = text(record?.id);
    if (!roleId || !id) return [];
    return [{
      id,
      roleId,
      title: text(record?.title) ?? "Casting invite",
      detail: text(record?.detail_text),
      inviterName: text(record?.inviter_name),
      sortKey: text(record?.sort_key),
    }];
  });
});

async function fetchSubmissions(userId: string): Promise<SubmissionRow[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("submissions")
    .select("id, role_id, submitted_at")
    .eq("talent_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(100);
  if (error) return [];
  return (data ?? []).flatMap((row) => {
    const roleId = text(row.role_id);
    const id = text(row.id);
    if (!roleId || !id) return [];
    return [{ id, roleId, submittedAt: text(row.submitted_at) }];
  });
}

async function fetchPassedRoleIds(userId: string) {
  const supabase = await createServerSupabaseClient();
  const passed = new Set<string>();
  if (!supabase) return passed;
  const { data } = await supabase.from("casting_role_passes").select("role_id").eq("talent_id", userId);
  for (const row of data ?? []) {
    const roleId = text(row.role_id);
    if (roleId) passed.add(roleId);
  }
  return passed;
}

type RoleFilter = {
  eq: (column: string, value: unknown) => RoleFilter;
  or: (filters: string) => RoleFilter;
  in: (column: string, values: string[]) => RoleFilter;
  order: (column: string, options?: { ascending?: boolean }) => RoleFilter;
  limit: (count: number) => RoleFilter;
  then: Promise<{ data: unknown[] | null; error: { message?: string } | null }>["then"];
};

async function fetchRoleRows(apply: (query: RoleFilter) => PromiseLike<{ data: unknown[] | null; error: { message?: string } | null }>) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await apply(supabase.from("roles").select(ROLE_SELECT) as unknown as RoleFilter);
  if (error) {
    console.error("Casting roles unavailable", error.message);
    return [];
  }
  return data ?? [];
}

async function loadTalentAttributes(userId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data: pro } = await supabase
    .from("professional_profiles")
    .select("styles, skills, location_city, union_status, availability")
    .eq("user_id", userId)
    .maybeSingle<{
      styles: string[] | null;
      skills: string[] | null;
      location_city: string | null;
      union_status: string | null;
      availability: string | null;
    }>();
  if (pro) return pro;

  const { data: legacy } = await supabase
    .from("profiles")
    .select("styles, skills, union_status, working_locations")
    .eq("user_id", userId)
    .maybeSingle<{
      styles: unknown;
      skills: unknown;
      union_status: string | null;
      working_locations: unknown;
    }>();
  if (!legacy) return null;
  return {
    styles: jsonbToStringArray(legacy.styles),
    skills: jsonbToStringArray(legacy.skills),
    location_city: firstCity(legacy.working_locations),
    union_status: legacy.union_status,
    availability: "available" as const,
  };
}

function toSnapshot(row: unknown): RoleSnapshot | null {
  const record = asRecord(row);
  const project = oneRecord(record?.project);
  const roleId = text(record?.id);
  const projectId = text(project?.id);
  if (!record || !project || !roleId || !projectId) return null;

  const configuration = asRecord(project.casting_configuration) ?? {};
  const confidential = configuration.confidential_project_client === true;
  const presentation = text(configuration.visibility_presentation_raw);
  const deadline = text(oneRecord(record.casting)?.submission_deadline) ?? text(configuration.submission_deadline_iso8601);
  const company = confidential ? null : text(project.production_company);
  const active = record.is_active !== false && project.is_active !== false;
  const finalized = record.is_casting_finalized === true;
  const publicVisibility = record.visibility == null || record.visibility === "public";
  const publicPresentation = !presentation || presentation === "public_listing";

  return {
    roleId,
    projectId,
    projectTitle: text(project.title) ?? text(record.title) ?? "Open casting",
    roleTitle: text(record.title) ?? "Role",
    description: text(project.description) ?? text(record.description),
    company,
    logoUrl: company ? text(project.production_company_logo_url) : null,
    location: city(text(project.location)) ?? text(configuration.location_city),
    payLine: payLine(project, configuration),
    unionLabel: project.is_union === true || project.rate_type === "union" ? "Union" : "Non-union",
    postedAt: text(record.created_at),
    deadline,
    publicOpen: publicVisibility && publicPresentation && active && !finalized,
    finalized,
    active,
    finalSelectIds: stringList(record.final_select_ids),
    skills: stringList(record.special_skills),
    styles: stringList(configuration.styles),
    matchLocation: text(configuration.location_city) ?? text(project.location),
    unionStatus: text(configuration.union_status),
  };
}

function roleStillOpen(role: RoleSnapshot, now: number) {
  if (!role.active || role.finalized) return false;
  if (!role.deadline) return true;
  const time = new Date(role.deadline).getTime();
  return Number.isNaN(time) || time >= now;
}

function projectCard(
  roles: RoleSnapshot[],
  talent: Awaited<ReturnType<typeof loadTalentAttributes>>,
): TalentCastingCard {
  const [lead] = [...roles].sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));
  const deadline = roles.map((role) => role.deadline).filter((value): value is string => Boolean(value)).sort()[0] ?? null;
  const matched = talent
    ? scoreOpportunityMatch(talent, {
        styles: [...new Set(roles.flatMap((role) => role.styles))],
        skills: [...new Set(roles.flatMap((role) => role.skills))],
        location: lead.matchLocation,
        union_status: lead.unionStatus,
      }) > 0
    : false;
  return {
    key: lead.projectId,
    projectId: lead.projectId,
    roleId: lead.roleId,
    title: lead.projectTitle,
    subtitle: lead.company ?? "Casting",
    logoUrl: lead.logoUrl,
    tags: [lead.unionLabel, lead.location ?? "TBD", roles.length === 1 ? "1 Role" : `${roles.length} Roles`],
    description: lead.description,
    payLine: lead.payLine,
    postedAt: lead.postedAt,
    deadline,
    matched,
  };
}

function inviteCard(request: PendingRequest, role: RoleSnapshot | null): TalentInviteCard {
  return {
    key: request.id,
    requestId: request.id,
    projectId: role?.projectId ?? request.roleId,
    roleId: request.roleId,
    title: role?.projectTitle ?? request.title,
    subtitle: role?.company ?? request.inviterName ?? "Private casting",
    logoUrl: role?.logoUrl ?? null,
    tags: ["Invited", role?.roleTitle ?? request.title],
    description: role?.description ?? request.detail,
    payLine: role?.payLine ?? "TBD",
    postedAt: request.sortKey ?? role?.postedAt ?? null,
    deadline: role?.deadline ?? null,
    matched: false,
  };
}

function submissionCard(submission: SubmissionRow, role: RoleSnapshot | null, now: number): TalentSubmissionCard | null {
  if (!role) return null;
  const deadlinePassed = Boolean(role.deadline) && new Date(role.deadline ?? "").getTime() < now;
  const outcome = resolveTalentCastingOutcome({
    isCastingFinalized: role.finalized,
    isActive: role.active,
    deadlinePassed,
    submissionId: submission.id,
    finalSelectIds: role.finalSelectIds,
  });
  return {
    key: submission.id,
    projectId: role.projectId,
    roleId: role.roleId,
    title: role.projectTitle,
    subtitle: role.roleTitle,
    logoUrl: role.logoUrl,
    tags: [role.unionLabel, role.location ?? "TBD"],
    description: role.description,
    payLine: role.payLine,
    postedAt: role.postedAt,
    deadline: role.deadline,
    matched: false,
    submissionId: submission.id,
    submittedAt: submission.submittedAt,
    outcome,
    closed: submissionIsClosed(role.finalized),
  };
}

function payLine(project: Record<string, unknown>, configuration: Record<string, unknown>) {
  const details = asRecord(project.rate_details);
  const fixed = Number(details?.fixed_amount);
  if (project.rate_type === "fixed" && fixed > 0) {
    return fixed.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  const category = text(configuration.compensation_category_raw);
  return (category && COMPENSATION_LABELS[category]) || "TBD";
}

function firstCity(value: unknown) {
  if (!Array.isArray(value) || !value[0]) return null;
  const loc = value[0];
  if (typeof loc === "string") return loc;
  if (loc && typeof loc === "object" && "city" in loc) return text((loc as { city?: unknown }).city);
  return null;
}

function city(location: string | null) {
  return location?.split(",")[0]?.trim() || null;
}

function oneRecord(value: unknown) {
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
