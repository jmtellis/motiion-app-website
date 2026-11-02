import { Dashboard } from "@/components/admin/dashboard/Dashboard";
import { loadDashboard } from "@/lib/admin-dashboard/load";
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return <Dashboard data={await loadDashboard(params.range)} params={params} />;
}
