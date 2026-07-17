import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { BuyerPageChromeRegistrar } from "@/components/talent-buyers/dashboard/BuyerPageChromeRegistrar";
import { LibraryPage } from "@/components/talent-buyers/library/LibraryPage";
import { PaywallCard } from "@/components/talent-buyers/PaywallCard";
import { isIndustryLocked } from "@/lib/billing/gate";
import { listCollections, listSavedTalent } from "@/lib/talent-buyers/library";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerLibraryRoute({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const profile = await requireHiringAccount();
  const params = await searchParams;

  if (await isIndustryLocked(profile.id)) {
    return (
      <BuyerAppPage>
        <PaywallCard feature="Collections and the talent library" />
      </BuyerAppPage>
    );
  }

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
