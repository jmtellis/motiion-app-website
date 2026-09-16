"use server";

import { buildTalentSpotlight, type TalentSpotlight } from "@/lib/program/talentSpotlight";
import { fetchPublicTalentProfile } from "@/lib/publicProfile";

/** Cast modal detail (credits + socials) — loaded on tap so the program page stays light. */
export async function fetchProgramTalentSpotlight(
  slug: string,
): Promise<TalentSpotlight | null> {
  const key = slug.trim();
  if (!key) return null;

  const profile = await fetchPublicTalentProfile(key);
  return profile ? buildTalentSpotlight(profile) : null;
}
