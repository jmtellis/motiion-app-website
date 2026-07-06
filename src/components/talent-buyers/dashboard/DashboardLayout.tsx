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
    <div className="theme-dark min-h-screen bg-[#0a0a0a]">
      <AppAnalytics />
      <BuyerDashboardShell profile={profile}>{children}</BuyerDashboardShell>
    </div>
  );
}
