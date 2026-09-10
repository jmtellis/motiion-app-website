import type { Metadata, Viewport } from "next";

import { JobJoinLandingClient } from "@/app/job/[token]/job-join-landing-client";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";
import { getIosAppStoreId } from "@/lib/referrals/app-store";
import { getProductionJobJoinCard } from "@/lib/publicJob";

type PageProps = {
  params: Promise<{ token: string }>;
};

export const viewport: Viewport = {
  themeColor: MARKETING_DARK.bg,
  colorScheme: "dark",
  viewportFit: "cover",
};

function normalizeJobToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token: rawToken } = await params;
  const token = normalizeJobToken(rawToken);
  const card = token ? await getProductionJobJoinCard(token) : null;
  const title = card?.title ? `Join ${card.title} on Motiion` : "Join a Job on Motiion";
  const description = card
    ? `${card.inviterName ?? "Someone"} invited you to ${card.title}. Sign up or open Motiion to accept.`
    : "Accept a Motiion job invite.";
  const pageUrl = `https://www.motiion.app/job/${encodeURIComponent(token || rawToken)}`;
  const appStoreId = getIosAppStoreId();

  return {
    title,
    description,
    metadataBase: new URL((process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "")),
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Motiion",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
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

export default async function JobJoinPage({ params }: PageProps) {
  const { token: rawToken } = await params;
  const token = normalizeJobToken(rawToken) || rawToken.trim();
  const card = token ? await getProductionJobJoinCard(token) : null;

  return <JobJoinLandingClient token={token} card={card} />;
}
