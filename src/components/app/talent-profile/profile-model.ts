import { experiencesForCreditChip, type CreditChipItem } from "@/lib/profile/profile-credits";
import { resolveBrandfetchLogoURL } from "@/lib/profile/brandfetch-logo";
import {
  RESUME_EXPERIENCE_CATEGORIES,
  experienceDisplayImageURL,
  parseResumeExperienceCategory,
} from "@/lib/profile/resume-experience";
import type { ProfileExperience, ProfileHighlight, ProfileVisual, PublicTalentProfile } from "@/types/public";

export type ProfileSection = "credits" | "headshots" | "reel" | "slate" | "skills";

export const SECTION_LABEL: Record<ProfileSection, string> = {
  credits: "Credits",
  headshots: "Headshots",
  reel: "Reel",
  slate: "Slate",
  skills: "Skills",
};

export type SocialLink = { label: string; url: string };

export function creditChips(profile: PublicTalentProfile): CreditChipItem[] {
  return [...(profile.credits?.artists ?? []), ...(profile.credits?.companies ?? [])];
}

/** Indexes into `profile.experiences`, so pages can address an experience without copying it. */
export function experienceIndexesForChip(profile: PublicTalentProfile, chip: CreditChipItem): number[] {
  const experiences = profile.experiences ?? [];
  const matches = new Set(experiencesForCreditChip(chip, experiences));
  return experiences.flatMap((entry, index) => (matches.has(entry) ? [index] : []));
}

export function headshots(profile: PublicTalentProfile): string[] {
  const urls = [profile.headshot_url, ...(profile.headshot_urls ?? [])]
    .map((url) => url?.trim() || "")
    .filter(Boolean);
  return [...new Set(urls)];
}

export function visualOf(profile: PublicTalentProfile, kind: ProfileVisual["kind"]) {
  return (profile.profile_visuals ?? []).find((item) => item.kind === kind && item.url?.trim()) ?? null;
}

export function skillVisuals(profile: PublicTalentProfile) {
  return (profile.profile_visuals ?? [])
    .filter((item) => (item.kind === "skill" || item.kind === "style") && item.url?.trim())
    .sort((a, b) => (a.kind === b.kind ? (a.sort ?? 0) - (b.sort ?? 0) : a.kind === "skill" ? -1 : 1));
}

export function socialLinks(profile: PublicTalentProfile): SocialLink[] {
  return [
    profile.instagram_url ? { label: "Instagram", url: profile.instagram_url } : null,
    profile.youtube_url ? { label: "YouTube", url: profile.youtube_url } : null,
  ].filter((link): link is SocialLink => Boolean(link));
}

export function sectionAvailable(profile: PublicTalentProfile, section: ProfileSection) {
  switch (section) {
    case "credits": return creditChips(profile).length > 0;
    case "headshots": return headshots(profile).length > 0;
    case "reel": return Boolean(visualOf(profile, "reel"));
    case "slate": return Boolean(visualOf(profile, "slate"));
    case "skills": return Boolean(profile.styles?.length || profile.skills?.length || skillVisuals(profile).length);
  }
}

export function hasWorkDetails(profile: PublicTalentProfile) {
  return Boolean(publicRepresentation(profile) || profile.union_status?.trim());
}

export function publicRepresentation(profile: PublicTalentProfile) {
  const value = profile.representation?.trim();
  return value && value.toLowerCase() !== "other" ? value : null;
}

/** Highlights open their experience directly: id first, then title + subtitle, then title. */
export function experienceIndexForHighlight(profile: PublicTalentProfile, highlight: ProfileHighlight): number | null {
  const experiences = profile.experiences ?? [];
  const norm = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";
  const byId = highlight.experience_id
    ? experiences.findIndex((entry) => entry.id && entry.id === highlight.experience_id)
    : -1;
  if (byId >= 0) return byId;
  const title = norm(highlight.title);
  if (!title) return null;
  const subtitle = norm(highlight.subtitle);
  if (subtitle) {
    const both = experiences.findIndex((entry) =>
      norm(entry.title) === title &&
      [entry.credits_display_name, entry.credits, entry.main_talent, entry.production_company, ...(entry.song_artists ?? [])]
        .some((value) => norm(value) === subtitle),
    );
    if (both >= 0) return both;
  }
  const byTitle = experiences.findIndex((entry) => norm(entry.title) === title);
  return byTitle >= 0 ? byTitle : null;
}

export function isChoreographerCredit(experience: ProfileExperience) {
  return (experience.category ?? "").toLowerCase() === "choreographersworkedwith";
}

export function categoryLabel(experience: ProfileExperience) {
  if (isChoreographerCredit(experience)) return "Choreographer";
  const parsed = parseResumeExperienceCategory(experience.category);
  return RESUME_EXPERIENCE_CATEGORIES.find((item) => item.key === parsed)?.label ?? "Experience";
}

export function experienceImage(experience: ProfileExperience) {
  const category = parseResumeExperienceCategory(experience.category) ?? "televisionFilm";
  return experienceDisplayImageURL(experience, category) ?? resolveBrandfetchLogoURL(experience.image_url, experience.credits_brand_domain);
}

type Fact = { label: string; value: string };

function join(values: (string | null | undefined)[] | null | undefined) {
  return (values ?? []).map((value) => value?.trim()).filter(Boolean).join(", ");
}

function formatDate(raw: string | null | undefined) {
  if (!raw) return "";
  const date = new Date(raw.length === 10 ? `${raw}T12:00:00Z` : raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function duration(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return "";
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return "";
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  if (days < 14) return days === 1 ? "1 day" : `${days} days`;
  const months = Math.max(1, Math.round(days / 30));
  return months === 1 ? "1 month" : `${months} months`;
}

/** Same field order the iOS experience detail uses in public mode; empty fields are omitted. */
export function experienceFacts(experience: ProfileExperience): Fact[] {
  const facts: Fact[] = [];
  const push = (label: string, value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (trimmed) facts.push({ label, value: trimmed });
  };

  if (isChoreographerCredit(experience)) {
    push("Choreographer", experience.title || join(experience.choreographers));
    return facts;
  }

  const category = parseResumeExperienceCategory(experience.category);
  const company = experience.credits_display_name || experience.credits;
  switch (category) {
    case "televisionFilm":
      push("Title", experience.title);
      push("Studio", experience.production_company || company);
      break;
    case "musicVideos":
      push("Song title", experience.title);
      push("Song artist(s)", join(experience.song_artists) || company);
      break;
    case "printCommercial":
      push("Company", company);
      push("Campaign title", experience.title);
      push("Production company", experience.production_company);
      break;
    case "liveStage":
      push("Type", experience.live_stage_subtype);
      push("Title", experience.title);
      push("Theater", experience.theater_name);
      break;
  }

  push("Role", join(experience.roles?.length ? experience.roles : [experience.role]));
  if (category !== "musicVideos") push("Main talent", experience.main_talent);
  if (category === "musicVideos" || category === "printCommercial" || category === "liveStage") push("Director", experience.director);
  push("Choreographer(s)", join(experience.choreographers));
  push("Assoc. choreographers", join(experience.associate_choreographers));
  push("Assistants", join(experience.assistants));
  push("Start date", formatDate(experience.start_date));
  push("Duration", duration(experience.start_date, experience.end_date));
  return facts;
}

/** Embeddable player URL for YouTube / Vimeo links; other links open in a new tab. */
export function embedUrl(link: string | null | undefined) {
  if (!link) return null;
  try {
    const url = new URL(link);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    if (host.endsWith("youtube.com")) {
      const id = url.searchParams.get("v") ?? url.pathname.match(/\/(?:shorts|embed)\/([^/]+)/)?.[1];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") {
      const id = url.pathname.match(/\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}
