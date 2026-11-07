import { notFound } from "next/navigation";

import { DiscoverCollectionView } from "@/components/app/DiscoverCollectionView";
import { requireCommunityOrTalentAccount } from "@/lib/auth/session";
import {
  loadDiscoverCollection,
  resolveDiscoverBackHref,
} from "@/lib/app/discover-detail";

export default async function DiscoverCollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCommunityOrTalentAccount();
  const { id } = await params;
  const query = await searchParams;
  const from = typeof query.from === "string" ? query.from : undefined;
  const collection = await loadDiscoverCollection(id);
  if (!collection.id) notFound();

  return (
    <DiscoverCollectionView
      title={collection.title}
      subtitle={collection.eyebrow}
      people={collection.people}
      error={collection.error}
      backHref={resolveDiscoverBackHref(from, "/discover")}
      profileBasePath="/discover"
    />
  );
}
