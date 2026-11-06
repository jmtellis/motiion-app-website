import { Suspense } from "react";

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
  const searching = Object.keys(params).some((key) => key !== "view");
  const initialMode =
    view === "explore" || view === "discover"
      ? "discover"
      : view === "saved"
        ? "saved"
        : view === "browse" || searching || !featured
          ? "browse"
          : "featured";

  return (
    <TalentDiscovery
      key={profile.id}
      currentUserId={profile.id}
      initialMode={initialMode}
      collectionTitle={canvas.collectionTitle}
      initialData={canvas.initialData}
      keyword={canvas.filters.keyword ?? ""}
      credit={canvas.credit}
      recentlyViewed={canvas.recentlyViewed}
      featured={
        featured ? (
          <Suspense fallback={<div className="talent-discovery-featured__loading" aria-busy="true" />}>
            <DiscoverFeatured listings />
          </Suspense>
        ) : undefined
      }
    >
      <DiscoverView filters={canvas.filters} result={canvas.result} credit={canvas.credit} />
    </TalentDiscovery>
  );
}
