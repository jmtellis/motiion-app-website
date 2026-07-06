import { getProfileDestination, normalizeAccountType } from "@/lib/auth/profile";
import type { DashboardProfile } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveClientLoginDestination(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/login";

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, onboarding_completed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return "/onboarding";
  }

  const destinationProfile = {
    accountType: normalizeAccountType(profile.account_type),
    onboardingCompletedAt: profile.onboarding_completed_at ?? null,
  } as DashboardProfile;

  return getProfileDestination(destinationProfile);
}
