import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ProfilePageClient from "@/app/profile/[slug]/profile-page-client";
import {
  fetchPublicTalentName,
  normalizeUsernameSlug,
  profileOgImageUrl,
  PROFILE_SLUG_UUID_RE,
} from "@/lib/profileOg";
import { fetchPublicTalentProfile } from "@/lib/publicProfile";

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

  const displayName = await fetchPublicTalentName(slug);
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

  return {
    title,
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
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const profile = await fetchPublicTalentProfile(slug);

  if (!profile) {
    notFound();
  }

  return <ProfilePageClient profile={profile} />;
}
