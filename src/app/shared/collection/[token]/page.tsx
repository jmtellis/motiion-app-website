import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicCollectionShare } from "@/lib/talent-buyers/collection-shares";
import { collectionShareDurationLabel } from "@/lib/talent-buyers/collection-share-types";

import "@/components/talent-buyers/library/library.css";

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const { share } = await getPublicCollectionShare(token);
  const title = share ? `${share.title} · Motiion` : "Shared collection · Motiion";
  const description = share
    ? `Review ${share.members.length} talent from a shared Motiion collection.`
    : "Review a shared Motiion talent collection.";

  return { title, description };
}

export default async function SharedCollectionPage({ params }: PageProps) {
  const { token } = await params;
  const { share, error } = await getPublicCollectionShare(token);

  if (!share) {
    if (error === "Link not found" || error === "Invalid link") notFound();
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16 text-white">
        <h1 className="text-2xl font-semibold">Collection unavailable</h1>
        <p className="mt-2 text-sm text-white/55">{error ?? "This shared collection could not be loaded."}</p>
      </main>
    );
  }

  const duration = collectionShareDurationLabel(share.expirationKind, share.expiresAt);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/35">Shared collection</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{share.title}</h1>
        <p className="mt-2 text-sm text-white/45">
          {share.members.length === 1 ? "1 person" : `${share.members.length} people`} · {duration}
        </p>

        {share.members.length ? (
          <div className="library-talent-grid mt-8">
            {share.members.map((person, index) => {
              const href = person.slug ? `/talent/${person.slug}` : null;
              const card = (
                <article className="library-talent-card">
                  <div className="library-talent-card__media">
                    {person.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={person.avatarUrl} alt="" />
                    ) : (
                      <div className="library-talent-card__fallback">
                        {person.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="library-talent-card__meta">
                    <p className="library-talent-card__name">{person.name}</p>
                    <p className="library-talent-card__sub">{person.location || "Location unavailable"}</p>
                  </div>
                </article>
              );

              return href ? (
                <Link key={`${person.slug}-${index}`} href={href} className="contents">
                  {card}
                </Link>
              ) : (
                <div key={`${person.name}-${index}`}>{card}</div>
              );
            })}
          </div>
        ) : (
          <p className="mt-10 text-sm text-white/45">This collection doesn&apos;t have anyone in it yet.</p>
        )}
      </div>
    </main>
  );
}
