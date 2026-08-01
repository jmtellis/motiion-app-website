import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  DraftPromoCode,
  OrganizerAttendee,
  OrganizerLeadRow,
  OrganizerRevenueSummary,
  OrganizerSubgroup,
} from "@/lib/talent-buyers/activities/types";
import { loadPromoCodesForDraft } from "@/lib/talent-buyers/activities/promo-codes";

export type OrganizerActivityDetail = {
  id: string;
  title: string;
  type: "class" | "session" | "event";
  description: string | null;
  location: string | null;
  coverImageUrl: string | null;
  activityDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  maxAttendees: number | null;
  spotsRemaining: number | null;
  requirePayment: boolean;
  isPrivate: boolean;
  status: string;
  priceAmountCents: number | null;
  priceCurrency: string | null;
  rootJobId: string | null;
  eventDays: {
    id: string;
    dayDate: string;
    startTime: string | null;
    endTime: string | null;
    label: string | null;
    spotsRemaining: number | null;
    maxAttendees: number | null;
  }[];
  ticketOptions: { id: string; label: string }[];
};

function profileName(row: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  const display = row.display_name?.trim();
  if (display) return display;
  const combined = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return combined || "Guest";
}

function headshot(urls: string[] | null | undefined): string | null {
  if (!Array.isArray(urls)) return null;
  const first = urls.find((url) => typeof url === "string" && url.trim());
  return first?.trim() ?? null;
}

export async function loadOrganizerActivity(
  supabase: SupabaseClient,
  activityId: string,
  userId: string,
): Promise<{ ok: true; activity: OrganizerActivityDetail } | { ok: false; error: string }> {
  const { data: row, error } = await supabase
    .from("activities")
    .select(
      `
      id, creator_id, type, title, description, location, cover_image_url,
      activity_date, start_time, end_date, end_time, max_attendees, spots_remaining,
      require_payment, is_private, status, price_amount_cents, price_currency, root_job_id
    `,
    )
    .eq("id", activityId)
    .maybeSingle();

  if (error || !row) return { ok: false, error: "Activity not found." };
  if ((row as { creator_id: string }).creator_id !== userId) {
    return { ok: false, error: "You can only manage activities you created." };
  }

  const r = row as Record<string, unknown>;
  const type =
    r.type === "class" || r.type === "session" || r.type === "event" ? r.type : "event";

  const [{ data: days }, { data: tickets }] = await Promise.all([
    supabase
      .from("activity_event_days")
      .select("id,day_date,start_time,end_time,label,spots_remaining,max_attendees,sort_order")
      .eq("activity_id", activityId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("activity_ticket_options")
      .select("id,label")
      .eq("activity_id", activityId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  return {
    ok: true,
    activity: {
      id: String(r.id),
      title: String(r.title ?? ""),
      type,
      description: (r.description as string | null) ?? null,
      location: (r.location as string | null) ?? null,
      coverImageUrl: (r.cover_image_url as string | null) ?? null,
      activityDate: (r.activity_date as string | null) ?? null,
      startTime: (r.start_time as string | null) ?? null,
      endDate: (r.end_date as string | null) ?? null,
      endTime: (r.end_time as string | null) ?? null,
      maxAttendees: (r.max_attendees as number | null) ?? null,
      spotsRemaining: (r.spots_remaining as number | null) ?? null,
      requirePayment: r.require_payment === true,
      isPrivate: r.is_private === true,
      status: String(r.status ?? "active"),
      priceAmountCents: (r.price_amount_cents as number | null) ?? null,
      priceCurrency: (r.price_currency as string | null) ?? "usd",
      rootJobId: (r.root_job_id as string | null) ?? null,
      eventDays: ((days ?? []) as Record<string, unknown>[]).map((day) => ({
        id: String(day.id),
        dayDate: String(day.day_date),
        startTime: (day.start_time as string | null) ?? null,
        endTime: (day.end_time as string | null) ?? null,
        label: (day.label as string | null) ?? null,
        spotsRemaining: (day.spots_remaining as number | null) ?? null,
        maxAttendees: (day.max_attendees as number | null) ?? null,
      })),
      ticketOptions: ((tickets ?? []) as { id: string; label: string }[]).map((ticket) => ({
        id: ticket.id,
        label: ticket.label,
      })),
    },
  };
}

export async function loadOrganizerSubgroups(
  supabase: SupabaseClient,
  rootJobId: string | null,
): Promise<OrganizerSubgroup[]> {
  if (!rootJobId) return [];

  const { data: groups } = await supabase
    .from("job_groups")
    .select("id,name,sort_order")
    .eq("job_id", rootJobId)
    .order("sort_order", { ascending: true });

  const groupRows = (groups ?? []) as { id: string; name: string; sort_order: number }[];
  if (!groupRows.length) return [];

  const groupIds = groupRows.map((group) => group.id);
  const [{ data: invites }, { data: members }] = await Promise.all([
    supabase
      .from("job_group_invites")
      .select("id,job_group_id,invited_user_id,status,membership_role_on_accept")
      .in("job_group_id", groupIds)
      .in("status", ["pending", "accepted"])
      .eq("membership_role_on_accept", "lead"),
    supabase
      .from("job_group_members")
      .select("id,job_group_id,member_user_id,member_role,subgroup_activity_id,subgroup_setup_completed_at")
      .in("job_group_id", groupIds)
      .eq("member_role", "lead"),
  ]);

  const inviteRows = (invites ?? []) as {
    id: string;
    job_group_id: string;
    invited_user_id: string;
    status: string;
  }[];
  const memberRows = (members ?? []) as {
    id: string;
    job_group_id: string;
    member_user_id: string;
    subgroup_activity_id: string | null;
    subgroup_setup_completed_at: string | null;
  }[];

  const userIds = [
    ...new Set([
      ...inviteRows.map((row) => row.invited_user_id),
      ...memberRows.map((row) => row.member_user_id),
    ]),
  ];
  const activityIds = memberRows
    .map((row) => row.subgroup_activity_id)
    .filter((id): id is string => Boolean(id));

  const [profilesResult, activitiesResult] = await Promise.all([
    userIds.length
      ? supabase
          .from("profiles")
          .select("user_id,display_name,first_name,last_name,headshot_urls")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    activityIds.length
      ? supabase.from("activities").select("id,title").in("id", activityIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const profileById = new Map(
    ((profilesResult.data ?? []) as Record<string, unknown>[]).map((profile) => [
      String(profile.user_id),
      profile,
    ]),
  );
  const activityTitleById = new Map(
    ((activitiesResult.data ?? []) as { id: string; title: string }[]).map((row) => [
      row.id,
      row.title,
    ]),
  );

  return groupRows.map((group) => {
    const leads: OrganizerLeadRow[] = [];
    const memberForGroup = memberRows.filter((row) => row.job_group_id === group.id);
    const inviteForGroup = inviteRows.filter((row) => row.job_group_id === group.id);
    const coveredUsers = new Set<string>();

    for (const member of memberForGroup) {
      coveredUsers.add(member.member_user_id);
      const profile = profileById.get(member.member_user_id) as
        | {
            display_name?: string | null;
            first_name?: string | null;
            last_name?: string | null;
            headshot_urls?: string[] | null;
          }
        | undefined;
      const status =
        member.subgroup_activity_id != null
          ? "child_event_linked"
          : "accepted_setup_incomplete";
      leads.push({
        groupId: group.id,
        groupName: group.name,
        userId: member.member_user_id,
        displayName: profile ? profileName(profile) : "Lead",
        headshotUrl: profile ? headshot(profile.headshot_urls) : null,
        status,
        inviteId: null,
        memberId: member.id,
        subgroupActivityId: member.subgroup_activity_id,
        subgroupActivityTitle: member.subgroup_activity_id
          ? (activityTitleById.get(member.subgroup_activity_id) ?? "Subgroup event")
          : null,
      });
    }

    for (const invite of inviteForGroup) {
      if (coveredUsers.has(invite.invited_user_id)) continue;
      const profile = profileById.get(invite.invited_user_id) as
        | {
            display_name?: string | null;
            first_name?: string | null;
            last_name?: string | null;
            headshot_urls?: string[] | null;
          }
        | undefined;
      leads.push({
        groupId: group.id,
        groupName: group.name,
        userId: invite.invited_user_id,
        displayName: profile ? profileName(profile) : "Lead",
        headshotUrl: profile ? headshot(profile.headshot_urls) : null,
        status: invite.status === "pending" ? "pending_invite" : "accepted_setup_incomplete",
        inviteId: invite.id,
        memberId: null,
        subgroupActivityId: null,
        subgroupActivityTitle: null,
      });
    }

    return {
      id: group.id,
      name: group.name,
      sortOrder: group.sort_order,
      leads,
    };
  });
}

export async function loadOrganizerRoster(
  supabase: SupabaseClient,
  activityId: string,
  eventDayId?: string | null,
): Promise<OrganizerAttendee[]> {
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id,student_id,status,ticket_option_id,pricing_tier_id")
    .eq("activity_id", activityId)
    .in("status", ["paid", "guest", "comped", "pending"]);

  const enrollmentRows = (enrollments ?? []) as {
    id: string;
    student_id: string;
    status: string;
    ticket_option_id: string | null;
    pricing_tier_id: string | null;
  }[];

  const userIds = enrollmentRows.map((row) => row.student_id);
  const ticketIds = enrollmentRows
    .map((row) => row.ticket_option_id)
    .filter((id): id is string => Boolean(id));

  const [profilesResult, ticketsResult, checkInsResult, invitesResult] = await Promise.all([
    userIds.length
      ? supabase
          .from("profiles")
          .select("user_id,display_name,first_name,last_name,headshot_urls,username")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ticketIds.length
      ? supabase.from("activity_ticket_options").select("id,label").in("id", ticketIds)
      : Promise.resolve({ data: [] as { id: string; label: string }[] }),
    supabase
      .from("activity_check_ins")
      .select("user_id,checked_in_at,event_day_id")
      .eq("activity_id", activityId),
    supabase
      .from("activity_invites")
      .select("invited_user_id,status")
      .eq("activity_id", activityId)
      .eq("status", "pending"),
  ]);

  const profiles = profilesResult.data;
  const tickets = ticketsResult.data;
  const checkIns = checkInsResult.data;
  const invites = invitesResult.data;

  const profileById = new Map(
    ((profiles ?? []) as Record<string, unknown>[]).map((profile) => [
      String(profile.user_id),
      profile,
    ]),
  );
  const ticketById = new Map(
    ((tickets ?? []) as { id: string; label: string }[]).map((ticket) => [
      ticket.id,
      ticket.label,
    ]),
  );

  const checkInByUser = new Map<string, string>();
  for (const row of (checkIns ?? []) as {
    user_id: string;
    checked_in_at: string;
    event_day_id: string | null;
  }[]) {
    if (eventDayId && row.event_day_id && row.event_day_id !== eventDayId) continue;
    if (eventDayId && !row.event_day_id) continue;
    checkInByUser.set(row.user_id, row.checked_in_at);
  }

  const attendees: OrganizerAttendee[] = enrollmentRows.map((row) => {
    const profile = profileById.get(row.student_id) as
      | {
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          headshot_urls?: string[] | null;
        }
      | undefined;
    return {
      userId: row.student_id,
      enrollmentId: row.id,
      displayName: profile ? profileName(profile) : "Guest",
      headshotUrl: profile ? headshot(profile.headshot_urls) : null,
      status: row.status,
      checkedInAt: checkInByUser.get(row.student_id) ?? null,
      ticketLabel: row.ticket_option_id
        ? (ticketById.get(row.ticket_option_id) ?? null)
        : null,
      source: "enrollment",
    };
  });

  const enrolledIds = new Set(attendees.map((item) => item.userId));
  const inviteUserIds = ((invites ?? []) as { invited_user_id: string }[])
    .map((row) => row.invited_user_id)
    .filter((id) => !enrolledIds.has(id));

  if (inviteUserIds.length) {
    const { data: inviteProfiles } = await supabase
      .from("profiles")
      .select("user_id,display_name,first_name,last_name,headshot_urls")
      .in("user_id", inviteUserIds);
    for (const profile of (inviteProfiles ?? []) as Record<string, unknown>[]) {
      attendees.push({
        userId: String(profile.user_id),
        enrollmentId: null,
        displayName: profileName(
          profile as {
            display_name?: string | null;
            first_name?: string | null;
            last_name?: string | null;
          },
        ),
        headshotUrl: headshot(profile.headshot_urls as string[] | null),
        status: "invited",
        checkedInAt: null,
        ticketLabel: null,
        source: "invite",
      });
    }
  }

  return attendees.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function loadOrganizerRevenue(
  supabase: SupabaseClient,
  activityId: string,
): Promise<OrganizerRevenueSummary> {
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id,status,ticket_option_id,amount_cents,currency")
    .eq("activity_id", activityId)
    .eq("status", "paid");

  const rows = (enrollments ?? []) as {
    ticket_option_id: string | null;
    amount_cents: number | null;
    currency: string | null;
  }[];

  let grossCents = 0;
  let currency = "usd";
  const ticketIds = rows
    .map((row) => row.ticket_option_id)
    .filter((id): id is string => Boolean(id));

  const ticketAmountById = new Map<string, number>();
  if (ticketIds.length) {
    const { data: tickets } = await supabase
      .from("activity_ticket_options")
      .select("id,amount_cents,currency")
      .in("id", ticketIds);
    for (const ticket of (tickets ?? []) as {
      id: string;
      amount_cents: number;
      currency: string;
    }[]) {
      ticketAmountById.set(ticket.id, ticket.amount_cents);
      currency = ticket.currency || currency;
    }
  }

  for (const row of rows) {
    if (row.amount_cents != null) {
      grossCents += row.amount_cents;
      currency = row.currency || currency;
      continue;
    }
    if (row.ticket_option_id && ticketAmountById.has(row.ticket_option_id)) {
      grossCents += ticketAmountById.get(row.ticket_option_id) ?? 0;
    }
  }

  if (!rows.length) {
    const { data: activity } = await supabase
      .from("activities")
      .select("price_amount_cents,price_currency,require_payment")
      .eq("id", activityId)
      .maybeSingle();
    if (activity?.require_payment && activity.price_amount_cents) {
      // leave 0 until paid enrollments exist
      currency = (activity.price_currency as string) || currency;
    }
  }

  const { count: promoRedemptionCount } = await supabase
    .from("activity_promo_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("activity_id", activityId);

  return {
    paidCount: rows.length,
    grossCents,
    currency,
    promoRedemptionCount: promoRedemptionCount ?? 0,
  };
}

export async function loadOrganizerPromos(
  supabase: SupabaseClient,
  activityId: string,
): Promise<DraftPromoCode[]> {
  return loadPromoCodesForDraft(supabase, activityId);
}

export function parseProfileQrPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed)) return trimmed.toLowerCase();

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const profileIndex = parts.findIndex((part) => part === "profile");
    if (profileIndex >= 0 && parts[profileIndex + 1]) {
      return parts[profileIndex + 1];
    }
  } catch {
    // not a URL
  }

  if (/^[a-zA-Z0-9._-]{2,64}$/.test(trimmed)) return trimmed;
  return null;
}
