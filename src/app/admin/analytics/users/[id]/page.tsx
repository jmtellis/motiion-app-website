import { Dashboard } from '@/components/admin/dashboard/Dashboard';
import { loadDashboard } from '@/lib/admin-dashboard/load';
export default async function AdminUserPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
  const [{id},query] = await Promise.all([params,searchParams]);
  return <Dashboard data={await loadDashboard(query.range)} params={query} detailUserId={id}/>;
}
