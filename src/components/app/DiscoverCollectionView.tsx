"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { discoverDetailHref } from "@/lib/app/discover-paths";

import type { HomeRosterPerson } from "@/app/(app)/home/actions";
import { DiscoverBackHeader } from "@/components/app/DiscoverBackHeader";
import { ProductEmptyState } from "@/components/ui/EmptyState";
/** Explore-list style roster for a Featured collection. */
export function DiscoverCollectionView({
  title,
  subtitle,
  people,
  error,
  backHref,
  profileBasePath = "/discover",
}: {
  title: string;
  subtitle?: string | null;
  people: HomeRosterPerson[];
  error?: string | null;
  backHref: string;
  profileBasePath?: "/discover" | "/talent";
}) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const from = `${pathname}${query ? `?${query}` : ""}`;

  return (
    <div className="discover-detail discover-detail--collection discover-skel-enter">
      <DiscoverBackHeader href={backHref} title={title} subtitle={subtitle} />

      {error ? (
        <div role="alert" className="ui-notice" data-tone="error">
          {error}
        </div>
      ) : null}

      {!error && people.length === 0 ? (
        <ProductEmptyState
          illustration="people"
          title="No one to show yet"
          description="This featured list is empty right now."
          actionLabel="Back"
          actionHref={backHref}
        />
      ) : null}

      {people.length ? (
        <div className="discover-browse__grid">
          {people.map((person) => (
            <Link
              key={person.id}
              href={discoverDetailHref(profileBasePath, "profile", person.slug || person.id, from)}
              className="discover-browse-card"
              aria-label={`Open ${person.name} profile`}
            >
              <span className="discover-browse-card__photo">
                {person.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={person.avatarUrl} alt="" loading="lazy" />
                ) : (
                  <span className="discover-browse-card__initial">{person.name.charAt(0)}</span>
                )}
              </span>
              <span className="discover-browse-card__copy">
                <strong>{person.name}</strong>
                <small>
                  <MapPin size={12} aria-hidden />
                  {person.location || "Location TBD"}
                </small>
              </span>
            </Link>
          ))}
        </div>
      ) : null}


    </div>
  );
}
