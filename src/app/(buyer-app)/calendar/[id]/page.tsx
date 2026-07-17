import { notFound } from "next/navigation";

import { getOrganizerPageData } from "@/app/(buyer-app)/calendar/organizer-actions";
import { OrganizerManageView } from "@/components/talent-buyers/activities/OrganizerManageView";
import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { BuyerPageChromeRegistrar } from "@/components/talent-buyers/dashboard/BuyerPageChromeRegistrar";
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
      <BuyerPageChromeRegistrar title={result.data.activity.title} />
      <OrganizerManageView
        activity={result.data.activity}
        attendees={result.data.attendees}
        revenue={result.data.revenue}
      />
    </BuyerAppPage>
  );
}
