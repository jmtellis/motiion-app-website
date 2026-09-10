import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ActivityPageClient from "@/app/activity/[id]/activity-page-client";
import EventShowcasePageClient from "@/app/event/[id]/event-showcase-page-client";
import { resolveExternalTicketProvider } from "@/lib/external-ticket-provider";
import { activityKindLabel, fetchPublicActivity } from "@/lib/publicActivity";
import { getIosAppStoreId } from "@/lib/referrals/app-store";

type PageProps = {
  params: Promise<{ id: string }>;
};

function appleItunesMeta(): Metadata["other"] | undefined {
  const appStoreId = getIosAppStoreId();
  if (!appStoreId) return undefined;
  return { "apple-itunes-app": `app-id=${appStoreId}` };
}

export function createActivityRouteMetadata(pathPrefix: string) {
  return async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const activity = await fetchPublicActivity(id);
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");
    const pageUrl = `${siteUrl}${pathPrefix}/${encodeURIComponent(id)}`;

    const title = activity ? `${activity.title} · Motiion` : "Activity on Motiion";
    const description = activity
      ? activity.kind === "class"
        ? `${activityKindLabel(activity.kind)} on Motiion — view details and book online.`
        : activity.kind === "session"
          ? `${activityKindLabel(activity.kind)} on Motiion — view details and request to join in the app.`
          : `${activityKindLabel(activity.kind)} on Motiion — view details and book in the app.`
      : "View this activity on Motiion.";

    const itunes = appleItunesMeta();

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
      ...(itunes ? { other: itunes } : {}),
    };
  };
}

export function createActivityRoutePage(pathPrefix: string) {
  return async function ActivityRoutePage({ params }: PageProps) {
    const { id } = await params;
    const activity = await fetchPublicActivity(id);

    if (!activity) {
      notFound();
    }

    const sharePath = `${pathPrefix}/${encodeURIComponent(id)}`;
    const ticketProvider = resolveExternalTicketProvider(activity.externalTicketUrl);
    const ticketProviderName = ticketProvider?.displayName ?? null;
    const ticketProviderLogoUrl = ticketProvider?.logoURL ?? null;

    if (pathPrefix === "/event" || activity.kind === "event") {
      return (
        <EventShowcasePageClient
          activity={activity}
          sharePath={sharePath.startsWith("/event") ? sharePath : `/event/${encodeURIComponent(id)}`}
          ticketProviderName={ticketProviderName}
          ticketProviderLogoUrl={ticketProviderLogoUrl}
        />
      );
    }

    return (
      <ActivityPageClient
        activity={activity}
        sharePath={sharePath}
        ticketProviderName={ticketProviderName}
        ticketProviderLogoUrl={ticketProviderLogoUrl}
      />
    );
  };
}

/** @deprecated Use createActivityRoutePage(pathPrefix) so share links preserve semantic paths. */
export async function ActivityRoutePage({ params }: PageProps) {
  const { id } = await params;
  const activity = await fetchPublicActivity(id);

  if (!activity) {
    notFound();
  }

  const ticketProvider = resolveExternalTicketProvider(activity.externalTicketUrl);

  if (activity.kind === "event") {
    return (
      <EventShowcasePageClient
        activity={activity}
        sharePath={`/event/${encodeURIComponent(id)}`}
        ticketProviderName={ticketProvider?.displayName ?? null}
        ticketProviderLogoUrl={ticketProvider?.logoURL ?? null}
      />
    );
  }

  return (
    <ActivityPageClient
      activity={activity}
      sharePath={`/activity/${encodeURIComponent(id)}`}
      ticketProviderName={ticketProvider?.displayName ?? null}
      ticketProviderLogoUrl={ticketProvider?.logoURL ?? null}
    />
  );
}
