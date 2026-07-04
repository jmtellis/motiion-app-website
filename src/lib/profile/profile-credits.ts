import type { ProfileExperience } from "@/types/public";

import { resolveBrandfetchLogoURL } from "./brandfetch-logo";
import {
  experienceDisplayImageURL,
  parseResumeExperienceCategory,
  type ResumeExperienceCategory,
} from "./resume-experience";

export type CreditChipSection = "artists" | "companies";

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

const COLLAPSED_CHIP_LIMIT = 6;

export { COLLAPSED_CHIP_LIMIT };

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

export function uniqueMusicVideoArtistNames(experiences: ProfileExperience[]): string[] {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const entry of experiences) {
    if (parseResumeExperienceCategory(entry.category) !== "musicVideos") continue;

    const songArtists = entry.song_artists ?? [];
    const primaryKey = songArtists[0] ? normalizedCreditKey(songArtists[0]) : null;

    for (const artist of songArtists) {
      appendUniqueCredit(artist, values, seen);
    }

    const creditLine = trim(entry.credits_display_name) || trim(entry.credits);
    if (creditLine) {
      const creditKey = normalizedCreditKey(creditLine);
      if (!primaryKey || creditKey !== primaryKey) {
        appendUniqueCredit(creditLine, values, seen);
      }
    }

    appendUniqueCredit(entry.main_talent, values, seen);
  }

  return values;
}

export function uniqueCompanyCreditNames(experiences: ProfileExperience[]): string[] {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const entry of experiences) {
    appendUniqueCredit(entry.production_company, values, seen);

    const category = parseResumeExperienceCategory(entry.category);
    if (category === "televisionFilm" || category === "printCommercial") {
      appendUniqueCredit(entry.credits_display_name ?? entry.credits, values, seen);
    }
  }

  return values;
}

function creditCandidateNames(entry: ProfileExperience, section: CreditChipSection): string[] {
  const category = parseResumeExperienceCategory(entry.category);

  if (section === "artists") {
    if (category !== "musicVideos") return [];
    const names: string[] = [];
    if (entry.song_artists?.length) names.push(...entry.song_artists);
    const creditLine = trim(entry.credits_display_name) || trim(entry.credits);
    if (creditLine) names.push(creditLine);
    if (trim(entry.main_talent)) names.push(trim(entry.main_talent));
    return names;
  }

  if (category !== "televisionFilm" && category !== "printCommercial") {
    return [];
  }

  const names: string[] = [];
  if (trim(entry.production_company)) names.push(trim(entry.production_company));
  const creditLine = trim(entry.credits_display_name) || trim(entry.credits);
  if (creditLine) names.push(creditLine);
  return names;
}

function imageUrlForCompanyCredit(
  name: string,
  experiences: ProfileExperience[],
): string | null {
  const targetKey = normalizedCreditKey(name);
  if (!targetKey) return null;

  for (const entry of experiences) {
    if (normalizedCreditKey(entry.production_company) !== targetKey) continue;
    const url = resolveBrandfetchLogoURL(
      entry.production_company_image_url,
      entry.production_company_brand_domain,
    );
    if (url) return url;
  }

  for (const entry of experiences) {
    const category = parseResumeExperienceCategory(entry.category);
    if (category !== "televisionFilm" && category !== "printCommercial") continue;

    const matches = creditCandidateNames(entry, "companies").some(
      (candidate) => normalizedCreditKey(candidate) === targetKey,
    );
    if (!matches) continue;

    const url = experienceDisplayImageURL(entry, category);
    if (url) return url;
  }

  return null;
}

function imageUrlForArtistCredit(
  name: string,
  experiences: ProfileExperience[],
): string | null {
  const targetKey = normalizedCreditKey(name);
  if (!targetKey) return null;

  for (const entry of experiences) {
    if (parseResumeExperienceCategory(entry.category) !== "musicVideos") continue;

    const matches = creditCandidateNames(entry, "artists").some(
      (candidate) => normalizedCreditKey(candidate) === targetKey,
    );
    if (!matches) continue;

    const url = experienceDisplayImageURL(entry, "musicVideos");
    if (url) return url;
  }

  return null;
}

function imageUrlForCredit(
  name: string,
  section: CreditChipSection,
  experiences: ProfileExperience[],
): string | null {
  if (section === "companies") {
    return imageUrlForCompanyCredit(name, experiences);
  }
  return imageUrlForArtistCredit(name, experiences);
}

function buildCreditChipItems(
  names: string[],
  section: CreditChipSection,
  experiences: ProfileExperience[],
): CreditChipItem[] {
  const fallbackCategory: ResumeExperienceCategory =
    section === "artists" ? "musicVideos" : "printCommercial";

  return names.map((title) => ({
    id: `${section}|${title}`,
    title,
    imageUrl: imageUrlForCredit(title, section, experiences),
    fallbackCategory,
  }));
}

export function buildProfileCredits(experiences: ProfileExperience[]): ProfileCredits {
  return {
    artists: buildCreditChipItems(uniqueMusicVideoArtistNames(experiences), "artists", experiences),
    companies: buildCreditChipItems(uniqueCompanyCreditNames(experiences), "companies", experiences),
  };
}
