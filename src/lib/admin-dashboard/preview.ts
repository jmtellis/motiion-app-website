import { type DashboardData, type Sources } from "./model";
// Fictional, local design fixtures. Never written to a database.
export function previewDashboard(range?: string): DashboardData {
  const now = new Date("2026-10-31T15:00:00Z");
  const days = range === "7" ? 7 : range === "90" ? 90 : 30;
  const ago = (n: number) =>
    new Date(now.getTime() - n * 86400000).toISOString();
  const sources: Sources = {};
  for (const key of [
    "profiles",
    "non_talent_profiles",
    "professional_profiles",
    "projects",
    "activities",
    "castings",
    "talent_lists",
    "talent_list_members",
    "saved_searches",
    "resume_parse_runs",
    "subscriptions",
    "identity_verification_fee_payments",
    "booking_deal_memos",
    "stripe_checkout_sessions",
    "enrollments",
    "industry_applications",
    "industry_application_reviews",
    "profile_review_requests",
    "admin_launch_goals",
    "admin_launch_goal_history",
    "admin_analytics_exclusions",
    "analytics_events",
  ])
    sources[key] = { rows: [], error: null };
  const names = [
    "Alex Morgan",
    "Jordan Lee",
    "Avery Parker",
    "Sam Rivera",
    "Taylor Quinn",
    "Casey Brooks",
    "Riley James",
    "Morgan Ellis",
  ];
  for (let i = 0; i < 128; i++)
    sources.profiles.rows.push({
      user_id: `preview-${i}`,
      display_name: `${names[i % names.length]}${i < 8 ? "" : ` ${i + 1}`}`,
      username: `preview-person-${i}`,
      email: `person${i + 1}@example.invalid`,
      account_type: i < 102 ? "talent" : "industry",
      enabled_shells: [i < 102 ? "talent" : "industry"],
      created_at: ago(((i * 7) % 85) + 0.3),
      onboarding_completed_at: i < 110 ? ago(5) : null,
      headshot_urls: i < 112 ? ["preview-placeholder"] : [],
      profile_visuals:
        i < 86 ? [{ kind: "reel", url: "preview-placeholder" }] : [],
      experiences: i < 96 ? [{ title: "Dance project" }] : [],
      styles: i < 100 ? ["Contemporary"] : [],
      profile_review_status:
        i < 72 ? "approved" : i < 81 ? "pending" : "not_submitted",
      profile_review_submitted_at: ago(3),
      identity_verification_status: i < 45 ? "verified" : "unverified",
      stripe_connect_account_id: i < 18 ? "preview-account" : null,
    });
  for (let i = 0; i < 26; i++)
    sources.industry_applications.rows.push({
      user_id: `preview-${102 + i}`,
      full_name: names[i % 8],
      organization: [
        "Northline Productions",
        "Independent",
        "Studio Eight",
        "Motion Collective",
      ][i % 4],
      professional_role: "Casting director",
      contact_email: `industry${i}@example.invalid`,
      work_url: "",
      hiring_projects: "Casting dancers for music videos and live productions.",
      status: i < 20 ? "approved" : i < 24 ? "pending" : "needs_information",
      version: 1,
      submitted_at: ago(i < 24 ? 2 : 5),
    });
  for (let i = 0; i < 9; i++)
    sources.profile_review_requests.rows.push({
      id: `request-${i}`,
      user_id: `preview-${72 + i}`,
      status: "pending",
      submitted_at: ago((i % 4) + 1),
    });
  for (let i = 0; i < 34; i++)
    sources.projects.rows.push({
      id: `project-${i}`,
      poster_id: `preview-${102 + (i % 26)}`,
      title: `${["Autumn campaign", "Live stage production", "Music video"][i % 3]} ${i + 1}`,
      created_at: ago(i + 2),
      is_active: i < 22,
      end_date: "2026-12-20",
    });
  for (let i = 0; i < 96; i++)
    sources.activities.rows.push({
      id: `activity-${i}`,
      creator_id: `preview-${i % 8}`,
      title: `${i % 2 ? "Community session" : "Contemporary workshop"} ${i + 1}`,
      type: i % 2 ? "session" : "class",
      status: "active",
      is_private: false,
      activity_date: i < 28 ? "2026-11-18" : "2026-10-10",
      created_at: ago(i % 56),
    });
  for (let i = 0; i < 19; i++)
    sources.castings.rows.push({
      id: `casting-${i}`,
      project_id: `project-${i}`,
      title: `Casting ${i + 1}`,
      status: i < 12 ? "open" : "closed",
      visibility: "public",
      created_at: ago(i + 1),
      submission_deadline: "2026-12-01",
    });
  for (let i = 0; i < 41; i++)
    sources.talent_lists.rows.push({
      id: `roster-${i}`,
      owner_id: `preview-${102 + (i % 26)}`,
      name: `Production roster ${i + 1}`,
      kind: "roster",
      created_at: ago(i + 1),
    });
  for (let i = 0; i < 240; i++)
    sources.analytics_events.rows.push({
      id: `event-${i}`,
      user_id: `preview-${i % 120}`,
      event_name: [
        "profile_viewed",
        "activity_viewed",
        "class_registration_completed",
        "session_rsvp_completed",
        "talent_saved_to_list",
        "message_sent",
      ][i % 6],
      created_at: ago((i % 55) + 0.1),
      platform: i % 3 ? "ios" : "web",
    });
  for (const [i, key, target] of [
    [0, "ready_talent", 150],
    [1, "approved_industry", 40],
    [2, "opportunities", 60],
    [3, "review_backlog", 5],
  ] as const)
    sources.admin_launch_goals.rows.push({
      id: `goal-${i}`,
      metric_key: key,
      target,
      owner_name: [
        "Community team",
        "Industry team",
        "Partnerships",
        "Review team",
      ][i],
      deadline: "2026-12-01",
      version: 1,
    });
  // Fictional relationship fixtures only; never written to a database.
  for (const key of ['user_referrals','session_join_requests','activity_invites','project_members','project_participants','submissions','bookings']) sources[key]={rows:[],error:null};
  for (const id of [72,102]) {
    const user=`preview-${id}`;
    Object.assign(sources.profiles.rows[id],{acquisition_source:'friend_or_referral',acquisition_source_detail:'Fictional preview: a friend shared Motiion after a showcase.',referred_by_user_id:'preview-1'});
    sources.user_referrals.rows.push({id:`ref-in-${id}`,referrer_user_id:'preview-1',referee_user_id:user,source:'deep_link',created_at:ago(6)},...[2,3,4].map(n=>({id:`ref-out-${id}-${n}`,referrer_user_id:user,referee_user_id:`preview-${n}`,source:'manual_code',created_at:ago(n)})));
    for (let n=0;n<4;n++) {
      sources.session_join_requests.rows.push({id:`join-${id}-${n}`,activity_id:`activity-${n*2+1}`,requester_id:user,status:'approved',created_at:ago(n+1)});
      sources.enrollments.rows.push({id:`enroll-${id}-${n}`,activity_id:`activity-${n*2}`,student_id:user,status:'paid',created_at:ago(n+1)});
      sources.submissions.rows.push({id:`sub-${id}-${n}`,talent_id:user,role_id:`role-${n}`,roles:{id:`role-${n}`,casting_id:`casting-${n}`,title:`Role ${n}`},status:'pending',submitted_at:ago(n+1)});
    }
    sources.project_participants.rows.push({id:`part-${id}`,user_id:user,project_id:'project-2',added_at:ago(2),removed_at:null});
    sources.project_members.rows.push({id:`member-${id}`,user_id:user,project_id:'project-3',role:'collaborator',created_at:ago(2)});
    sources.bookings.rows.push({id:`booking-${id}`,talent_user_id:user,industry_user_id:'preview-106',status:'completed',work_title:'Fictional showcase booking',completed_at:ago(1)});
  }
  return {
    sources,
    fetchedAt: now.toISOString(),
    since: ago(days),
    previousSince: ago(Math.max(days * 2, 60)),
    days,
    preview: true,
  };
}
