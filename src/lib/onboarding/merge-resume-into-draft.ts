import type { OnboardingDraft, OnboardingExperience, OnboardingTraining } from "@/types/onboarding";
import type { ExtractedResumeData, ExtractedResumeExperience } from "@/lib/onboarding/resume-types";

function nonEmpty(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function titleCaseName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function experienceTitle(exp: ExtractedResumeExperience) {
  return (
    nonEmpty(exp.title) ??
    nonEmpty(exp.projectTitle) ??
    nonEmpty(exp.songTitle) ??
    "Untitled credit"
  );
}

function experienceCredits(exp: ExtractedResumeExperience) {
  return (
    nonEmpty(exp.credits) ??
    nonEmpty(exp.studio) ??
    nonEmpty(exp.company) ??
    nonEmpty(exp.artist) ??
    ""
  );
}

function mapExperience(exp: ExtractedResumeExperience): OnboardingExperience | null {
  const title = experienceTitle(exp);
  if (!title) return null;

  return {
    title,
    role: nonEmpty(exp.role) ?? undefined,
    credits: experienceCredits(exp) || undefined,
    category: nonEmpty(exp.category) ?? undefined,
    start_date: nonEmpty(exp.startDate) ?? undefined,
    end_date: nonEmpty(exp.endDate) ?? undefined,
    notes: nonEmpty(exp.notes) ?? undefined,
  };
}

function mapTraining(
  items: ExtractedResumeData["training"],
): OnboardingTraining[] {
  if (!items?.length) return [];

  const mapped: OnboardingTraining[] = [];

  for (const item of items) {
    const name = nonEmpty(item.name);
    if (!name) continue;
    mapped.push({
      name,
      program: nonEmpty(item.program) ?? undefined,
      start_year: nonEmpty(item.startDate) ?? undefined,
      end_year: nonEmpty(item.endDate) ?? undefined,
    });
  }

  return mapped;
}

/** Onboarding replace policy — mirrors iOS ResumeExtractionMerge.onboardingReplace. */
export function mergeResumeIntoDraft(
  resumeUrl: string,
  extracted: ExtractedResumeData,
): Partial<OnboardingDraft> {
  const patch: Partial<OnboardingDraft> = { resumeUrl };

  const name = nonEmpty(extracted.name);
  if (name) {
    patch.displayName = titleCaseName(name);
  }

  const experiences =
    extracted.experiences
      ?.map(mapExperience)
      .filter((item): item is OnboardingExperience => item !== null) ?? [];

  if (experiences.length) {
    patch.experiences = experiences;
  }

  const training = mapTraining(extracted.training);
  if (training.length) {
    patch.training = training;
  }

  if (extracted.skills?.length) {
    patch.skills = extracted.skills.map((s) => s.trim()).filter(Boolean);
  }

  if (nonEmpty(extracted.height)) patch.height = extracted.height!.trim();
  if (nonEmpty(extracted.ethnicity)) patch.ethnicity = extracted.ethnicity!.trim();
  if (nonEmpty(extracted.hairColor)) patch.hairColor = extracted.hairColor!.trim();
  if (nonEmpty(extracted.eyeColor)) patch.eyeColor = extracted.eyeColor!.trim();
  if (nonEmpty(extracted.gender)) patch.gender = extracted.gender!.trim();
  if (nonEmpty(extracted.unionStatus)) patch.unionStatus = extracted.unionStatus!.trim();

  if (extracted.workLocations?.length) {
    patch.workingLocations = extracted.workLocations.map((l) => l.trim()).filter(Boolean);
  }

  const agent = nonEmpty(extracted.agent);
  if (agent) {
    patch.representation = agent;
    patch.agent = agent;
  }

  return patch;
}
