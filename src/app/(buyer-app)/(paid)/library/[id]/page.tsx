import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { CollectionDetail } from "@/components/talent-buyers/library/CollectionDetail";
import { listCollectionShares } from "@/lib/talent-buyers/collection-shares";
import { getCollection, listCollections, listSavedTalent } from "@/lib/talent-buyers/library";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerCollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireHiringAccount();
  const { id } = await params;

  const [{ collection, error }, savedResult, collectionsResult, sharesResult] = await Promise.all([
    getCollection(id),
    listSavedTalent(),
    listCollections(),
    listCollectionShares(),
  ]);

  if (error === "favorites") {
    redirect("/library/favorites");
  }

  if (error === "Collection not found") {
    notFound();
  }

  if (error || !collection) {
    return (
      <BuyerAppPage>
        <p className="ui-notice" data-tone="error" role="alert">
          Could not load roster: {error}
        </p>
        <Link href={`/library/${id}`} className="bd-btn-secondary">Try again</Link>
      </BuyerAppPage>
    );
  }

  const { talent: savedTalent } = savedResult;
  const { collections } = collectionsResult;
  const { shares } = sharesResult;
  const loadError = savedResult.error || collectionsResult.error || sharesResult.error;
  const collectionShares = shares.filter((share) => share.listId === collection.id);

  return (
    <BuyerAppPage fullWidth className="!space-y-0 flex min-h-0 flex-1 flex-col">
      <CollectionDetail
        collection={collection}
        loadError={loadError}
        savedTalent={savedTalent}
        allCollections={collections}
        shares={collectionShares}
      />
    </BuyerAppPage>
  );
}
