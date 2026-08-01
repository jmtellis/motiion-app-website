import { AppAnalytics } from "@/components/analytics/AppAnalytics";
import { getUserEntitlement } from "@/lib/billing/entitlement";
import { hasIndustryProAccess } from "@/lib/billing/gate";

import { BuyerProviders } from "./BuyerProviders";
import { BuyerDashboardShell } from "./BuyerDashboardShell";
import "./buyer-dashboard.css";
import "./buyer-ui.css";
import "./buyer-empty.css";

import type { DashboardProfile } from "@/types/database";

export async function DashboardLayout({
  profile,
  children,
}: {
  profile: DashboardProfile;
  children: React.ReactNode;
}) {
  const [entitlement, hasIndustryPro] = await Promise.all([
    getUserEntitlement(profile.id),
    hasIndustryProAccess(profile.id),
  ]);

  return (
    <div className="theme-dark min-h-screen bg-black">
      <AppAnalytics />
      <BuyerProviders hasIndustryPro={hasIndustryPro}>
        <BuyerDashboardShell profile={profile} entitlement={entitlement}>
          {children}
        </BuyerDashboardShell>
      </BuyerProviders>
    </div>
  );
}
