import { Suspense } from "react";

import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { PaywallCard } from "@/components/talent-buyers/PaywallCard";
import { ProjectsHubView } from "@/components/talent-buyers/dashboard/ProjectsHubView";
import { isIndustryLocked } from "@/lib/billing/gate";
import { fetchProjectsHubData } from "@/lib/talent-buyers/projects-hub";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerProjectsPage() {
  const profile = await requireHiringAccount();

  if (await isIndustryLocked(profile.id)) {
    return (
      <BuyerAppPage>
        <PaywallCard feature="Projects and castings" />
      </BuyerAppPage>
    );
  }

  const { drafts, published } = await fetchProjectsHubData(profile.id);

  return (
    <BuyerAppPage fullWidth>
      <Suspense fallback={null}>
        <ProjectsHubView drafts={drafts} published={published} />
      </Suspense>
    </BuyerAppPage>
  );
}
