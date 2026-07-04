import type { PublicTalentProfile } from "@/types/public";

import {
  abbreviateEthnicity,
  abbreviateEyeColor,
  abbreviateGender,
  abbreviateHairColor,
} from "./profile-enums";

export type AttributeStripItem = {
  label: string;
  value: string;
};

function computeAge(dateOfBirth: string | null | undefined): number | null {
  const trimmed = dateOfBirth?.trim();
  if (!trimmed) return null;

  const birth = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return Math.max(0, age);
}

export function buildAttributeStrip(profile: PublicTalentProfile): AttributeStripItem[] {
  const items: AttributeStripItem[] = [];

  const gender = abbreviateGender(profile.gender);
  if (gender) items.push({ label: "Gender", value: gender });

  const height = profile.height?.trim();
  if (height) items.push({ label: "Height", value: height });

  const ethnicity = abbreviateEthnicity(profile.ethnicity);
  if (ethnicity) items.push({ label: "Ethnicity", value: ethnicity });

  const hair = abbreviateHairColor(profile.hair_color);
  if (hair) items.push({ label: "Hair", value: hair });

  const eyes = abbreviateEyeColor(profile.eye_color);
  if (eyes) items.push({ label: "Eyes", value: eyes });

  const age = computeAge(profile.date_of_birth);
  if (age !== null) items.push({ label: "Age", value: String(age) });

  return items;
}
