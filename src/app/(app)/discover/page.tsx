import { TalentDiscovery } from "@/components/app/TalentDiscovery";
import { DiscoverView } from "@/components/app/DiscoverView";
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

  return (
    <TalentDiscovery
      key={profile.id}
      currentUserId={profile.id}
      initialMode={params.view === "explore" || params.view === "discover" ? "discover" : params.view === "saved" ? "saved" : "browse"}
      collectionTitle={canvas.collectionTitle}
      initialData={canvas.initialData}
      keyword={canvas.filters.keyword ?? ""}
      credit={canvas.credit}
      recentlyViewed={canvas.recentlyViewed}
    >
      <DiscoverView filters={canvas.filters} result={canvas.result} credit={canvas.credit} />
    </TalentDiscovery>
  );
}
