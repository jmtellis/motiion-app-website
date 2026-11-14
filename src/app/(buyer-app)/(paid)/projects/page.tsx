import { Suspense } from "react";

import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { ProjectsHubView } from "@/components/talent-buyers/dashboard/ProjectsHubView";
import { fetchProjectsHubData } from "@/lib/talent-buyers/projects-hub";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerProjectsPage() {
  const profile = await requireHiringAccount();
  const { drafts, published } = await fetchProjectsHubData(profile.id);

  return (
    <BuyerAppPage fullWidth className="!space-y-0 flex min-h-0 flex-1 flex-col">
      <Suspense fallback={null}>
        <ProjectsHubView key={profile.id}
          userId={profile.id}
          drafts={drafts}
          published={published}
        />
      </Suspense>
    </BuyerAppPage>
  );
}
