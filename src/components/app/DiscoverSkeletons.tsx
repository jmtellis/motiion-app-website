/** Subtle Discover loading placeholders — match live layout so content can fade in cleanly. */

function Bone({ className = "" }: { className?: string }) {
  return <span className={`discover-skel ${className}`.trim()} aria-hidden />;
}

function SectionHeadingSkeleton() {
  return (
    <div className="talent-section-heading discover-skel-heading">
      <div>
        <Bone className="discover-skel--title" />
        <Bone className="discover-skel--subtitle" />
      </div>
    </div>
  );
}

/** Featured feed: community cards + cast/event rails. */
export function DiscoverFeaturedFeedSkeleton() {
  return (
    <div className="talent-home-discovery discover-skel-feed" aria-busy="true" aria-label="Loading featured">
      <section>
        <SectionHeadingSkeleton />
        <div className="talent-discovery-cards">
          {[0, 1, 2].map((index) => (
            <Bone key={index} className={`discover-skel--hero-card talent-discovery-card--${index}`} />
          ))}
        </div>
      </section>
      <section>
        <SectionHeadingSkeleton />
        <div className="talent-cast-rail" aria-hidden>
          {[0, 1, 2, 3].map((index) => (
            <span key={index} className="discover-skel-media-card">
              <Bone className="discover-skel--media" />
              <Bone className="discover-skel--line" />
              <Bone className="discover-skel--line discover-skel--line-short" />
            </span>
          ))}
        </div>
      </section>
      <section>
        <SectionHeadingSkeleton />
        <div className="talent-cast-rail" aria-hidden>
          {[0, 1, 2, 3].map((index) => (
            <span key={index} className="discover-skel-media-card">
              <Bone className="discover-skel--media" />
              <Bone className="discover-skel--line" />
              <Bone className="discover-skel--line discover-skel--line-short" />
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Classes & sessions grid under Featured. */
export function DiscoverListingsSkeleton() {
  return (
    <section className="discover-skel-listings" aria-busy="true" aria-label="Loading classes">
      <SectionHeadingSkeleton />
      <ul className="home-activity-grid">
        {[0, 1, 2, 3].map((index) => (
          <li key={index}>
            <span className="discover-skel-media-card discover-skel-media-card--activity">
              <Bone className="discover-skel--media discover-skel--media-square" />
              <Bone className="discover-skel--line" />
              <Bone className="discover-skel--line discover-skel--line-short" />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DiscoverFeaturedSkeleton() {
  return (
    <div className="talent-home talent-home--featured discover-skel-page">
      <DiscoverFeaturedFeedSkeleton />
      <DiscoverListingsSkeleton />
    </div>
  );
}

/** Browse / Saved portrait grid. */
export function DiscoverBrowseSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="discover-browse__grid discover-skel-grid" aria-busy="true" aria-label="Loading profiles">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="discover-browse-card discover-browse-card--loading">
          <span className="discover-browse-card__photo" />
          <span className="discover-browse-card__copy">
            <Bone className="discover-skel--line" />
            <Bone className="discover-skel--line discover-skel--line-short" />
          </span>
        </span>
      ))}
    </div>
  );
}

/** Side-panel cast / roster portraits while detail loads. */
export function DiscoverPanelPeopleSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="home-panel-people home-panel-people--portraits discover-skel-panel" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <span className="home-panel-skel">
            <span className="home-panel-skel__avatar" />
            <Bone className="discover-skel--line" />
            <Bone className="discover-skel--line discover-skel--line-short" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Soft navigator stage while canvas data settles. */
export function DiscoverNavigatorSkeleton() {
  return (
    <div className="discover-skel-navigator" aria-busy="true" aria-label="Loading explore">
      <div className="discover-skel-navigator__grid">
        {Array.from({ length: 9 }, (_, index) => (
          <Bone key={index} className="discover-skel--nav-card" />
        ))}
      </div>
    </div>
  );
}

/** Full Discover route placeholder while the server canvas loads. */
export function DiscoverPageSkeleton({ mode = "featured" }: { mode?: "featured" | "list" | "navigator" }) {
  const shell =
    mode === "list"
      ? "talent-discovery talent-discovery--discover talent-discovery--list"
      : mode === "navigator"
        ? "talent-discovery talent-discovery--discover"
        : "talent-discovery talent-discovery--featured";

  return (
    <div className={shell}>
      <div className="talent-discovery-results">
        {mode === "list" ? (
          <div className="discover-browse">
            <div className="discover-browse__toolbar">
              <div className="discover-browse__filters">
                <Bone className="discover-skel--chip" />
                <Bone className="discover-skel--chip" />
                <Bone className="discover-skel--chip" />
                <Bone className="discover-skel--search" />
              </div>
            </div>
            <DiscoverBrowseSkeleton />
          </div>
        ) : mode === "navigator" ? (
          <DiscoverNavigatorSkeleton />
        ) : (
          <DiscoverFeaturedSkeleton />
        )}
      </div>
    </div>
  );
}
