import { ActivityBrowser } from "@/components/app/ActivityBrowser";
import { DiscoverBackHeader } from "@/components/app/DiscoverBackHeader";
import { requireCommunityOrTalentAccount } from "@/lib/auth/session";
import { fetchUpcomingClassesAndSessions } from "@/lib/app/home-opportunities";
import { resolveDiscoverBackHref } from "@/lib/app/discover-paths";
import { ProductEmptyState } from "@/components/ui/EmptyState";

export default async function DiscoverClassesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCommunityOrTalentAccount();
  const query = await searchParams;
  const from = typeof query.from === "string" ? query.from : undefined;
  const backHref = resolveDiscoverBackHref(from, "/discover");
  const { activities, error } = await fetchUpcomingClassesAndSessions();

  return (
    <div className="discover-detail discover-detail--classes discover-skel-enter">
      <DiscoverBackHeader
        href={backHref}
        title="Classes & sessions"
        subtitle="Train, jam, and connect with the community."
      />
      {error ? (
        <div role="alert" className="ui-notice" data-tone="error">
          {error}
        </div>
      ) : null}
      {activities.length ? (
        <ActivityBrowser items={activities} />
      ) : !error ? (
        <ProductEmptyState
          illustration="calendar"
          title="No upcoming classes or sessions"
          description="New classes and sessions from the community will show up here."
          actionLabel="Back"
          actionHref={backHref}
        />
      ) : null}
    </div>
  );
}
