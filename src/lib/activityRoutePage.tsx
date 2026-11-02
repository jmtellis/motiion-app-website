import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ActivityPageClient from "@/app/activity/[id]/activity-page-client";
import { ActivityShareLinkLanding } from "@/app/activity/[id]/activity-share-link-landing";
import EventShowcasePageClient from "@/app/event/[id]/event-showcase-page-client";
import {
  activityOgImageUrl,
  activityShareDescription,
  activityShareTitle,
  fetchActivitySharePreview,
  type ActivityShareKind,
} from "@/lib/activitySharePreview";
import { resolveExternalTicketProvider } from "@/lib/external-ticket-provider";
import { fetchPublicActivity } from "@/lib/catalog/fetch-public-activity";
import { activityKindLabel } from "@/lib/publicActivity";
import { getIosAppStoreId } from "@/lib/referrals/app-store";

type PageProps = {
  params: Promise<{ id: string }>;
};

function appleItunesMeta(): Metadata["other"] | undefined {
  const appStoreId = getIosAppStoreId();
  if (!appStoreId) return undefined;
  return { "apple-itunes-app": `app-id=${appStoreId}` };
}

function shareKindFromPath(pathPrefix: string): ActivityShareKind | null {
  if (pathPrefix === "/class") return "class";
  if (pathPrefix === "/session") return "session";
  if (pathPrefix === "/event") return "event";
  return null;
}

export function createActivityRouteMetadata(pathPrefix: string) {
  return async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const [activity, preview] = await Promise.all([
      fetchPublicActivity(id),
      fetchActivitySharePreview(id),
    ]);
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");
    const pageUrl = `${siteUrl}${pathPrefix}/${encodeURIComponent(id)}`;
    const kind = activity?.kind ?? preview?.kind ?? shareKindFromPath(pathPrefix);
    const name = activity?.title ?? preview?.title ?? null;
    const title = activityShareTitle(name, kind);
    const description = activity
      ? activity.kind === "class"
        ? `${activityKindLabel(activity.kind)} on Motiion — view details and book online.`
        : activity.kind === "session"
          ? `${activityKindLabel(activity.kind)} on Motiion — view details and request to join in the app.`
          : `${activityKindLabel(activity.kind)} on Motiion — view details and book in the app.`
      : activityShareDescription(name, kind);
    const ogImage = activityOgImageUrl(id);
    const itunes = appleItunesMeta();

    return {
      title: { absolute: title },
      description,
      metadataBase: new URL(siteUrl),
      openGraph: {
        title,
        description,
        url: pageUrl,
        siteName: "Motiion",
        type: "website",
        ...(ogImage
          ? {
              images: [
                {
                  url: ogImage,
                  width: 1200,
                  height: 630,
                  alt: title,
                },
              ],
            }
          : {}),
      },
      twitter: {
        card: ogImage ? "summary_large_image" : "summary",
        title,
        description,
        ...(ogImage ? { images: [ogImage] } : {}),
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
      const preview = await fetchActivitySharePreview(id);
      if (!preview) notFound();
      return <ActivityShareLinkLanding title={preview.title} kind={preview.kind} />;
    }

    const sharePath = `${pathPrefix}/${encodeURIComponent(id)}`;

    if (pathPrefix === "/event" || activity.kind === "event") {
      return (
        <EventShowcasePageClient
          activity={activity}
          sharePath={sharePath.startsWith("/event") ? sharePath : `/event/${encodeURIComponent(id)}`}
        />
      );
    }

    const ticketProvider = resolveExternalTicketProvider(activity.externalTicketUrl);
    const ticketProviderName = ticketProvider?.displayName ?? null;
    const ticketProviderLogoUrl = ticketProvider?.logoURL ?? null;

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

  if (activity.kind === "event") {
    return (
      <EventShowcasePageClient
        activity={activity}
        sharePath={`/event/${encodeURIComponent(id)}`}
      />
    );
  }

  const ticketProvider = resolveExternalTicketProvider(activity.externalTicketUrl);

  return (
    <ActivityPageClient
      activity={activity}
      sharePath={`/activity/${encodeURIComponent(id)}`}
      ticketProviderName={ticketProvider?.displayName ?? null}
      ticketProviderLogoUrl={ticketProvider?.logoURL ?? null}
    />
  );
}
