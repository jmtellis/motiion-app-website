import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ActivityPageClient from "@/app/activity/[id]/activity-page-client";
import { resolveExternalTicketProvider } from "@/lib/external-ticket-provider";
import { fetchPublicActivity } from "@/lib/catalog/fetch-public-activity";
import { activityKindLabel } from "@/lib/publicActivity";
import { activityViewerState } from "@/lib/app/activities";
import { fetchMemberActivity } from "@/lib/catalog/member-activity";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ register?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const activity = await fetchPublicActivity(id);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");
  const activityUrl = `${siteUrl}/activity/${encodeURIComponent(id)}`;

  const title = activity ? `${activity.title} · Motiion` : "Activity on Motiion";
  const description = activity
    ? `${activityKindLabel(activity.kind)} on Motiion — view details, save the date, and join.`
    : "View this activity on Motiion.";

  return {
    title: { absolute: title },
    description,
    metadataBase: new URL(siteUrl),
    openGraph: {
      title,
      description,
      url: activityUrl,
      siteName: "Motiion",
      type: "website",
      ...(activity?.coverImageURL
        ? {
            images: [
              {
                url: activity.coverImageURL,
                alt: activity.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: activity?.coverImageURL ? "summary_large_image" : "summary",
      title,
      description,
      ...(activity?.coverImageURL ? { images: [activity.coverImageURL] } : {}),
    },
  };
}

export default async function ActivityPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const activity = await fetchPublicActivity(id) ?? await fetchMemberActivity(id);

  if (!activity) {
    notFound();
  }

  const ticketProvider = resolveExternalTicketProvider(activity.externalTicketUrl);
  const viewer = await activityViewerState(id);

  return (
    <ActivityPageClient
      key={`${activity.id}:${viewer.accountId ?? "guest"}`}
      activity={activity}
      viewer={viewer}
      resumeRegistration={(await searchParams)?.register === "1"}
      sharePath={`/activity/${encodeURIComponent(id)}`}
      ticketProviderName={ticketProvider?.displayName ?? null}
      ticketProviderLogoUrl={ticketProvider?.logoURL ?? null}
    />
  );
}
