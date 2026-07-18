import { notFound } from "next/navigation";

import { fetchConnectAccountStatus } from "@/app/(buyer-app)/(paid)/calendar/connect-actions";
import { getActivityDraftForEdit } from "@/app/(buyer-app)/(paid)/events/actions";
import { ActivityCreateWizard } from "@/components/talent-buyers/activities/ActivityCreateWizard";
import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function CalendarEditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireHiringAccount();
  const { id } = await params;
  const [draftResult, connect] = await Promise.all([
    getActivityDraftForEdit(id),
    fetchConnectAccountStatus(),
  ]);

  if (!draftResult.ok || !draftResult.draft) {
    notFound();
  }

  return (
    <BuyerAppPage fullWidth className="!space-y-0 flex min-h-0 flex-1 flex-col">
      <ActivityCreateWizard
        initialDraft={draftResult.draft}
        mode="edit"
        activityId={id}
        initialConnectStatus={connect.status ?? null}
        closeHref={`/calendar/${id}`}
      />
    </BuyerAppPage>
  );
}
