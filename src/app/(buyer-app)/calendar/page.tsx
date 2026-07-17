import { listHostedActivities } from "@/app/(buyer-app)/events/actions";
import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { BuyerPageChromeRegistrar } from "@/components/talent-buyers/dashboard/BuyerPageChromeRegistrar";
import { CreateActivityButton } from "@/components/talent-buyers/dashboard/CreateActivityButton";
import { EventsCalendar } from "@/components/talent-buyers/dashboard/calendar/EventsCalendar";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerCalendarPage() {
  await requireHiringAccount();
  const { calendarEvents } = await listHostedActivities();

  return (
    <BuyerAppPage fullWidth className="buyer-calendar-page !space-y-0 flex min-h-0 flex-1 flex-col">
      <BuyerPageChromeRegistrar
        title="Calendar"
        end={<CreateActivityButton triggerLabel="Create activity" showPlusIcon />}
      />

      <div className="bd-cal-workspace">
        <EventsCalendar events={calendarEvents} />
      </div>
    </BuyerAppPage>
  );
}
