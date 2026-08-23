import type { Metadata } from "next";

import { fetchPublicActivity } from "@/lib/publicActivity";
import { getIosAppStoreId } from "@/lib/referrals/app-store";

/** Web-only share path — not registered in AASA appclips/universal links. */
export function eventProgramWebSharePath(eventId: string): string {
  return `/program/${encodeURIComponent(eventId)}`;
}

export async function buildEventProgramMetadata(
  eventId: string,
  sharePath: string,
): Promise<Metadata> {
  const activity = await fetchPublicActivity(eventId);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");
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
            "apple-itunes-app": `app-id=${appStoreId}`,
          },
        }
      : {}),
  };
}
