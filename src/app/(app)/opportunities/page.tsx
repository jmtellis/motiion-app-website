import { fetchTalentConfirmations } from "@/lib/app/talent-confirmations";
import { OpportunitiesView } from "@/components/app/OpportunitiesView";
import { fetchTalentOpportunities } from "@/lib/app/talent-castings";
import { requireTalentAccount } from "@/lib/auth/session";

export default async function OpportunitiesPage() {
  await requireTalentAccount();
  const [opportunities, confirmations] = await Promise.all([fetchTalentOpportunities(), fetchTalentConfirmations()]);

  return (
    <OpportunitiesView
      opportunities={opportunities}
      confirmations={confirmations}
    />
  );
}
