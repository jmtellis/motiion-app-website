"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

import { ActivityCard } from "@/components/app/ActivityBrowser";
import type { PublicActivityItem } from "@/lib/app/home-opportunities";
import { ProductEmptyState } from "@/components/ui/EmptyState";

const PREVIEW_COUNT = 3;

export function HomeListings({
  activities,
  error,
  classesHref = "/discover/classes",
}: {
  activities: PublicActivityItem[];
  error?: string | null;
  /** Full classes browser route (defaults to Discover). */
  classesHref?: string;
}) {
  const router = useRouter();

  return (
    <section aria-labelledby="home-classes-title">
      <div className="talent-section-heading">
        <div>
          <h2 id="home-classes-title">Upcoming classes & sessions</h2>
          {activities.length ? (
            <p>Train, jam, and connect with the community.</p>
          ) : null}
        </div>
        {activities.length ? (
          <Link href={classesHref} className="home-view-all">
            View all
          </Link>
        ) : null}
      </div>
      {error ? (
        <div role="alert" className="ui-notice" data-tone="error">
          {error}{" "}
          <button type="button" className="underline" onClick={() => router.refresh()}>
            Retry
          </button>
        </div>
      ) : null}
      {activities.length ? (
        <ul className="home-activity-grid">
          {activities.slice(0, PREVIEW_COUNT).map((item) => (
            <li key={item.id}>
              <ActivityCard item={item} />
            </li>
          ))}
        </ul>
      ) : !error ? (
        <ProductEmptyState
          compact
          illustration="calendar"
          title="No upcoming classes or sessions"
          description="New classes and sessions from the community will show up here. Hosting one? Create a session from your calendar."
          actionLabel="Create a session"
          actionHref="/schedule"
        />
      ) : null}
    </section>
  );
}
