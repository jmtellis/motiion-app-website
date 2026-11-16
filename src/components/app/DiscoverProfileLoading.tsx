"use client";

import { useSearchParams } from "next/navigation";
import { DiscoverBackHeader } from "@/components/app/DiscoverBackHeader";
import { resolveDiscoverBackHref } from "@/lib/app/discover-paths";
import "@/components/app/talent-profile/talent-profile.css";
import "@/app/profile/[slug]/public-profile.css";

/** Matches the full profile footprint while its authorized server read finishes. */
export function DiscoverProfileLoading({ basePath }: { basePath: "/talent" | "/discover" }) {
  const query = useSearchParams();
  const content = (
    <div className="discover-detail discover-detail--profile">
      <div className="public-profile-embedded">
        <div className="public-talent public-talent--embedded public-talent--loading">
          <DiscoverBackHeader href={resolveDiscoverBackHref(query.get("from") ?? undefined, basePath)} title="Profile" inlineBack />
          <div className="public-talent__layout talent-profile--loading" role="status" aria-label="Loading profile" aria-busy="true">
            <aside className="public-talent__sidebar" aria-hidden="true">
              <div className="talent-profile__hero talent-profile__bone" />
              <div className="talent-profile__actions">
                <span className="talent-profile__bone talent-profile__bone--action" />
                <span className="talent-profile__bone talent-profile__bone--action" />
                <span className="talent-profile__bone talent-profile__bone--message" />
                <span className="talent-profile__bone talent-profile__bone--action" />
              </div>
            </aside>
            <div className="public-talent__scroll" aria-hidden="true">
              <span className="talent-profile__bone" style={{ width: "30%", height: 14 }} />
              <div className="talent-profile__loading-credits">{[0, 1, 2].map(index => <span key={index} className="talent-profile__bone" />)}</div>
              {[0, 1, 2, 3].map(index => <span key={index} className="talent-profile__bone" style={{ width: "100%", height: 52 }} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  return basePath === "/talent" ? <div className="talent-navigator-route">{content}</div> : content;
}
