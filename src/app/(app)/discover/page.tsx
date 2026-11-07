import { DiscoverFeatured } from "@/components/app/DiscoverFeatured";
import { TalentDiscovery } from "@/components/app/TalentDiscovery";
import { DiscoverView } from "@/components/app/DiscoverView";
import { isCommunityAccount } from "@/lib/auth/profile";
import { requireCommunityOrTalentAccount } from "@/lib/auth/session";
import { loadDiscoverCanvas } from "@/lib/app/discover-canvas";
import { redirect } from "next/navigation";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireCommunityOrTalentAccount();
  const params = await searchParams;
  const canvas = await loadDiscoverCanvas(params, "/discover");
  if ("redirectTo" in canvas) redirect(canvas.redirectTo);
  const featured = !isCommunityAccount(profile.accountType);
  const view = typeof params.view === "string" ? params.view : undefined;
  const layout = typeof params.layout === "string" ? params.layout : undefined;
  const searching = Object.keys(params).some((key) => key !== "view" && key !== "layout");
  const listLayout = view === "browse" || layout === "list";
  const initialMode =
    view === "saved"
      ? "saved"
      : view === "explore" || view === "discover" || view === "browse" || searching || !featured
        ? "discover"
        : "featured";
  const initialLayout = listLayout ? "list" : "navigator";

  return (
    <TalentDiscovery
      key={profile.id}
      currentUserId={profile.id}
      initialMode={initialMode}
      initialLayout={initialLayout}
      collectionTitle={canvas.collectionTitle}
      initialData={canvas.initialData}
      keyword={canvas.filters.keyword ?? ""}
      credit={canvas.credit}
      recentlyViewed={canvas.recentlyViewed}
      featured={featured ? <DiscoverFeatured listings /> : undefined}
    >
      <DiscoverView filters={canvas.filters} result={canvas.result} credit={canvas.credit} />
    </TalentDiscovery>
  );
}
