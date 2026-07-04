import { redirect } from "next/navigation";
import { headers } from "next/headers";

import {
  getOnboardingPath,
  getProfileDestination,
  isHiringAccount,
  isOnboardingComplete,
  isTalentAccount,
  toDashboardProfile,
} from "@/lib/auth/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DashboardProfile, NonTalentProfileRecord, ProfileRecord } from "@/types/database";

export { getOnboardingPath, getProfileDestination } from "@/lib/auth/profile";

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
    .select(
      "id, company_name, non_talent_type, work_email, user_type, primary_goal, role, organization_name, organization_website, company_size, talent_types, style_focus, markets, verification_links, notification_preferences, onboarding_completed",
    )
    .eq("id", user.id)
    .maybeSingle<NonTalentProfileRecord>();

  return toDashboardProfile(profile, nonTalentProfile);
}

export async function requireAuth() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    const headerList = await headers();
    const pathname = headerList.get("x-pathname") ?? "";
    if (pathname && pathname.startsWith("/") && !pathname.startsWith("/login")) {
      redirect(`/login?next=${encodeURIComponent(pathname)}`);
    }
    redirect("/login");
  }
  return profile;
}

export async function requireCompleteProfile() {
  const profile = await requireAuth();
  if (!isOnboardingComplete(profile)) redirect(getOnboardingPath(profile));
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

export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc("auth_is_platform_admin");
  if (error) {
    console.debug("auth_is_platform_admin failed:", error.message);
    return false;
  }

  return Boolean(data);
}

export async function requirePlatformAdmin() {
  const profile = await requireAuth();
  const isAdmin = await isPlatformAdmin();
  if (!isAdmin) redirect("/home");
  return profile;
}
