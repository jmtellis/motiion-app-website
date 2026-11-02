import { Suspense } from 'react';
import { Dashboard } from '@/components/admin/dashboard/Dashboard';
import { AdminShell } from '@/components/admin/dashboard/AdminShell';
import { previewDashboard } from '@/lib/admin-dashboard/preview';
import '@/components/admin/dashboard/dashboard.css';
export const metadata = {title:'Motiion account design preview',robots:{index:false,follow:false}};
export default async function PreviewUserPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
  const [{id},query] = await Promise.all([params,searchParams]);
  return <Suspense><AdminShell preview><Dashboard data={previewDashboard(query.range)} params={query} detailUserId={id}/></AdminShell></Suspense>;
}
