import { Suspense } from "react";

import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { ProjectsHubView } from "@/components/talent-buyers/dashboard/ProjectsHubView";
import { listInboxFiles } from "@/app/(buyer-app)/(paid)/projects/buyer-file-inbox-actions";
import { fetchProjectsHubData } from "@/lib/talent-buyers/projects-hub";
import { upcomingBeatsByWork } from "@/lib/talent-buyers/schedule-markers";
import { fetchScheduleMarkers } from "@/lib/talent-buyers/schedule-markers-server";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerProjectsPage() {
  const profile = await requireHiringAccount();
  const [{ drafts, published }, inboxResult, markers] = await Promise.all([
    fetchProjectsHubData(profile.id),
    listInboxFiles(),
    fetchScheduleMarkers(profile.id),
  ]);
  const inboxFiles = inboxResult.ok ? inboxResult.files : [];
  // A day of slack: the server's UTC date can run ahead of the viewer's; the client picks the real next beat.
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const nextBeats = Object.fromEntries(upcomingBeatsByWork(markers, yesterday));

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
