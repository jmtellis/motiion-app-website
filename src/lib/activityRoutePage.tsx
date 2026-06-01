import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ActivityPageClient from "@/app/activity/[id]/activity-page-client";
import { activityKindLabel, fetchPublicActivity } from "@/lib/publicActivity";

type PageProps = {
  params: Promise<{ id: string }>;
};

export function createActivityRouteMetadata(pathPrefix: string) {
  return async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const activity = await fetchPublicActivity(id);
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");
    const pageUrl = `${siteUrl}${pathPrefix}/${encodeURIComponent(id)}`;

    const title = activity ? `${activity.title} · Motiion` : "Activity on Motiion";
    const description = activity
      ? `${activityKindLabel(activity.kind)} on Motiion — view details and book in the app.`
      : "View this activity on Motiion.";

    return {
      title,
      description,
      metadataBase: new URL(siteUrl),
      openGraph: {
        title,
        description,
        url: pageUrl,
        siteName: "Motiion",
        type: "website",
        ...(activity?.coverImageURL
          ? { images: [{ url: activity.coverImageURL, alt: activity.title }] }
          : {}),
      },
      twitter: {
        card: activity?.coverImageURL ? "summary_large_image" : "summary",
        title,
        description,
        ...(activity?.coverImageURL ? { images: [activity.coverImageURL] } : {}),
      },
    };
  };
}

export async function ActivityRoutePage({ params }: PageProps) {
  const { id } = await params;
  const activity = await fetchPublicActivity(id);

  if (!activity) {
    notFound();
  }

  return <ActivityPageClient activity={activity} />;
}
