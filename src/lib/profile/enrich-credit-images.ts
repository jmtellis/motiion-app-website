import {
  hasBrandfetchClientId,
  searchBrandfetchCompanies,
} from "@/lib/clients/brandfetch-companies";
import { hasSpotifyCredentials, searchSpotifyArtists } from "@/lib/clients/spotify-artists";
import type { ProfileExperience } from "@/types/public";

import {
  applyCreditPageLayout,
  type CreditChipItem,
  type ProfileCreditPageLayout,
  type ProfileCredits,
} from "./profile-credits";
import {
  experienceDisplayImageURL,
  parseResumeExperienceCategory,
} from "./resume-experience";

const ENRICH_CONCURRENCY = 4;
const COMPANY_HINT =
  /\b(inc|llc|ltd|co|corp|company|studios?|pictures?|entertainment|records?|music|productions?|agency|network|tv|films?)\b/i;

function trim(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function normalizedKey(value: string): string {
  return value.trim().toLowerCase();
}

function looksLikePersonName(title: string): boolean {
  const cleaned = title.trim();
  if (!cleaned || COMPANY_HINT.test(cleaned)) return false;
  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.length >= 1 && words.length <= 4 && !cleaned.includes(".");
}

function chipPrefersArtist(chip: CreditChipItem): boolean {
  if (chip.id.startsWith("artists|")) return true;
  if (chip.id.startsWith("companies|") || chip.id.startsWith("projects|")) return false;
  if (chip.id.startsWith("livestage|") || chip.id.startsWith("layout|")) {
    return looksLikePersonName(chip.title);
  }
  return chip.fallbackCategory === "musicVideos" || chip.fallbackCategory === "liveStage";
}

function pickExactImage(
  query: string,
  results: Array<{ name: string; imageUrl?: string | null }>,
): string | null {
  const key = normalizedKey(query);
  if (!key) return null;
  const exact = results.find((item) => normalizedKey(item.name) === key);
  const candidate = exact ?? results[0];
  const url = candidate?.imageUrl?.trim();
  return url || null;
}

async function lookupArtistImage(name: string): Promise<string | null> {
  if (!hasSpotifyCredentials()) return null;
  try {
    const results = await searchSpotifyArtists(name, 5);
    return pickExactImage(name, results);
  } catch {
    return null;
  }
}

async function lookupCompanyImage(name: string): Promise<string | null> {
  if (!hasBrandfetchClientId()) return null;
  try {
    const results = await searchBrandfetchCompanies(name, 5);
    return pickExactImage(name, results);
  } catch {
    return null;
  }
}

async function lookupChipImage(chip: CreditChipItem): Promise<string | null> {
  const title = trim(chip.title);
  if (!title) return null;
  if (chipPrefersArtist(chip)) {
    return (await lookupArtistImage(title)) ?? (await lookupCompanyImage(title));
  }
  return (await lookupCompanyImage(title)) ?? (await lookupArtistImage(title));
}

async function mapPool<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  if (!items.length) return [];
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

/** Fill missing credit-rail thumbnails via Spotify (artists) + Brandfetch (companies). */
export async function enrichCreditChipImages(chips: CreditChipItem[]): Promise<CreditChipItem[]> {
  const missing = chips
    .map((chip, index) => ({ chip, index }))
    .filter(({ chip }) => !trim(chip.imageUrl));
  if (!missing.length) return chips;

  const urls = await mapPool(missing, ENRICH_CONCURRENCY, async ({ chip }) => lookupChipImage(chip));
  const next = chips.slice();
  missing.forEach(({ index }, i) => {
    const url = urls[i];
    if (!url) return;
    next[index] = { ...next[index]!, imageUrl: url };
  });
  return next;
}

function experienceLookupName(entry: ProfileExperience): { name: string; artist: boolean } | null {
  const category = parseResumeExperienceCategory(entry.category);
  if (!category) return null;

  if (category === "musicVideos") {
    const artist =
      trim(entry.song_artists?.[0]) ||
      trim(entry.main_talent) ||
      trim(entry.credits_display_name) ||
      trim(entry.credits);
    return artist ? { name: artist, artist: true } : null;
  }

  if (category === "liveStage") {
    const artist = trim(entry.main_talent) || trim(entry.song_artists?.[0]);
    if (artist) return { name: artist, artist: true };
    const credit = trim(entry.credits_display_name) || trim(entry.credits);
    if (credit) return { name: credit, artist: looksLikePersonName(credit) };
    return null;
  }

  if (category === "printCommercial" || category === "televisionFilm") {
    const company =
      trim(entry.credits_display_name) ||
      trim(entry.credits) ||
      trim(entry.production_company) ||
      trim(entry.title);
    return company ? { name: company, artist: false } : null;
  }

  return null;
}

/** Fill sparse resume row art so Brandfetch/Spotify show beside experience titles. */
export async function enrichExperienceImages(
  experiences: ProfileExperience[],
): Promise<ProfileExperience[]> {
  const missing = experiences
    .map((experience, index) => ({ experience, index }))
    .filter(({ experience }) => {
      const category = parseResumeExperienceCategory(experience.category) ?? "televisionFilm";
      return !experienceDisplayImageURL(experience, category);
    });
  if (!missing.length) return experiences;

  const urls = await mapPool(missing, ENRICH_CONCURRENCY, async ({ experience }) => {
    const target = experienceLookupName(experience);
    if (!target) return null;
    if (target.artist) {
      return (await lookupArtistImage(target.name)) ?? (await lookupCompanyImage(target.name));
    }
    return (await lookupCompanyImage(target.name)) ?? (await lookupArtistImage(target.name));
  });

  const next = experiences.slice();
  missing.forEach(({ experience, index }, i) => {
    const url = urls[i];
    if (!url) return;
    const category = parseResumeExperienceCategory(experience.category);
    if (category === "musicVideos" || (category === "liveStage" && looksLikePersonName(experienceLookupName(experience)?.name ?? ""))) {
      next[index] = {
        ...experience,
        main_talent_image_url: experience.main_talent_image_url || url,
        image_url: experience.image_url || url,
      };
      return;
    }
    next[index] = {
      ...experience,
      image_url: experience.image_url || url,
    };
  });
  return next;
}

/**
 * Server-side: enrich credit chips + experience thumbs, then stash chips as
 * `credits.artists` so client layout re-application keeps the resolved images.
 */
export async function enrichProfileCreditMedia(input: {
  experiences: ProfileExperience[];
  credits: ProfileCredits;
  layout: ProfileCreditPageLayout | null | undefined;
}): Promise<{ experiences: ProfileExperience[]; credits: ProfileCredits }> {
  const experiences = await enrichExperienceImages(input.experiences);
  const unordered = [...(input.credits.artists ?? []), ...(input.credits.companies ?? [])];
  // Re-apply layout against enriched experiences so layout-only chips can pick up new art.
  const laidOut = applyCreditPageLayout(unordered, experiences, input.layout);
  const enrichedChips = await enrichCreditChipImages(laidOut);

  return {
    experiences,
    credits: {
      artists: enrichedChips,
      companies: [],
    },
  };
}
