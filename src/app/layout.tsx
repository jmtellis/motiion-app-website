import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Inter, Montserrat } from "next/font/google";

import { ArrowNavigationFocusCleanup } from "@/components/layout/ArrowNavigationFocusCleanup";
import { AutoHideScrollbars } from "@/components/layout/AutoHideScrollbars";
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/marketing/site-seo";
import "./globals.css";

/** Product / design-system typography (docs/design.md) */
const geistSans = GeistSans;
const geistMono = GeistMono;

/** Marketing pages */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/** Signed-in product shell — matches iOS MotiionTypography (Montserrat). */
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
  title: {
    default: SITE_TITLE,
    template: "%s · Motiion",
  },
  description:
    SITE_DESCRIPTION,
  openGraph: {
    siteName: "Motiion",
    type: "website",
    url: SITE_URL,
    title: SITE_TITLE,
    description:
      SITE_DESCRIPTION,
    images: [{ url: "/motiion-share-preview.png", width: 1728, height: 1443, alt: "Motiion — dancers in motion", type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    images: [{ url: "/motiion-share-preview.png", alt: "Motiion — dancers in motion" }],
    title: SITE_TITLE,
    description:
      SITE_DESCRIPTION,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/motiion-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

const SUPABASE_ORIGIN = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : null;
  } catch {
    return null;
  }
})();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {SUPABASE_ORIGIN ? (
          <>
            <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={SUPABASE_ORIGIN} />
          </>
        ) : null}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${montserrat.variable} font-sans antialiased`}
      >
        <ArrowNavigationFocusCleanup />
        <AutoHideScrollbars />
        {children}
      </body>
    </html>
  );
}
