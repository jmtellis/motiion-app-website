import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");
  const activityUrl = `${siteUrl}/activity/${encodeURIComponent(id)}`;
  const title = "Open activity on Motiion";
  const description = "Open this activity in the Motiion app.";

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    openGraph: {
      title,
      description,
      url: activityUrl,
      siteName: "Motiion",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function ActivityLandingPage({ params }: PageProps) {
  const { id } = await params;
  const decoded = decodeURIComponent(id).trim();

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
        This activity link opens in the Motiion app when it’s installed. If you already have the
        app, tap Open from the share sheet or return to Messages and tap the link again.
      </p>
      <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.6 }}>{decoded}</p>
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
