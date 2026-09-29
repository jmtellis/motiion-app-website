import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { EventsHubPage } from "@/components/talent-buyers/dashboard/EventsHubPage";
import { requireHiringAccount } from "@/lib/auth/session";
import { fetchScheduleMarkers } from "@/lib/talent-buyers/schedule-markers-server";

export default async function BuyerSchedulePage() {
  const profile = await requireHiringAccount();
  const markers = await fetchScheduleMarkers(profile.id);

  return (
    <BuyerAppPage fullWidth className="buyer-calendar-page !space-y-0 flex min-h-0 flex-1 flex-col">
      <EventsHubPage markers={markers} />
    </BuyerAppPage>
  );
}
