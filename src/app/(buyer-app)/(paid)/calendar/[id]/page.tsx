import { notFound } from "next/navigation";

import { getOrganizerPageData } from "@/app/(buyer-app)/(paid)/calendar/organizer-actions";
import { OrganizerManageView } from "@/components/talent-buyers/activities/OrganizerManageView";
import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function CalendarActivityManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireHiringAccount();
  const { id } = await params;
  const result = await getOrganizerPageData(id);

  if (!result.ok || !result.data) {
    notFound();
  }

  return (
    <BuyerAppPage>
      <OrganizerManageView
        activity={result.data.activity}
        attendees={result.data.attendees}
        revenue={result.data.revenue}
        subgroups={result.data.subgroups}
        promos={result.data.promos}
        featuredTalent={result.data.featuredTalent}
      />
    </BuyerAppPage>
  );
}
