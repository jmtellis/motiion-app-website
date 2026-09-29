import { TalentDiscovery } from "@/components/app/TalentDiscovery";
import { DiscoverView } from "@/components/app/DiscoverView";
import { requireTalentAccount } from "@/lib/auth/session";
import { loadDiscoverCanvas } from "@/lib/app/discover-canvas";
import { redirect } from "next/navigation";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireTalentAccount();
  const canvas = await loadDiscoverCanvas(await searchParams, "/discover");
  if ("redirectTo" in canvas) redirect(canvas.redirectTo);

  return (
    <TalentDiscovery
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
