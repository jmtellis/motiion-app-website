import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { BuyerPageChromeRegistrar } from "@/components/talent-buyers/dashboard/BuyerPageChromeRegistrar";
import { LibraryPage } from "@/components/talent-buyers/library/LibraryPage";
import { listCollections, listSavedTalent } from "@/lib/talent-buyers/library";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerLibraryRoute({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireHiringAccount();
  const params = await searchParams;

  const [{ collections, error: collectionsError }, { talent, error: savedError }] = await Promise.all([
    listCollections(),
    listSavedTalent(),
  ]);

  const error = collectionsError || savedError;
  const initialView = params.view === "saved" ? "saved" : "collections";

  return (
    <BuyerAppPage fullWidth className="!space-y-0 flex min-h-0 flex-1 flex-col">
      <BuyerPageChromeRegistrar title="Library" />
      <LibraryPage
        collections={collections}
        savedTalent={talent}
        initialView={initialView}
        error={error}
      />
    </BuyerAppPage>
  );
}
