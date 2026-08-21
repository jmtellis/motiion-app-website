import type { Metadata } from "next";
import { notFound } from "next/navigation";

import EventProgramPageClient from "@/app/event/[id]/program/event-program-page-client";
import { eventProgramPath, fetchPublicActivity } from "@/lib/publicActivity";
import { getIosAppStoreId } from "@/lib/referrals/app-store";

type PageProps = {
  params: Promise<{ id: string }>;
};

const APP_CLIP_BUNDLE_ID = "com.jaymtellis.Motiion.Clip";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const activity = await fetchPublicActivity(id);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");
  const sharePath = eventProgramPath(id);
  const pageUrl = `${siteUrl}${sharePath}`;

  const title = activity ? `${activity.title} program · Motiion` : "Event program · Motiion";
  const description = activity
    ? `See featured talent at ${activity.title}. Powered by Motiion.`
    : "See featured talent at this Motiion event.";
  const image = activity?.coverImageURL ?? activity?.featuredTalent?.[0]?.headshotUrl ?? undefined;
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
      type: "website",
      ...(image ? { images: [{ url: image, alt: activity?.title ?? "Event program" }] } : {}),
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
            "apple-itunes-app": `app-id=${appStoreId}, app-clip-bundle-id=${APP_CLIP_BUNDLE_ID}, app-argument=${pageUrl}`,
          },
        }
      : {}),
  };
}

export default async function EventProgramPage({ params }: PageProps) {
  const { id } = await params;
  const activity = await fetchPublicActivity(id);
  if (!activity || activity.kind !== "event") {
    notFound();
  }

  return (
    <EventProgramPageClient activity={activity} sharePath={eventProgramPath(activity.id)} />
  );
}
