import type { Metadata, Viewport } from "next";

import { JoinLandingClient } from "@/app/join/[code]/join-landing-client";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";
import { getIosAppStoreId } from "@/lib/referrals/app-store";
import { joinPageUrl, normalizeJoinReferralCode } from "@/lib/referrals/code";
import { resolvePublicReferrer } from "@/lib/referrals/resolve-referrer";

type PageProps = {
  params: Promise<{ code: string }>;
};

export const viewport: Viewport = {
  themeColor: MARKETING_DARK.bg,
  colorScheme: "dark",
  viewportFit: "cover",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = normalizeJoinReferralCode(rawCode);
  const referrer = code ? await resolvePublicReferrer(code) : null;
  const pageUrl = joinPageUrl(code || rawCode);
  const title = referrer
    ? `${referrer.displayName} invited you to Motiion`
    : "Join Motiion";
  const description = referrer
    ? `${referrer.displayName} wants you on Motiion. Download the iOS app and use referral code ${code}.`
    : `Download Motiion and use referral code ${code || rawCode} when you sign up.`;
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

export default async function JoinPage({ params }: PageProps) {
  const { code: rawCode } = await params;
  const code = normalizeJoinReferralCode(rawCode) || rawCode.trim();
  const referrer = code ? await resolvePublicReferrer(code) : null;

  return <JoinLandingClient code={code} referrer={referrer} />;
}
