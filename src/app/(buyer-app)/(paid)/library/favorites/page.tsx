import Link from "next/link";

import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { IndustryPageHeader } from "@/components/talent-buyers/dashboard/IndustryUI";
import { SavedTalentView } from "@/components/talent-buyers/library/SavedTalentView";
import { listCollections, listSavedTalent } from "@/lib/talent-buyers/library";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerFavoritesPage() {
  const profile = await requireHiringAccount();
  const [savedResult, collectionsResult] = await Promise.all([listSavedTalent(), listCollections()]);
  const error = savedResult.error || collectionsResult.error;

  return (
    <BuyerAppPage fullWidth className="!space-y-0 flex min-h-0 flex-1 flex-col">
      <div className="library-page">
        <div className="library-page__shell">
          <div className="library-page__main">
            <IndustryPageHeader
              eyebrow="Roster"
              title="Favorites"
              description="Everyone you’ve saved while browsing and discovering."
              actions={<Link href="/library" className="bd-btn-secondary">All rosters</Link>}
            />
            {error ? (
              <p className="ui-notice" data-tone="error" role="alert">
                Could not load favorites: {error}
              </p>
            ) : null}
            <SavedTalentView
              key={profile.id}
              talent={savedResult.talent}
              collections={collectionsResult.collections}
              discoverHref="/talent?view=browse"
            />
          </div>
        </div>
      </div>
    </BuyerAppPage>
  );
}
