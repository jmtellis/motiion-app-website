import { Dashboard } from '@/components/admin/dashboard/Dashboard';
import { loadDashboard } from '@/lib/admin-dashboard/load';
import { loadAccountData } from '@/lib/admin-dashboard/load-account-data';
export default async function AdminUserPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
  const [{id},query] = await Promise.all([params,searchParams]);
  const [data,referrals] = await Promise.all([loadDashboard(query.range),loadAccountData(id)]);
  data.sources={...data.sources,...referrals};
  return <Dashboard data={data} params={query} detailUserId={id}/>;
}
