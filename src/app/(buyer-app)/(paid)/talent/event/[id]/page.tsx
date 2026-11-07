import { notFound } from "next/navigation";

import { loadDiscoverEventActivity } from "@/app/(app)/home/actions";
import { DiscoverStudioEventView } from "@/components/app/DiscoverStudioEventView";
import { requireHiringAccount } from "@/lib/auth/session";
import { resolveDiscoverBackHref } from "@/lib/app/discover-paths";

export default async function TalentEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireHiringAccount();
  const { id } = await params;
  const query = await searchParams;
  const from = typeof query.from === "string" ? query.from : "talent";
  const { activity, error } = await loadDiscoverEventActivity(id);
  if (!activity) notFound();

  return (
    <div className="talent-navigator-route">
      {error ? (
        <div role="alert" className="ui-notice" data-tone="error">
          {error}
        </div>
      ) : null}
      <DiscoverStudioEventView
        activity={activity}
        backHref={resolveDiscoverBackHref(from, "/talent")}
        profileBasePath="/talent"
      />
    </div>
  );
}
