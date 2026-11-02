import { DashboardLayout } from "@/components/talent-buyers/dashboard/DashboardLayout";
import { AccountSessionBoundary } from "@/components/auth/AccountSessionBoundary";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerAppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireHiringAccount();
  return <AccountSessionBoundary userId={profile.id}><DashboardLayout profile={profile}>{children}</DashboardLayout></AccountSessionBoundary>;
}
