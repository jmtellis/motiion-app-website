import { listHostedActivities } from "@/app/(buyer-app)/(paid)/events/actions";
import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { EventsHubPage } from "@/components/talent-buyers/dashboard/EventsHubPage";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerEventsPage() {
  await requireHiringAccount();
  const { calendarEvents } = await listHostedActivities();

  return (
    <BuyerAppPage fullWidth className="buyer-calendar-page !space-y-0 flex min-h-0 flex-1 flex-col">
      <EventsHubPage calendarEvents={calendarEvents} />
    </BuyerAppPage>
  );
}
