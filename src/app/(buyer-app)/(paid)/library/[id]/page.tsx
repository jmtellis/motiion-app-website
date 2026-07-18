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

  const [{ collection, error }, { talent: savedTalent }, { collections }, { shares }] = await Promise.all([
    getCollection(id),
    listSavedTalent(),
    listCollections(),
    listCollectionShares(),
  ]);

  if (error === "favorites") {
    redirect("/library?view=saved");
  }

  if (error === "Collection not found" || !collection) {
    notFound();
  }

  if (error) {
    return (
      <BuyerAppPage>
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Could not load collection: {error}
        </p>
      </BuyerAppPage>
    );
  }

  const collectionShares = shares.filter((share) => share.listId === collection.id);

  return (
    <BuyerAppPage fullWidth className="!space-y-0 flex min-h-0 flex-1 flex-col">
      <CollectionDetail
        collection={collection}
        savedTalent={savedTalent}
        allCollections={collections}
        shares={collectionShares}
      />
    </BuyerAppPage>
  );
}
