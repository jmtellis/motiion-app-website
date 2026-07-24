import {
  listHostedActivities,
  listOpenExploreActivities,
} from "@/app/(buyer-app)/(paid)/events/actions";
import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { EventsHubPage } from "@/components/talent-buyers/dashboard/EventsHubPage";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireHiringAccount();
  const params = await searchParams;
  const [{ upcoming, past, calendarEvents }, { items: exploreItems, viewerCity }] =
    await Promise.all([listHostedActivities(), listOpenExploreActivities()]);

  const initialMode =
    params.view === "schedule" || params.view === "plan"
      ? "schedule"
      : params.view === "manage"
        ? "manage"
        : "explore";

  return (
    <BuyerAppPage fullWidth className="buyer-calendar-page !space-y-0 flex min-h-0 flex-1 flex-col">
      <EventsHubPage
        upcoming={upcoming}
        past={past}
        calendarEvents={calendarEvents}
        exploreItems={exploreItems}
        viewerCity={viewerCity}
        initialMode={initialMode}
      />
    </BuyerAppPage>
  );
}
