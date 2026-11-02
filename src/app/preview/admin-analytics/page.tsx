import { Suspense } from "react";
import { AdminShell } from "@/components/admin/dashboard/AdminShell";
import { Dashboard } from "@/components/admin/dashboard/Dashboard";
import { previewDashboard } from "@/lib/admin-dashboard/preview";
import "@/components/admin/dashboard/dashboard.css";
export const metadata = {
  title: "Motiion admin design preview",
  robots: { index: false, follow: false },
};
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <Suspense>
      <AdminShell preview>
        <Dashboard data={previewDashboard(params.range)} params={params} />
      </AdminShell>
    </Suspense>
  );
}
