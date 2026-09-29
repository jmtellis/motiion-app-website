import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { LibraryPage } from "@/components/talent-buyers/library/LibraryPage";
import { listCollections } from "@/lib/talent-buyers/library";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerLibraryRoute() {
  await requireHiringAccount();

  const { collections, error } = await listCollections();

  return (
    <BuyerAppPage fullWidth className="!space-y-0 flex min-h-0 flex-1 flex-col">
      <LibraryPage collections={collections} error={error} />
    </BuyerAppPage>
  );
}
