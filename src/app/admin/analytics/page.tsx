import { AnalyticsHomeView } from "@/components/analytics/dashboard/AnalyticsHomeView";
import { loadAdminAnalyticsHome } from "@/lib/analytics/load-admin-analytics";
import { hasAdminSupabaseEnv } from "@/lib/supabase/admin";

type PageProps = {
  searchParams: Promise<{
    range?: string;
    query?: string;
    user?: string;
  }>;
};

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await loadAdminAnalyticsHome(params);

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-6 py-10 lg:px-10">
      {!hasAdminSupabaseEnv() ? (
        <section className="ui-card mb-8 p-5 text-sm text-[var(--ink-soft)]">
          Add `SUPABASE_SERVICE_ROLE_KEY` to the website environment to load analytics aggregates.
        </section>
      ) : null}
      <AnalyticsHomeView data={data} hrefBase="/admin/analytics" />
    </main>
  );
}
