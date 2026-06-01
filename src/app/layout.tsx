import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

/** Matches iOS `MotiionTypography` / Figma — Montserrat regular, medium, semibold. */
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Motiion — Search professional dance talent",
  description:
    "Search verified dance talent profiles, discover creatives and clients, and join the Motiion beta for modern casting workflows.",
  icons: {
    icon: "/motiion-icon.svg",
    shortcut: "/motiion-icon.svg",
    apple: "/motiion-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
