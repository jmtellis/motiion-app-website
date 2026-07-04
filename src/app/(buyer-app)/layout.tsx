import { DashboardLayout } from "@/components/talent-buyers/dashboard/DashboardLayout";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerAppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireHiringAccount();
  return <DashboardLayout profile={profile}>{children}</DashboardLayout>;
}
