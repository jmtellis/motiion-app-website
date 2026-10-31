import "server-only";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  excludeAccounts,
  type Source,
  type Sources,
  type DashboardData,
} from "./model";

// Read the configured auth database only; never the separate production catalog.
const tables = [
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
] as const;
export async function loadDashboard(range?: string): Promise<DashboardData> {
  await requirePlatformAdmin();
  const now = new Date();
  const days = range === "7" ? 7 : range === "90" ? 90 : 30;
  const session = await createServerSupabaseClient();
  if (session) {
    const result = await session.rpc("admin_launch_snapshot", { p_days: days });
    if (!result.error && result.data?.sources) {
      const snapshot = result.data as DashboardData;
      return {
        ...snapshot,
        sources: excludeAccounts(snapshot.sources),
        preview: false,
      };
    }
  }
  // Before migration, web can still read existing sources with its server-only client.
  const db = createAdminSupabaseClient();
  const since = new Date(now.getTime() - days * 86400000).toISOString();
  const previousSince = new Date(
    now.getTime() - Math.max(days * 2, 60) * 86400000,
  ).toISOString();
  async function read(table: string): Promise<Source> {
    if (!db)
      return { rows: [], error: "Admin data connection is unavailable." };
    const rows: Source["rows"] = [];
    try {
      // Exact count catches server-side page caps; never present truncated totals.
      for (let from = 0; from < 100000; from += 1000) {
        const order = [
          "profiles",
          "industry_applications",
          "admin_analytics_exclusions",
        ].includes(table)
          ? "user_id"
          : "id";
        let query = db
          .from(table)
          .select("*", { count: "exact" })
          .order(order)
          .range(from, from + 999);
        if (table === "analytics_events")
          query = query
            .gte("created_at", previousSince)
            .lt("created_at", now.toISOString());
        const result = await query;
        if (result.error)
          return {
            rows: [],
            error: `Source unavailable (${result.error.code || "connection"}).`,
          };
        rows.push(...(result.data ?? []));
        if (rows.length >= (result.count ?? Infinity))
          return { rows, error: null };
        if ((result.data?.length ?? 0) < 1000)
          return {
            rows: [],
            error: "Incomplete source coverage; totals withheld.",
          };
      }
      return {
        rows: [],
        error: "Source exceeds dashboard read limit; aggregate required.",
      };
    } catch {
      return { rows: [], error: "Source could not be reached." };
    }
  }
  const entries = await Promise.all(
    tables.map(async (table) => [table, await read(table)] as const),
  );
  return {
    sources: excludeAccounts(Object.fromEntries(entries) as Sources),
    fetchedAt: now.toISOString(),
    since,
    previousSince,
    days,
    preview: false,
  };
}
