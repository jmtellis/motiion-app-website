import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  const { role } = await searchParams;
  const casting = await fetchPublicCasting(role ?? id);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");
  const castingUrl = `${siteUrl}/casting/${encodeURIComponent(id)}`;

  const selectedRole = casting?.roles.find((item) => item.id === (role ?? casting.selectedRoleId));
  const title = casting
    ? `Casting for ${casting.title}${selectedRole ? ` — ${selectedRole.title}` : ""} · Motiion`
    : "Casting on Motiion";
  const previewImage = casting?.coverImageURL || `${siteUrl}/casting-share-logo-v2.png`;
  const description = casting
    ? `${casting.production ? `${casting.production} — ` : ""}View this casting on Motiion and submit in the app.`
    : "View this casting on Motiion.";

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    robots: { index: false, follow: false },
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

export default async function CastingPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { role } = await searchParams;
  const lookupId = role ?? id;
  const client = await createServerSupabaseClient();
  const session = client ? await client.auth.getSession() : null;
  const [casting, access] = await Promise.all([fetchPublicCasting(lookupId, session?.data.session?.access_token), getCastingAccess(lookupId)]);

  if (!casting) {
    return <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Casting unavailable</h1>
      <p className="mt-4">This role may require an invitation. Sign in with the account that received it, or ask the organizer for access.</p>
      <a className="mt-6 inline-block underline" href={`/login?next=${encodeURIComponent(`/casting/${lookupId}`)}`}>Sign in</a>
    </main>;
  }

  if (access.requiresPassword && !access.unlocked) {
    return <CastingPasswordGate roleId={lookupId} title={casting.title} />;
  }

  return <CastingPageClient casting={casting} />;
}
