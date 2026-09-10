import type { SupabaseClient, User } from "@supabase/supabase-js";

import { ensureOAuthProfile } from "@/lib/auth/oauth-server";
import {
  signupIntentFromUserMetadata,
  type OAuthSignupIntent,
} from "@/lib/auth/oauth-shared";
import { getProfileDestination, normalizeAccountType } from "@/lib/auth/profile";
import type { DashboardProfile } from "@/types/database";

/**
 * After password login (or post-confirm session), send the user to the right shell.
 * If they signed up as talent but never got a profiles row (email-confirm race),
 * create it from auth metadata instead of dumping them into hiring signup.
 */
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
    const intent = signupIntentFromUserMetadata(user);
    if (intent) {
      try {
        await ensureOAuthProfile(supabase, user, intent);
      } catch (error) {
        console.error("login profile bootstrap failed:", error);
        return "/signup";
      }

      const { data: created } = await supabase
        .from("profiles")
        .select("account_type, onboarding_completed_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (created) {
        return getProfileDestination({
          accountType: normalizeAccountType(created.account_type),
          onboardingCompletedAt: created.onboarding_completed_at ?? null,
        } as DashboardProfile);
      }

      return intent.accountType === "lookingForTalent"
        ? "/talent-buyers/onboarding"
        : "/onboarding";
    }

    // Unknown identity with no Motiion profile — talent signup is the default entry.
    return "/signup";
  }

  const destinationProfile = {
    accountType: normalizeAccountType(profile.account_type),
    onboardingCompletedAt: profile.onboarding_completed_at ?? null,
  } as DashboardProfile;

  return getProfileDestination(destinationProfile);
}

export function intentForMissingProfileRedirect(
  intent: OAuthSignupIntent,
  user?: User | null,
): string {
  void intent;
  void user;
  return "/signup";
}
