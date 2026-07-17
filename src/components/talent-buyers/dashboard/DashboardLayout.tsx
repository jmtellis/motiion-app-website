import { AppAnalytics } from "@/components/analytics/AppAnalytics";

import { BuyerProviders } from "./BuyerProviders";
import { BuyerDashboardShell } from "./BuyerDashboardShell";
import "./buyer-dashboard.css";
import "./buyer-ui.css";

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
      <BuyerProviders>
        <BuyerDashboardShell profile={profile}>{children}</BuyerDashboardShell>
      </BuyerProviders>
    </div>
  );
}
