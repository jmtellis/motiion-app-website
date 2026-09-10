import type { Metadata } from "next";
import { notFound } from "next/navigation";

import FeaturedTalentPageClient from "@/app/event/[id]/featured/[talentId]/featured-talent-page-client";
import {
  featuredTalentPath,
  fetchPublicActivity,
  findFeaturedTalent,
} from "@/lib/publicActivity";
import { getIosAppStoreId } from "@/lib/referrals/app-store";

type PageProps = {
  params: Promise<{ id: string; talentId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, talentId } = await params;
  const activity = await fetchPublicActivity(id);
  const talent = activity ? findFeaturedTalent(activity, talentId) : null;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");
  const sharePath = featuredTalentPath(id, talent?.userId ?? talentId);
  const pageUrl = `${siteUrl}${sharePath}`;

  const name = talent?.displayName ?? "Featured talent";
  const eventTitle = activity?.title ?? "Motiion event";
  const title = `${name} at ${eventTitle} · Motiion`;
  const description = `${name} is featured at ${eventTitle} on Motiion. View their showcase and download the app for the full experience.`;
  const image = talent?.headshotUrl ?? activity?.coverImageURL ?? undefined;
  const appStoreId = getIosAppStoreId();

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Motiion",
      type: "profile",
      ...(image ? { images: [{ url: image, alt: name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    ...(appStoreId
      ? {
          other: {
            "apple-itunes-app": `app-id=${appStoreId}`,
          },
        }
      : {}),
  };
}

export default async function FeaturedTalentPage({ params }: PageProps) {
  const { id, talentId } = await params;
  const activity = await fetchPublicActivity(id);
  if (!activity || activity.kind !== "event") {
    notFound();
  }

  const talent = findFeaturedTalent(activity, talentId);
  if (!talent) {
    notFound();
  }

  const sharePath = featuredTalentPath(activity.id, talent.userId);

  return (
    <FeaturedTalentPageClient activity={activity} talent={talent} sharePath={sharePath} />
  );
}
