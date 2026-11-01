import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCastingAccess } from "@/app/casting/[id]/access";
import CastingPageClient from "@/app/casting/[id]/casting-page-client";
import { CastingPasswordGate } from "@/app/casting/[id]/casting-password-gate";
import { fetchPublicCasting } from "@/lib/publicCasting";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ role?: string }>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const casting = await fetchPublicCasting(id);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");
  const castingUrl = `${siteUrl}/casting/${encodeURIComponent(id)}`;

  const { role } = await searchParams;
  const selectedRole = casting?.roles.find((item) => item.id === (role ?? casting.selectedRoleId));
  const title = casting
    ? `Casting for ${casting.title}${selectedRole ? ` — ${selectedRole.title}` : ""} · Motiion`
    : "Casting on Motiion";
  const previewImage = casting?.coverImageURL || `${siteUrl}/casting-share-fallback.png`;
  const description = casting
    ? `${casting.production ? `${casting.production} — ` : ""}View this casting on Motiion and submit in the app.`
    : "View this casting on Motiion.";

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    openGraph: {
      title,
      description,
      url: selectedRole ? `${castingUrl}?role=${encodeURIComponent(selectedRole.id)}` : castingUrl,
      siteName: "Motiion",
      type: "website",
      images: [{ url: previewImage, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [previewImage],
    },
  };
}

export default async function CastingPage({ params }: PageProps) {
  const { id } = await params;
  const [casting, access] = await Promise.all([fetchPublicCasting(id), getCastingAccess(id)]);

  if (!casting) {
    notFound();
  }

  if (access.requiresPassword && !access.unlocked) {
    return <CastingPasswordGate roleId={id} title={casting.title} />;
  }

  return <CastingPageClient casting={casting} />;
}
