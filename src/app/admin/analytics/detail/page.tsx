import { AnalyticsDetailView } from "@/components/analytics/dashboard/AnalyticsDetailView";
import { loadAdminAnalyticsDetail } from "@/lib/analytics/load-admin-analytics";

type PageProps = {
  searchParams: Promise<{
    range?: string;
  }>;
};

export default async function AdminAnalyticsDetailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await loadAdminAnalyticsDetail(params);

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-6 py-10 lg:px-10">
      <AnalyticsDetailView data={data} hrefBase="/admin/analytics" />
    </main>
  );
}
