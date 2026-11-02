import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ProfilePageClient from "@/app/profile/[slug]/profile-page-client";
import {
  profileOgImageUrl,
} from "@/lib/profileOg";
import { fetchPublicTalentProfile } from "@/lib/publicProfile";
import { getIosAppStoreId } from "@/lib/referrals/app-store";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getProfileDestination, isOnboardingComplete } from "@/lib/auth/profile";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  let ogImage: string | undefined;
  try {
    ogImage = profileOgImageUrl(slug);
  } catch {
    // Missing env — still emit title/description.
  }
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");
  const pageUrl = `${siteUrl}/profile/${encodeURIComponent(slug)}`;

  const displayName =
    (await fetchPublicTalentProfile(slug))?.full_name ??
    null;
  const title = displayName ? `${displayName} on Motiion` : "Profile on Motiion";
  const description = displayName
    ? `View ${displayName}'s highlights, resume, and visuals on Motiion.`
    : "View this talent profile on Motiion.";

  const ogImages =
    ogImage !== undefined
      ? [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: displayName ? `${displayName} on Motiion` : "Motiion profile",
          },
        ]
      : undefined;

  const appStoreId = getIosAppStoreId();

  return {
    title: { absolute: title },
    description,
    metadataBase: new URL(siteUrl),
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Motiion",
      type: "profile",
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
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

export default async function ProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const [profile, viewerNavigation] = await Promise.all([
    fetchPublicTalentProfile(slug),
    getCurrentUserProfile().then((viewer) => viewer ? {
      href: getProfileDestination(viewer),
      label: isOnboardingComplete(viewer) ? "Back to workspace" : "Continue setup",
    } : null).catch(() => ({ href: "/home", label: "Open Motiion" })),
  ]);

  if (!profile) {
    notFound();
  }

  return <ProfilePageClient profile={profile} viewerNavigation={viewerNavigation} />;
}
