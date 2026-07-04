"use server";

import { getProfileDestination } from "@/lib/auth/profile";
import { getCurrentUserProfile } from "@/lib/auth/session";

export async function resolveLoginDestination(): Promise<string> {
  const profile = await getCurrentUserProfile();
  return getProfileDestination(profile);
}
