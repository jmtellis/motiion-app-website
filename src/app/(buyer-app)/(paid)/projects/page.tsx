import { Suspense } from "react";

import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { ProjectsHubView } from "@/components/talent-buyers/dashboard/ProjectsHubView";
import { listInboxFiles } from "@/app/(buyer-app)/(paid)/projects/buyer-file-inbox-actions";
import { fetchProjectsHubData } from "@/lib/talent-buyers/projects-hub";
import { fetchHomeNextBeats } from "@/lib/talent-buyers/schedule-markers-server";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerProjectsPage() {
  const profile = await requireHiringAccount();
  const [{ drafts, published }, inboxResult, nextBeats] = await Promise.all([
    fetchProjectsHubData(profile.id),
    listInboxFiles(),
    fetchHomeNextBeats(profile.id),
  ]);
  const inboxFiles = inboxResult.ok ? inboxResult.files : [];

  return (
    <BuyerAppPage fullWidth className="!space-y-0 flex min-h-0 flex-1 flex-col">
      <Suspense fallback={null}>
        <ProjectsHubView
          drafts={drafts}
          published={published}
          inboxFiles={inboxFiles}
          nextBeats={nextBeats}
        />
      </Suspense>
    </BuyerAppPage>
  );
}
