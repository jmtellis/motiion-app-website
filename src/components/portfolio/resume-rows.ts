import type { OwnerExperience } from "@/lib/app/portfolio-owner";
import {
  buildResumeExperienceItems,
  experienceDisplayTitle,
  type ResumeExperienceCategory,
} from "@/lib/profile/resume-experience";
import type { ProfileExperience } from "@/types/public";

export const RESUME_SECTIONS: { key: ResumeExperienceCategory; heading: string }[] = [
  { key: "televisionFilm", heading: "Television / Film" },
  { key: "printCommercial", heading: "Print / Commercial" },
  { key: "liveStage", heading: "Live / Stage" },
  { key: "musicVideos", heading: "Music Videos" },
];

export function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

export function rolesOf(entry: OwnerExperience) {
  const roles = list(entry.roles);
  return roles.length ? roles : text(entry.role) ? [text(entry.role)] : [];
}

export function creditColumn(entry: OwnerExperience) {
  const names = [
    ...list(entry.choreographers),
    ...list(entry.associate_choreographers),
    ...list(entry.assistants),
    text(entry.main_talent),
    text(entry.production_company) || text(entry.theater_name),
  ].filter(Boolean);
  return names.length ? names.join(", ") : "—";
}

export function projectColumn(entry: OwnerExperience, category: ResumeExperienceCategory) {
  return experienceDisplayTitle(entry as unknown as ProfileExperience, category).replace(/\s*\(\d{4}[^)]*\)\s*$/, "");
}

/** Resume sections in display order, each row keeping its index into `experiences`. */
export function resumeSections(experiences: OwnerExperience[]) {
  return RESUME_SECTIONS.map((section) => ({
    ...section,
    items: buildResumeExperienceItems(experiences as unknown as ProfileExperience[], section.key).map((item) => ({
      index: item.index,
      entry: experiences[item.index]!,
    })),
  }));
}
