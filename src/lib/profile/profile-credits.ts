import type { ProfileExperience } from "@/types/public";

import { resolveBrandfetchLogoURL } from "./brandfetch-logo";
import {
  experienceDisplayImageURL,
  parseResumeExperienceCategory,
  type ResumeExperienceCategory,
} from "./resume-experience";

export type CreditChipSection = "artists" | "companies" | "projects" | "livestage";

export type CreditChipItem = {
  id: string;
  title: string;
  imageUrl: string | null;
  fallbackCategory: ResumeExperienceCategory;
};

export type ProfileCredits = {
  artists: CreditChipItem[];
  companies: CreditChipItem[];
};

/** Saved public Credits rail order from the talent profile (`credit_page_layout`). */
export type ProfileCreditPageLayout = {
  visible_keys: string[];
  hidden_keys: string[];
};

const COLLAPSED_CHIP_LIMIT = 6;

export { COLLAPSED_CHIP_LIMIT };

type PublicCreditKind = "mainTalent" | "studioOrCompany" | "tmdbProject";

function trim(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function normalizedCreditKey(raw: string | null | undefined): string {
  return trim(raw).toLowerCase();
}

function appendUniqueCredit(
  rawValue: string | null | undefined,
  values: string[],
  seen: Set<string>,
): void {
  const trimmed = trim(rawValue);
  if (!trimmed) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  values.push(trimmed);
}

/** Prefer a clean artist name; strip `"Song" | …` noise from messy credit lines. */
function cleanArtistName(raw: string | null | undefined): string | null {
  const value = trim(raw);
  if (!value) return null;
  if (!/["“|]/.test(value)) return value.length <= 64 ? value : value.slice(0, 64).trim();
  const beforeQuote = value.split(/["“]/)[0]?.trim() ?? "";
  if (beforeQuote && beforeQuote.length <= 48) return beforeQuote;
  const beforePipe = value.split("|")[0]?.trim() ?? "";
  if (beforePipe && beforePipe.length <= 48) return beforePipe;
  return value.length <= 48 ? value : null;
}

/** Same defaults as iOS `ExperienceEntry.resolvedPublicCreditKind`. */
function resolvedPublicCreditKind(entry: ProfileExperience): PublicCreditKind {
  if (entry.public_credit_kind === "mainTalent" || entry.public_credit_kind === "studioOrCompany" || entry.public_credit_kind === "tmdbProject") {
    return entry.public_credit_kind;
  }
  const category = parseResumeExperienceCategory(entry.category);
  const talent = trim(entry.main_talent);
  const songArtist = trim(entry.song_artists?.[0]);
  if (talent || ((category === "musicVideos" || category === "liveStage") && songArtist)) {
    return "mainTalent";
  }
  if (category === "televisionFilm" && trim(entry.title)) {
    return "tmdbProject";
  }
  return "studioOrCompany";
}

/**
 * Artists rail (iOS `uniqueMusicVideoArtistNames`):
 * music-video song artists + live/TV/print rows whose cover is main talent.
 */
export function uniqueMusicVideoArtistNames(experiences: ProfileExperience[]): string[] {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const entry of experiences) {
    const category = parseResumeExperienceCategory(entry.category);

    if (category === "musicVideos") {
      const songArtists = entry.song_artists ?? [];
      const primaryKey = songArtists[0] ? normalizedCreditKey(cleanArtistName(songArtists[0]) ?? songArtists[0]) : "";
      for (const artist of songArtists) {
        appendUniqueCredit(cleanArtistName(artist) ?? artist, values, seen);
      }
      const creditLine = trim(entry.credits_display_name) || trim(entry.credits);
      if (creditLine) {
        const cleaned = cleanArtistName(creditLine) ?? creditLine;
        if (normalizedCreditKey(cleaned) !== primaryKey) {
          appendUniqueCredit(cleaned, values, seen);
        }
      }
      appendUniqueCredit(cleanArtistName(entry.main_talent) ?? entry.main_talent, values, seen);
      continue;
    }

    if (category === "liveStage") {
      if (resolvedPublicCreditKind(entry) !== "mainTalent") continue;
      appendUniqueCredit(
        cleanArtistName(entry.main_talent) ?? entry.main_talent ?? cleanArtistName(entry.song_artists?.[0]) ?? entry.song_artists?.[0],
        values,
        seen,
      );
      continue;
    }

    if (category !== "televisionFilm" && category !== "printCommercial") continue;
    if (resolvedPublicCreditKind(entry) !== "mainTalent") continue;
    appendUniqueCredit(cleanArtistName(entry.main_talent) ?? entry.main_talent, values, seen);
  }

  return values;
}

/** Company chips: TV/film/print when cover is studio/company. */
export function uniqueCompanyCreditNames(experiences: ProfileExperience[]): string[] {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const entry of experiences) {
    const category = parseResumeExperienceCategory(entry.category);
    if (category !== "televisionFilm" && category !== "printCommercial") continue;
    if (resolvedPublicCreditKind(entry) !== "studioOrCompany") continue;

    const studio = trim(entry.credits_display_name) || trim(entry.credits);
    if (studio) appendUniqueCredit(studio, values, seen);
    else appendUniqueCredit(entry.production_company, values, seen);
  }

  return values;
}

/** TV/Film project titles when cover is the TMDB project. */
export function uniqueProjectCreditNames(experiences: ProfileExperience[]): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const entry of experiences) {
    if (parseResumeExperienceCategory(entry.category) !== "televisionFilm") continue;
    if (resolvedPublicCreditKind(entry) !== "tmdbProject") continue;
    appendUniqueCredit(entry.title, values, seen);
  }
  return values;
}

/** Live-stage studio/company cover names. */
export function uniqueLiveStageCreditNames(experiences: ProfileExperience[]): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const entry of experiences) {
    if (parseResumeExperienceCategory(entry.category) !== "liveStage") continue;
    if (resolvedPublicCreditKind(entry) !== "studioOrCompany") continue;
    const studio = trim(entry.credits_display_name) || trim(entry.credits);
    if (studio) appendUniqueCredit(studio, values, seen);
    else appendUniqueCredit(entry.production_company, values, seen);
  }
  return values;
}

function creditCandidateNames(entry: ProfileExperience, section: CreditChipSection): string[] {
  const category = parseResumeExperienceCategory(entry.category);
  const kind = resolvedPublicCreditKind(entry);

  if (section === "artists") {
    if (category === "musicVideos") {
      const names: string[] = [];
      if (entry.song_artists?.length) names.push(...entry.song_artists);
      const creditLine = trim(entry.credits_display_name) || trim(entry.credits);
      if (creditLine) names.push(creditLine);
      if (trim(entry.main_talent)) names.push(trim(entry.main_talent));
      return names;
    }
    if (category === "liveStage") {
      if (kind !== "mainTalent") return [];
      return [trim(entry.main_talent), ...(entry.song_artists ?? [])].filter(Boolean);
    }
    if (category === "televisionFilm" || category === "printCommercial") {
      if (kind !== "mainTalent") return [];
      return trim(entry.main_talent) ? [trim(entry.main_talent)] : [];
    }
    return [];
  }

  if (section === "companies") {
    if (category !== "televisionFilm" && category !== "printCommercial") return [];
    if (kind !== "studioOrCompany") return [];
    const names: string[] = [];
    const creditLine = trim(entry.credits_display_name) || trim(entry.credits);
    if (creditLine) names.push(creditLine);
    else if (trim(entry.production_company)) names.push(trim(entry.production_company));
    return names;
  }

  if (section === "projects") {
    if (category !== "televisionFilm" || kind !== "tmdbProject") return [];
    return trim(entry.title) ? [trim(entry.title)] : [];
  }

  if (section === "livestage") {
    if (category !== "liveStage" || kind !== "studioOrCompany") return [];
    const creditLine = trim(entry.credits_display_name) || trim(entry.credits);
    if (creditLine) return [creditLine];
    if (trim(entry.production_company)) return [trim(entry.production_company)];
    return [];
  }

  return [];
}

function creditNameMatches(candidate: string, targetKey: string): boolean {
  const cleaned = cleanArtistName(candidate) ?? candidate;
  const key = normalizedCreditKey(cleaned);
  const raw = normalizedCreditKey(candidate);
  if (!targetKey) return false;
  return (
    key === targetKey ||
    raw === targetKey ||
    key.startsWith(`${targetKey} `) ||
    raw.startsWith(`${targetKey} `) ||
    raw.startsWith(`${targetKey}"`) ||
    raw.startsWith(`${targetKey}“`) ||
    targetKey.startsWith(`${key} `)
  );
}

function firstImage(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const resolved = resolveBrandfetchLogoURL(candidate, null) ?? trim(candidate);
    if (resolved) return resolved;
  }
  return null;
}

function creditCoverImageURL(entry: ProfileExperience, section: CreditChipSection): string | null {
  const category = parseResumeExperienceCategory(entry.category) ?? "televisionFilm";
  switch (section) {
    case "artists":
      return (
        firstImage(entry.main_talent_image_url) ??
        experienceDisplayImageURL(entry, category) ??
        firstImage(entry.image_url)
      );
    case "companies":
      return firstImage(entry.image_url, entry.production_company_image_url);
    case "projects":
      return firstImage(entry.tv_film_project_poster_url, entry.image_url);
    case "livestage":
      return experienceDisplayImageURL(entry, "liveStage") ?? firstImage(entry.image_url, entry.main_talent_image_url);
  }
}

function imageUrlForCredit(
  name: string,
  section: CreditChipSection,
  experiences: ProfileExperience[],
): string | null {
  const targetKey = normalizedCreditKey(name);
  if (!targetKey) return null;

  for (const entry of experiences) {
    const matches = creditCandidateNames(entry, section).some((candidate) =>
      creditNameMatches(candidate, targetKey),
    );
    if (!matches) continue;
    const url = creditCoverImageURL(entry, section);
    if (url) return url;
  }

  // Artist chips often resolve from a live-stage row even when the title came from a music video.
  if (section === "artists") {
    for (const entry of experiences) {
      const haystack = [
        entry.main_talent,
        entry.credits_display_name,
        entry.credits,
        ...(entry.song_artists ?? []),
      ].filter(Boolean) as string[];
      if (!haystack.some((candidate) => creditNameMatches(candidate, targetKey))) continue;
      const url =
        firstImage(entry.main_talent_image_url, entry.image_url) ??
        experienceDisplayImageURL(entry, parseResumeExperienceCategory(entry.category) ?? "musicVideos");
      if (url) return url;
    }
  }

  return null;
}

function buildCreditChipItems(
  names: string[],
  section: CreditChipSection,
  experiences: ProfileExperience[],
): CreditChipItem[] {
  const fallbackCategory: ResumeExperienceCategory =
    section === "artists"
      ? "musicVideos"
      : section === "livestage"
        ? "liveStage"
        : section === "projects"
          ? "televisionFilm"
          : "printCommercial";

  return names.map((title) => ({
    id: `${section}|${title}`,
    title,
    imageUrl: imageUrlForCredit(title, section, experiences),
    fallbackCategory,
  }));
}

export function experiencesForCreditChip(
  chip: CreditChipItem,
  experiences: ProfileExperience[],
): ProfileExperience[] {
  const section: CreditChipSection = chip.id.startsWith("companies|")
    ? "companies"
    : chip.id.startsWith("projects|")
      ? "projects"
      : chip.id.startsWith("livestage|")
        ? "livestage"
        : "artists";
  const target = normalizedCreditKey(chip.title);
  if (!target) return [];
  const matches = experiences.filter((entry) =>
    creditCandidateNames(entry, section).some((name) => creditNameMatches(name, target)),
  );
  if (matches.length) return matches;
  return experiences.filter((entry) => {
    const haystack = [
      entry.title,
      entry.credits_display_name,
      entry.credits,
      entry.main_talent,
      entry.production_company,
      ...(entry.song_artists ?? []),
    ].filter(Boolean) as string[];
    return haystack.some((name) => creditNameMatches(name, target));
  });
}

function preferChip(candidate: CreditChipItem, existing: CreditChipItem): boolean {
  const candidateHasImage = Boolean(candidate.imageUrl);
  const existingHasImage = Boolean(existing.imageUrl);
  if (candidateHasImage !== existingHasImage) return candidateHasImage;
  return false;
}

/** Deduplicate by title, preferring chips that already resolved an image (iOS preferredUniqueCreditChips). */
function preferredUniqueCreditChips(chips: CreditChipItem[]): CreditChipItem[] {
  const bestByKey = new Map<string, CreditChipItem>();
  const order: string[] = [];
  for (const chip of chips) {
    const key = normalizedCreditKey(chip.title);
    if (!key) continue;
    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, chip);
      order.push(key);
      continue;
    }
    if (preferChip(chip, existing)) bestByKey.set(key, chip);
  }
  return order.map((key) => bestByKey.get(key)!);
}

export function buildProfileCredits(experiences: ProfileExperience[]): ProfileCredits {
  const artists = preferredUniqueCreditChips([
    ...buildCreditChipItems(uniqueMusicVideoArtistNames(experiences), "artists", experiences),
  ]);
  const companies = preferredUniqueCreditChips([
    ...buildCreditChipItems(uniqueCompanyCreditNames(experiences), "companies", experiences),
    ...buildCreditChipItems(uniqueProjectCreditNames(experiences), "projects", experiences),
    ...buildCreditChipItems(uniqueLiveStageCreditNames(experiences), "livestage", experiences),
  ]);
  return { artists, companies };
}

/**
 * Public credit rail order: follow `credit_page_layout.visible_keys` when present
 * (same source the iOS profile uses), skipping hidden keys.
 */
export function applyCreditPageLayout(
  chips: CreditChipItem[],
  experiences: ProfileExperience[],
  layout: ProfileCreditPageLayout | null | undefined,
): CreditChipItem[] {
  if (!layout?.visible_keys?.length) return chips;

  const byKey = new Map<string, CreditChipItem>();
  for (const chip of chips) {
    const key = normalizedCreditKey(chip.title);
    if (key && !byKey.has(key)) byKey.set(key, chip);
  }

  const hidden = new Set((layout.hidden_keys ?? []).map(normalizedCreditKey).filter(Boolean));
  const used = new Set<string>();
  const visible: CreditChipItem[] = [];

  for (const rawKey of layout.visible_keys) {
    const cleaned = cleanArtistName(rawKey) ?? rawKey;
    const key = normalizedCreditKey(cleaned);
    const rawNormalized = normalizedCreditKey(rawKey);
    if (!key || hidden.has(key) || hidden.has(rawNormalized) || used.has(key)) continue;

    let chip = byKey.get(key) ?? byKey.get(rawNormalized) ?? null;
    if (!chip) {
      for (const candidate of byKey.values()) {
        const titleKey = normalizedCreditKey(candidate.title);
        if (
          titleKey === key ||
          titleKey === rawNormalized ||
          titleKey.startsWith(`${key} `) ||
          titleKey.startsWith(`${key}"`) ||
          titleKey.startsWith(`${key}“`) ||
          key.startsWith(`${titleKey} `) ||
          rawNormalized.startsWith(`${titleKey} `) ||
          rawNormalized.startsWith(`${titleKey}"`) ||
          rawNormalized.startsWith(`${titleKey}“`)
        ) {
          chip = candidate;
          break;
        }
      }
    }
    if (!chip) {
      const imageUrl =
        imageUrlForCredit(cleaned, "artists", experiences) ??
        imageUrlForCredit(cleaned, "companies", experiences) ??
        imageUrlForCredit(cleaned, "projects", experiences) ??
        imageUrlForCredit(cleaned, "livestage", experiences) ??
        imageUrlForCredit(rawKey, "artists", experiences) ??
        imageUrlForCredit(rawKey, "companies", experiences);
      chip = {
        id: `layout|${cleaned}`,
        title: cleaned.replace(/\b\w/g, (char) => char.toUpperCase()),
        imageUrl,
        fallbackCategory: "musicVideos",
      };
    }

    used.add(normalizedCreditKey(chip.title));
    used.add(key);
    used.add(rawNormalized);
    visible.push(chip);
  }

  for (const chip of chips) {
    const key = normalizedCreditKey(chip.title);
    if (!key || used.has(key) || hidden.has(key)) continue;
    used.add(key);
    visible.push(chip);
  }

  return visible;
}

/** Flat public credit rail (layout-aware). Prefer this over concatenating artists+companies. */
export function orderedCreditChips(
  credits: ProfileCredits,
  experiences: ProfileExperience[],
  layout: ProfileCreditPageLayout | null | undefined,
): CreditChipItem[] {
  return applyCreditPageLayout(
    [...(credits.artists ?? []), ...(credits.companies ?? [])],
    experiences,
    layout,
  );
}
