import type { ProfileExperience, ProfileHighlight } from "@/types/public";

import { isBrandfetchHostedURL, resolveBrandfetchLogoURL } from "./brandfetch-logo";

export type ResumeExperienceCategory =
  | "televisionFilm"
  | "printCommercial"
  | "liveStage"
  | "musicVideos";

export const RESUME_EXPERIENCE_CATEGORIES: {
  key: ResumeExperienceCategory;
  label: string;
}[] = [
  { key: "televisionFilm", label: "Television/Film" },
  { key: "printCommercial", label: "Print/Commercial" },
  { key: "liveStage", label: "Live Performances" },
  { key: "musicVideos", label: "Music Videos" },
];

const CHOREOGRAPHERS_CATEGORY = "choreographersworkedwith";

export type ResumeExperienceItem = {
  id: string;
  companyLabel: string;
  title: string;
  imageUrl: string | null;
  category: ResumeExperienceCategory;
  entry: ProfileExperience;
  index: number;
};

export type GroupedResumeExperience = {
  id: string;
  companyLabel: string;
  imageUrl: string | null;
  children: ResumeExperienceItem[];
};

function trim(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function cleanCredits(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.toLowerCase().startsWith("chor:")) {
    return trimmed.slice(5).trim();
  }
  return trimmed;
}

function preferredDisplayName(
  displayName: string | null | undefined,
  raw: string | null | undefined,
  fallback: string,
): string {
  const named = trim(displayName);
  if (named) return named;
  const cleaned = cleanCredits(raw ?? "");
  return cleaned || fallback;
}

export function parseResumeExperienceCategory(
  raw: string | null | undefined,
): ResumeExperienceCategory | null {
  const value = (raw ?? "").toLowerCase();
  if (value === CHOREOGRAPHERS_CATEGORY) return null;
  if (value.includes("music")) return "musicVideos";
  if (value.includes("live") || value.includes("stage")) return "liveStage";
  if (value.includes("print") || value.includes("commercial")) return "printCommercial";
  if (!value || value.includes("tv") || value.includes("film") || value === "televisionfilm") {
    return "televisionFilm";
  }
  return "televisionFilm";
}

function parseCategory(raw: string | null | undefined): ResumeExperienceCategory | null {
  return parseResumeExperienceCategory(raw);
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = trim(value);
    if (trimmed) return trimmed;
  }
  return null;
}

export function experienceDisplayName(
  entry: ProfileExperience,
  category: ResumeExperienceCategory,
): string {
  const creditText = trim(entry.credits);
  const hasCreditText = Boolean(creditText);
  const hasDisplayName = Boolean(trim(entry.credits_display_name));

  switch (category) {
    case "televisionFilm":
      if (hasCreditText || hasDisplayName) {
        return preferredDisplayName(entry.credits_display_name, entry.credits, "Studio");
      }
      if (entry.entity_image_status === "unknown") return "Unknown Studio";
      return preferredDisplayName(entry.credits_display_name, entry.credits, "Studio");
    case "musicVideos": {
      const firstArtist = entry.song_artists?.[0];
      if (trim(firstArtist)) return trim(firstArtist);
      if (hasCreditText || hasDisplayName) {
        return preferredDisplayName(entry.credits_display_name, entry.credits, "Song Artist");
      }
      if (entry.entity_image_status === "unknown") return "Unknown Artist";
      return preferredDisplayName(entry.credits_display_name, entry.credits, "Song Artist");
    }
    case "printCommercial":
      if (hasCreditText || hasDisplayName) {
        return preferredDisplayName(entry.credits_display_name, entry.credits, "Company");
      }
      if (entry.entity_image_status === "unknown") return "Unknown Company";
      return preferredDisplayName(entry.credits_display_name, entry.credits, "Company");
    case "liveStage": {
      const mainTalent = trim(entry.main_talent);
      if (mainTalent) return mainTalent;
      const firstArtist = entry.song_artists?.[0];
      if (trim(firstArtist)) return trim(firstArtist);
      const production = trim(entry.production_company);
      if (production) return production;
      const theater = trim(entry.theater_name);
      if (theater) return theater;
      if (hasCreditText || hasDisplayName) {
        return preferredDisplayName(entry.credits_display_name, entry.credits, "Event");
      }
      if (entry.entity_image_status === "unknown") return "Unknown Event";
      return preferredDisplayName(entry.credits_display_name, entry.credits, "Event");
    }
  }
}

export function experienceDisplayTitle(
  entry: ProfileExperience,
  category: ResumeExperienceCategory,
): string {
  const alternate = trim(entry.alternate_title);
  switch (category) {
    case "televisionFilm":
    case "musicVideos":
      return entry.title;
    case "printCommercial":
    case "liveStage":
      return alternate || entry.title;
  }
}

export function experienceDisplayImageURL(
  entry: ProfileExperience,
  category: ResumeExperienceCategory,
): string | null {
  const creditsLogo = resolveBrandfetchLogoURL(entry.image_url, entry.credits_brand_domain);
  const productionLogo = resolveBrandfetchLogoURL(
    entry.production_company_image_url,
    entry.production_company_brand_domain,
  );
  const mainTalentImage = trim(entry.main_talent_image_url);
  const poster = trim(entry.tv_film_project_poster_url);

  switch (category) {
    case "televisionFilm":
      return firstNonEmpty(poster, creditsLogo, mainTalentImage, productionLogo);
    case "musicVideos":
    case "printCommercial":
      return firstNonEmpty(creditsLogo, productionLogo, mainTalentImage);
    case "liveStage": {
      const mainEmpty = !trim(entry.main_talent);
      const creditsPresent = Boolean(trim(entry.credits_display_name) || trim(entry.credits));
      if (mainEmpty && creditsPresent) {
        return firstNonEmpty(creditsLogo, productionLogo, mainTalentImage);
      }
      const subtype = entry.live_stage_subtype ?? "festivals";
      switch (subtype) {
        case "tours":
        case "corporate":
          return firstNonEmpty(creditsLogo, mainTalentImage, productionLogo);
        case "theaterProduction":
          return firstNonEmpty(creditsLogo, productionLogo, mainTalentImage);
        case "festivals":
        case "concerts":
        case "awardShows":
        case "other":
        default:
          return firstNonEmpty(mainTalentImage, creditsLogo, productionLogo);
      }
    }
  }
}

export function isCreditOnlyExperienceEntry(entry: ProfileExperience): boolean {
  const rawCat = (entry.category ?? "").toLowerCase();
  if (rawCat === CHOREOGRAPHERS_CATEGORY) return false;

  const hasDetailedFields =
    (entry.roles?.length ?? 0) > 0 ||
    (entry.song_artists?.length ?? 0) > 0 ||
    (entry.choreographers?.length ?? 0) > 0 ||
    (entry.associate_choreographers?.length ?? 0) > 0 ||
    (entry.assistants?.length ?? 0) > 0 ||
    Boolean(trim(entry.start_date)) ||
    Boolean(trim(entry.link_url)) ||
    Boolean(trim(entry.director)) ||
    Boolean(trim(entry.main_talent)) ||
    Boolean(trim(entry.production_company)) ||
    Boolean(trim(entry.theater_name)) ||
    Boolean(entry.live_stage_subtype);

  if (hasDetailedFields) return false;

  const normalizedTitle = trim(entry.title).toLowerCase();
  const normalizedCredit = trim(entry.credits_display_name || entry.credits).toLowerCase();
  return Boolean(normalizedCredit) && normalizedTitle === normalizedCredit;
}

function deterministicUUID(raw: string): string {
  const bytes = new TextEncoder().encode(raw);
  let hash = bytes.reduce((acc, byte) => ((acc << 5n) + acc + BigInt(byte)) & 0xffffffffffffffffn, 5381n);
  const data = new Uint8Array(16);
  for (let idx = 0; idx < 16; idx += 1) {
    data[idx] = Number((hash >> BigInt((idx % 8) * 8)) & 0xffn);
    hash = (hash * 1099511628211n) & 0xffffffffffffffffn;
  }
  data[6] = (data[6]! & 0x0f) | 0x40;
  data[8] = (data[8]! & 0x3f) | 0x80;
  const hex = [...data].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function stableExperienceId(entry: ProfileExperience, index: number): string {
  return deterministicUUID(`experience|${index}|${entry.category ?? ""}`);
}

function legacyStableExperienceId(entry: ProfileExperience, index: number): string {
  return deterministicUUID(
    `${index}|${entry.title}|${entry.credits ?? ""}|${entry.category ?? ""}|${entry.alternate_title ?? ""}`,
  );
}

function matchesExperienceId(id: string, entry: ProfileExperience, index: number): boolean {
  const normalized = id.toLowerCase();
  return (
    stableExperienceId(entry, index).toLowerCase() === normalized ||
    legacyStableExperienceId(entry, index).toLowerCase() === normalized
  );
}

function stableGroupId(companyLabel: string): string {
  return `group-${companyLabel.trim().toLowerCase()}`;
}

export function buildResumeExperienceItems(
  experiences: ProfileExperience[],
  category: ResumeExperienceCategory,
): ResumeExperienceItem[] {
  return experiences.flatMap((entry, index) => {
    const mapped = parseCategory(entry.category);
    if (mapped !== category) return [];
    if (isCreditOnlyExperienceEntry(entry)) return [];

    return [
      {
        id: stableExperienceId(entry, index),
        companyLabel: experienceDisplayName(entry, category),
        title: experienceDisplayTitle(entry, category),
        imageUrl: experienceDisplayImageURL(entry, category),
        category,
        entry,
        index,
      },
    ];
  });
}

export function groupResumeExperienceItems(items: ResumeExperienceItem[]): GroupedResumeExperience[] {
  const keyed = new Map<string, ResumeExperienceItem[]>();

  for (const item of items) {
    const key = item.companyLabel.trim().toLowerCase();
    const list = keyed.get(key) ?? [];
    list.push(item);
    keyed.set(key, list);
  }

  return Array.from(keyed.entries())
    .map(([, children]) => {
      const first = children[0]!;
      return {
        id: stableGroupId(first.companyLabel),
        companyLabel: first.companyLabel,
        imageUrl: first.imageUrl,
        children,
      };
    })
    .sort((a, b) => a.companyLabel.localeCompare(b.companyLabel));
}

export function visibleResumeCategories(
  experiences: ProfileExperience[],
): { key: ResumeExperienceCategory; label: string }[] {
  return RESUME_EXPERIENCE_CATEGORIES.filter(
    ({ key }) => buildResumeExperienceItems(experiences, key).length > 0,
  );
}

function normalizeMatchValue(raw: string | null | undefined): string {
  return trim(raw)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function experienceImageURLFallback(entry: ProfileExperience): string | null {
  return (
    resolveBrandfetchLogoURL(entry.image_url, entry.credits_brand_domain) ??
    trim(entry.tv_film_project_poster_url) ??
    resolveBrandfetchLogoURL(
      entry.production_company_image_url,
      entry.production_company_brand_domain,
    ) ??
    trim(entry.main_talent_image_url)
  );
}

function experienceMatchLabels(
  entry: ProfileExperience,
  category: ResumeExperienceCategory | null,
): string[] {
  const labels = new Set<string>();
  const add = (value: string | null | undefined) => {
    const normalized = normalizeMatchValue(value);
    if (normalized) labels.add(normalized);
  };

  if (category) {
    add(experienceDisplayName(entry, category));
  }
  add(entry.credits_display_name);
  add(entry.credits);
  add(entry.main_talent);
  add(entry.production_company);
  add(entry.title);

  return [...labels];
}

export function resolveHighlightImageUrl(
  highlight: ProfileHighlight,
  experiences: ProfileExperience[],
): string | null {
  const directRaw = trim(highlight.image_url);
  if (directRaw && !isBrandfetchHostedURL(directRaw)) {
    return directRaw;
  }

  const matched = findExperienceForHighlight(highlight, experiences);
  if (matched) {
    const { entry, category } = matched;
    if (category) {
      const fromExperience = experienceDisplayImageURL(entry, category);
      if (fromExperience) return fromExperience;
    }
    const fallback = experienceImageURLFallback(entry);
    if (fallback) return fallback;
  }

  if (directRaw) {
    return resolveBrandfetchLogoURL(directRaw, null);
  }

  return null;
}

function findExperienceForHighlight(
  highlight: ProfileHighlight,
  experiences: ProfileExperience[],
): { entry: ProfileExperience; index: number; category: ResumeExperienceCategory | null } | null {
  const experienceId = trim(highlight.experience_id);
  if (experienceId) {
    for (let index = 0; index < experiences.length; index += 1) {
      const entry = experiences[index]!;
      if (matchesExperienceId(experienceId, entry, index)) {
        return { entry, index, category: parseCategory(entry.category) };
      }
    }
  }

  const normalizedTitle = normalizeMatchValue(highlight.title);
  if (!normalizedTitle) return null;
  const normalizedSubtitle = normalizeMatchValue(highlight.subtitle);

  for (let index = 0; index < experiences.length; index += 1) {
    const entry = experiences[index]!;
    const category = parseCategory(entry.category);
    const labels = experienceMatchLabels(entry, category);
    const normalizedEntryTitle = normalizeMatchValue(entry.title);

    if (normalizedSubtitle) {
      const subtitleMatches = labels.some((label) => label === normalizedSubtitle);
      const titleMatches = normalizedEntryTitle === normalizedTitle;
      if (subtitleMatches && titleMatches) {
        return { entry, index, category };
      }
      if (subtitleMatches && !normalizedTitle) {
        return { entry, index, category };
      }
    }

    if (normalizedEntryTitle === normalizedTitle) {
      return { entry, index, category };
    }
  }

  return null;
}

export function matchedExperienceForHighlight(
  highlight: ProfileHighlight,
  experiences: ProfileExperience[],
): { category: ResumeExperienceCategory; entry: ProfileExperience; item: ResumeExperienceItem } | null {
  const found = findExperienceForHighlight(highlight, experiences);
  if (!found || !found.category || isCreditOnlyExperienceEntry(found.entry)) return null;

  const { entry, index, category } = found;
  const item: ResumeExperienceItem = {
    id: stableExperienceId(entry, index),
    companyLabel: experienceDisplayName(entry, category),
    title: experienceDisplayTitle(entry, category),
    imageUrl: experienceDisplayImageURL(entry, category),
    category,
    entry,
    index,
  };

  return { category, entry, item };
}
