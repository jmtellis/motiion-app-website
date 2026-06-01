import { redirect } from "next/navigation";

import {
  isHiringAccount,
  isOnboardingComplete,
  isTalentAccount,
  toDashboardProfile,
} from "@/lib/auth/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DashboardProfile, NonTalentProfileRecord, ProfileRecord } from "@/types/database";

export function getProfileDestination(profile: DashboardProfile | null) {
  if (!profile) return "/login";
  if (!isOnboardingComplete(profile)) return "/onboarding";
  if (isTalentAccount(profile.accountType) || isHiringAccount(profile.accountType)) return "/home";
  return "/onboarding";
}

export async function getCurrentUserProfile(): Promise<DashboardProfile | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "user_id, email, first_name, last_name, display_name, account_type, username, talent_types, headshot_urls, onboarding_completed_at",
    )
    .eq("user_id", user.id)
    .maybeSingle<ProfileRecord>();

  if (!profile) {
    return {
      id: user.id,
      email: user.email ?? null,
      fullName: user.user_metadata.full_name ?? user.email ?? "Motiion User",
      accountType: null,
      onboardingCompletedAt: null,
      talentTypes: null,
    };
  }

  const { data: nonTalentProfile } = await supabase
    .from("non_talent_profiles")
    .select("id, company_name, non_talent_type, work_email")
    .eq("id", user.id)
    .maybeSingle<NonTalentProfileRecord>();

  return toDashboardProfile(profile, nonTalentProfile);
}

export async function requireAuth() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireCompleteProfile() {
  const profile = await requireAuth();
  if (!isOnboardingComplete(profile)) redirect("/onboarding");
  return profile;
}

export async function requireTalentAccount() {
  const profile = await requireCompleteProfile();
  if (!isTalentAccount(profile.accountType)) redirect(getProfileDestination(profile));
  return profile;
}

export async function requireHiringAccount() {
  const profile = await requireCompleteProfile();
  if (!isHiringAccount(profile.accountType)) redirect(getProfileDestination(profile));
  return profile;
}
