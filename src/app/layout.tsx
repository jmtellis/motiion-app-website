import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Montserrat } from "next/font/google";

import { ArrowNavigationFocusCleanup } from "@/components/layout/ArrowNavigationFocusCleanup";
import { AutoHideScrollbars } from "@/components/layout/AutoHideScrollbars";
import "./globals.css";

/** Product / design-system typography (docs/design.md) */
const geistSans = GeistSans;
const geistMono = GeistMono;

/** Marketing pages — Montserrat matches iOS Figma legacy */
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Motiion | Dance Industry Operating System",
    template: "%s · Motiion",
  },
  description:
    "Motiion is the professional platform connecting dancers, choreographers, agencies, casting teams, creative directors, and entertainment companies. Discover verified talent, manage projects and castings, build professional profiles, and create meaningful opportunities—all in one connected ecosystem.",
  openGraph: {
    siteName: "Motiion",
    type: "website",
    url: SITE_URL,
    title: "Motiion | Dance Industry Operating System",
    description:
      "Motiion is the professional platform connecting dancers, choreographers, agencies, casting teams, creative directors, and entertainment companies. Discover verified talent, manage projects and castings, build professional profiles, and create meaningful opportunities—all in one connected ecosystem.",
    images: [{ url: "/motiion-icon-512.png", width: 512, height: 512, alt: "Motiion" }],
  },
  twitter: {
    card: "summary",
    title: "Motiion | Dance Industry Operating System",
    description:
      "Motiion is the professional platform connecting dancers, choreographers, agencies, casting teams, creative directors, and entertainment companies. Discover verified talent, manage projects and castings, build professional profiles, and create meaningful opportunities—all in one connected ecosystem.",
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
      <body className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} font-sans antialiased`}>
        <ArrowNavigationFocusCleanup />
        <AutoHideScrollbars />
        {children}
      </body>
    </html>
  );
}
