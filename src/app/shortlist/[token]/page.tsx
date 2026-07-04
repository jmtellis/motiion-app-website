import type { Metadata } from "next";

import ShortlistReviewClient from "@/app/shortlist/[token]/shortlist-review-client";
import { fetchPublicShortlist } from "@/lib/publicShortlist";

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");

  try {
    const payload = await fetchPublicShortlist(token);
    const title = `${payload.share.roleTitle} shortlist · Motiion`;
    const description = `Review talent for ${payload.share.projectTitle} — ${payload.share.roleTitle}. Vote on the web, no app required.`;
    const headshot = payload.submissions[0]?.headshotUrl ?? payload.submissions[0]?.headshotUrls?.[0] ?? null;

    return {
      title,
      description,
      metadataBase: new URL(siteUrl),
      openGraph: {
        title,
        description,
        url: `${siteUrl}/shortlist/${encodeURIComponent(token)}`,
        siteName: "Motiion",
        type: "website",
        ...(headshot ? { images: [{ url: headshot, alt: payload.share.roleTitle }] } : {}),
      },
      twitter: {
        card: headshot ? "summary_large_image" : "summary",
        title,
        description,
        ...(headshot ? { images: [headshot] } : {}),
      },
    };
  } catch {
    return {
      title: "Shortlist review · Motiion",
      description: "Review talent on a shared Motiion shortlist.",
      metadataBase: new URL(siteUrl),
    };
  }
}

export default async function ShortlistPage({ params }: PageProps) {
  const { token } = await params;
  return <ShortlistReviewClient token={token} />;
}
