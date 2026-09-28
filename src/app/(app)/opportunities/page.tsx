import { OpportunitiesView } from "@/components/app/OpportunitiesView";
import { fetchTalentOpportunities } from "@/lib/app/talent-castings";
import { requireTalentAccount } from "@/lib/auth/session";

type Tab = "open" | "invited" | "submitted";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; casting?: string }>;
}) {
  await requireTalentAccount();
  const params = await searchParams;
  const opportunities = await fetchTalentOpportunities();
  const tab: Tab = params.tab === "invited" || params.tab === "submitted" ? params.tab : "open";
  const casting = params.casting?.trim() || null;
  const preferRole = tab !== "open";

  return (
    <OpportunitiesView
      opportunities={opportunities}
      initialTab={tab}
      initialCasting={casting}
      initialPreferRole={Boolean(casting && preferRole)}
    />
  );
}
