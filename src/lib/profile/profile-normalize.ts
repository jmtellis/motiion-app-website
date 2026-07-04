import type { ProfileExperience, ProfileHighlight } from "@/types/public";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

function readStringArray(record: Record<string, unknown>, ...keys: string[]): string[] | null {
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value)) continue;
    const items = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    if (items.length > 0) return items;
  }
  return null;
}

export function normalizeProfileExperience(raw: unknown): ProfileExperience | null {
  if (!isRecord(raw)) return null;
  const title = readString(raw, "title");
  if (!title) return null;

  return {
    id: readString(raw, "id"),
    title,
    role: readString(raw, "role"),
    roles: readStringArray(raw, "roles") ?? undefined,
    credits: readString(raw, "credits"),
    category: readString(raw, "category"),
    start_date: readString(raw, "start_date", "startDate"),
    end_date: readString(raw, "end_date", "endDate"),
    credits_display_name: readString(raw, "credits_display_name", "creditsDisplayName"),
    image_url: readString(raw, "image_url", "imageUrl"),
    tv_film_project_poster_url: readString(
      raw,
      "tv_film_project_poster_url",
      "tvFilmProjectPosterUrl",
    ),
    alternate_title: readString(raw, "alternate_title", "alternateTitle"),
    link_url: readString(raw, "link_url", "linkUrl"),
    director: readString(raw, "director"),
    main_talent: readString(raw, "main_talent", "mainTalent"),
    main_talent_image_url: readString(raw, "main_talent_image_url", "mainTalentImageUrl"),
    production_company: readString(raw, "production_company", "productionCompany"),
    production_company_image_url: readString(
      raw,
      "production_company_image_url",
      "productionCompanyImageUrl",
    ),
    credits_brand_domain: readString(raw, "credits_brand_domain", "creditsBrandDomain"),
    production_company_brand_domain: readString(
      raw,
      "production_company_brand_domain",
      "productionCompanyBrandDomain",
    ),
    song_artists: readStringArray(raw, "song_artists", "songArtists") ?? undefined,
    theater_name: readString(raw, "theater_name", "theaterName"),
    choreographers: readStringArray(raw, "choreographers") ?? undefined,
    associate_choreographers:
      readStringArray(raw, "associate_choreographers", "associateChoreographers") ?? undefined,
    assistants: readStringArray(raw, "assistants") ?? undefined,
    live_stage_subtype: readString(raw, "live_stage_subtype", "liveStageSubtype"),
    entity_image_status: readString(raw, "entity_image_status", "entityImageStatus"),
  };
}

export function normalizeProfileExperiences(raw: unknown): ProfileExperience[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => normalizeProfileExperience(entry))
    .filter((entry): entry is ProfileExperience => entry !== null);
}

export function normalizeProfileHighlight(raw: unknown, index: number): ProfileHighlight | null {
  if (!isRecord(raw)) return null;
  const title = readString(raw, "title");
  if (!title) return null;

  const subtitle = readString(raw, "subtitle");
  const id =
    readString(raw, "id") ??
    `highlight-${index}-${title}-${subtitle ?? "no-sub"}`.toLowerCase().replace(/\s+/g, "-");

  return {
    id,
    experience_id: readString(raw, "experience_id", "experienceId"),
    title,
    subtitle,
    image_url: readString(raw, "image_url", "imageUrl"),
  };
}

export function normalizeProfileHighlights(raw: unknown): ProfileHighlight[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index) => normalizeProfileHighlight(entry, index))
    .filter((entry): entry is ProfileHighlight => entry !== null);
}
