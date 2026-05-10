import type { Metadata } from "next";
import {
  fetchPublicTalentName,
  normalizeUsernameSlug,
  profileOgImageUrl,
  PROFILE_SLUG_UUID_RE,
} from "@/lib/profileOg";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  let ogImage: string | undefined;
  try {
    ogImage = profileOgImageUrl(slug);
  } catch {
    // Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_PROFILE_OG_BASE_URL — still emit title/description.
  }
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");
  const pageUrl = `${siteUrl}/profile/${encodeURIComponent(slug)}`;

  const displayName = await fetchPublicTalentName(slug);
  const title = displayName ? `View ${displayName} on Motiion` : "View profile on Motiion";
  const description = displayName
    ? `Open ${displayName}'s profile in the Motiion app.`
    : "Open this profile in the Motiion app.";

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

export default async function ProfileLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug).trim();
  const isUuid = PROFILE_SLUG_UUID_RE.test(decoded);
  const label = isUuid ? "profile" : normalizeUsernameSlug(decoded) || decoded;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        gap: "1rem",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Motiion</h1>
      <p style={{ margin: 0, opacity: 0.85, maxWidth: 420, lineHeight: 1.5 }}>
        This link opens in the Motiion app when it’s installed. If you already have the app, tap Open
        from the share sheet or return to Messages and tap the link again.
      </p>
      <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.6 }}>@{label}</p>
      <a
        href="https://www.motiion.app"
        style={{
          marginTop: "0.5rem",
          color: "#93c5fd",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        www.motiion.app
      </a>
    </main>
  );
}
