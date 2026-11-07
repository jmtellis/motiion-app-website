import { DiscoverFeatured } from "@/components/app/DiscoverFeatured";
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
  const profile = await requireHiringAccount();
  const params = await searchParams;
  const canvas = await loadDiscoverCanvas(params, "/talent");
  if ("redirectTo" in canvas) redirect(canvas.redirectTo);

  const view = typeof params.view === "string" ? params.view : "";
  const layout = typeof params.layout === "string" ? params.layout : "";
  const searching = Object.keys(params).some((key) => key !== "view" && key !== "layout");
  const listLayout = view === "browse" || layout === "list";
  const initialMode =
    view === "discover" || view === "explore" || view === "browse" || searching
      ? "discover"
      : "featured";
  const initialLayout = listLayout ? "list" : "navigator";

  return (
    <div className="talent-navigator-route">
      <TalentDiscovery
        key={profile.id}
        currentUserId={profile.id}
        basePath="/talent"
        initialMode={initialMode}
        initialLayout={initialLayout}
        collectionTitle={canvas.collectionTitle}
        initialData={canvas.initialData}
        keyword={canvas.filters.keyword ?? ""}
        credit={canvas.credit}
        recentlyViewed={canvas.recentlyViewed}
        saved={null}
        featured={<DiscoverFeatured detailBasePath="/talent" from="talent" />}
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
