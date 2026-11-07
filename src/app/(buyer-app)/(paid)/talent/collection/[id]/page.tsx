import { notFound } from "next/navigation";

import { DiscoverCollectionView } from "@/components/app/DiscoverCollectionView";
import { requireHiringAccount } from "@/lib/auth/session";
import {
  loadDiscoverCollection,
  resolveDiscoverBackHref,
} from "@/lib/app/discover-detail";

export default async function TalentCollectionPage({
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
  const collection = await loadDiscoverCollection(id);
  if (!collection.id) notFound();

  return (
    <div className="talent-navigator-route">
      <DiscoverCollectionView
        title={collection.title}
        subtitle={collection.eyebrow}
        people={collection.people}
        error={collection.error}
        backHref={resolveDiscoverBackHref(from, "/talent")}
        profileBasePath="/talent"
      />
    </div>
  );
}
