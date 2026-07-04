import { AppAnalytics } from "@/components/analytics/AppAnalytics";

import { BuyerDashboardShell } from "./BuyerDashboardShell";

import type { DashboardProfile } from "@/types/database";

export function DashboardLayout({
  profile,
  children,
}: {
  profile: DashboardProfile;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#151515]">
      <AppAnalytics />
      <BuyerDashboardShell profile={profile}>{children}</BuyerDashboardShell>
    </div>
  );
}
