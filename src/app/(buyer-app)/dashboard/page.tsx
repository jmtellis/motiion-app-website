import { BuyerDashboardView } from "@/components/talent-buyers/dashboard/BuyerDashboardView";
import { fetchBuyerDashboardLiveData } from "@/lib/talent-buyers/dashboard-live";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerDashboardPage() {
  const profile = await requireHiringAccount();
  const liveData = await fetchBuyerDashboardLiveData(profile);
  return <BuyerDashboardView profile={profile} liveData={liveData} />;
}
