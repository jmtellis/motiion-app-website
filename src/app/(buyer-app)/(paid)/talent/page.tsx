import { DiscoverSaved } from "@/components/app/DiscoverSaved";
import { DiscoverView } from "@/components/app/DiscoverView";
import { TalentDiscovery } from "@/components/app/TalentDiscovery";
import { requireHiringAccount } from "@/lib/auth/session";
import { loadDiscoverCanvas } from "@/lib/app/discover-canvas";
import { redirect } from "next/navigation";

export default async function BuyerTalentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireHiringAccount();
  const params = await searchParams;
  const canvas = await loadDiscoverCanvas(params, "/talent");
  if ("redirectTo" in canvas) redirect(canvas.redirectTo);

  const view = typeof params.view === "string" ? params.view : "";
  const initialMode = view === "saved" ? "saved" : view === "discover" || view === "explore" ? "discover" : "browse";

  return (
    <div className="talent-navigator-route">
      <TalentDiscovery
        basePath="/talent"
        initialMode={initialMode}
        collectionTitle={canvas.collectionTitle}
        initialData={canvas.initialData}
        keyword={canvas.filters.keyword ?? ""}
        credit={canvas.credit}
        recentlyViewed={canvas.recentlyViewed}
        saved={<DiscoverSaved variant="rosters" />}
      >
        <DiscoverView
          basePath="/talent"
          filters={canvas.filters}
          result={canvas.result}
          credit={canvas.credit}
        />
      </TalentDiscovery>
    </div>
  );
}
