import { BuyerDashboardView } from "@/components/talent-buyers/dashboard/BuyerDashboardView";
import { fetchPosterCastingSummaries } from "@/lib/talent-buyers/casting-projects";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerDashboardPage() {
  const profile = await requireHiringAccount();
  const castingProjects = await fetchPosterCastingSummaries(profile.id);
  return <BuyerDashboardView profile={profile} castingProjects={castingProjects} />;
}
