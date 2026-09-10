import type { Metadata, Viewport } from "next";

import { FeaturedInviteLandingClient } from "@/app/featured-invite/[token]/featured-invite-landing-client";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";
import { getIosAppStoreId } from "@/lib/referrals/app-store";
import { getFeaturedTalentInviteCard } from "@/lib/publicFeaturedTalentInvite.server";
import { normalizeFeaturedTalentInviteToken } from "@/lib/publicFeaturedTalentInvite";

type PageProps = {
  params: Promise<{ token: string }>;
};

export const viewport: Viewport = {
  themeColor: MARKETING_DARK.bg,
  colorScheme: "dark",
  viewportFit: "cover",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token: rawToken } = await params;
  const token = normalizeFeaturedTalentInviteToken(rawToken);
  const card = token ? await getFeaturedTalentInviteCard(token) : null;
  const title = card
    ? `Featured at ${card.eventTitle} on Motiion`
    : "Featured talent invite on Motiion";
  const description = card
    ? `${card.inviterName ?? "Someone"} invited ${card.displayName} to be featured at ${card.eventTitle}. Sign up or open Motiion to accept.`
    : "Accept a Motiion featured talent invite.";
  const pageUrl = `https://www.motiion.app/featured-invite/${encodeURIComponent(token || rawToken)}`;
  const appStoreId = getIosAppStoreId();

  return {
    title,
    description,
    metadataBase: new URL(
      (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, ""),
    ),
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

export default async function FeaturedInvitePage({ params }: PageProps) {
  const { token: rawToken } = await params;
  const token = normalizeFeaturedTalentInviteToken(rawToken) || rawToken.trim();
  const card = token ? await getFeaturedTalentInviteCard(token) : null;

  return <FeaturedInviteLandingClient token={token} card={card} />;
}
