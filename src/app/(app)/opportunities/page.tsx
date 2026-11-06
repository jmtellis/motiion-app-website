import { redirect } from "next/navigation";

import { OpportunitiesView } from "@/components/app/OpportunitiesView";
import { fetchTalentOpportunities } from "@/lib/app/talent-castings";
import { requireTalentAccount } from "@/lib/auth/session";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireTalentAccount();
  const params = await searchParams;
  if (params.tab === "confirmations") {
    const booking = typeof params.booking === "string" ? `&booking=${encodeURIComponent(params.booking)}` : "";
    redirect(`/activities?view=projects${booking}`);
  }
  const opportunities = await fetchTalentOpportunities();

  return <OpportunitiesView opportunities={opportunities} />;
}
