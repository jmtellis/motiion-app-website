import { formatFeaturedPerformerMetaLine } from "@/lib/publicActivity";
import type { CreditChipItem } from "@/lib/profile/profile-credits";
import type { PublicTalentProfile } from "@/types/public";

export const TALENT_SPOTLIGHT_CREDIT_LIMIT = 5;

export type TalentSpotlightCredit = {
  id: string;
  title: string;
  imageUrl: string | null;
};

export type TalentSpotlightSocialKind = "instagram" | "youtube";

export type TalentSpotlightSocial = {
  kind: TalentSpotlightSocialKind;
  label: string;
  url: string;
};

export type TalentSpotlight = {
  headshotUrl: string | null;
  metaLine: string | null;
  profilePath: string;
  credits: TalentSpotlightCredit[];
  socials: TalentSpotlightSocial[];
};

function trim(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function normalizedUrl(raw: string | null | undefined): string | null {
  const value = trim(raw);
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/** Last path segment of a social URL, e.g. "@motiion" — falls back to the platform name. */
function socialLabel(url: string, fallback: string): string {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    const handle = segments.at(0);
    if (!handle) return fallback;
    return handle.startsWith("@") ? handle : `@${handle}`;
  } catch {
    return fallback;
  }
}

/**
 * Credits with artwork lead the row so the avatar strip reads as images rather than
 * initials; the remaining credits keep their profile order.
 */
function topCredits(credits: CreditChipItem[]): TalentSpotlightCredit[] {
  const seen = new Set<string>();
  const deduped: CreditChipItem[] = [];

  for (const credit of credits) {
    const title = trim(credit.title);
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(credit);
  }

  return [
    ...deduped.filter((credit) => trim(credit.imageUrl)),
    ...deduped.filter((credit) => !trim(credit.imageUrl)),
  ]
    .slice(0, TALENT_SPOTLIGHT_CREDIT_LIMIT)
    .map((credit) => ({
      id: credit.id,
      title: trim(credit.title),
      imageUrl: trim(credit.imageUrl) || null,
    }));
}

function socials(profile: PublicTalentProfile): TalentSpotlightSocial[] {
  const entries: { kind: TalentSpotlightSocialKind; fallback: string; raw: string | null }[] = [
    { kind: "instagram", fallback: "Instagram", raw: profile.instagram_url },
    { kind: "youtube", fallback: "YouTube", raw: profile.youtube_url },
  ];

  return entries.flatMap(({ kind, fallback, raw }) => {
    const url = normalizedUrl(raw);
    if (!url) return [];
    return [{ kind, label: socialLabel(url, fallback), url }];
  });
}

/** Trims a full public profile down to the fields the program cast modal renders. */
export function buildTalentSpotlight(profile: PublicTalentProfile): TalentSpotlight {
  const slug = trim(profile.username) || profile.id;

  return {
    headshotUrl: trim(profile.headshot_url) || trim(profile.headshot_urls?.[0]) || null,
    metaLine: formatFeaturedPerformerMetaLine(profile.talent_types, profile.representation),
    profilePath: `/profile/${encodeURIComponent(slug)}`,
    credits: topCredits([...profile.credits.artists, ...profile.credits.companies]),
    socials: socials(profile),
  };
}
