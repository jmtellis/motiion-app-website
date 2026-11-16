import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";
import { getActiveShell, isOnboardingComplete } from "@/lib/auth/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { marketingAccountAction } from "@/lib/marketing/account-navigation";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export async function GET() {
  try {
    const profile = await getCurrentUserProfile();
    const industry = getActiveShell(profile) === "lookingForTalent";
    let approved = false;
    if (profile && industry) {
      const db = await createServerSupabaseClient();
      const result = db ? await db.rpc("has_industry_approval") : null;
      if (!result || result.error) throw new Error("Account status unavailable");
      approved = result.data === true;
    }
    const action = marketingAccountAction({
      signedIn: !!profile, industry, approved,
      setupComplete: !!profile && isOnboardingComplete(profile) && (!industry || !!profile.buyerOnboardingCompleted),
      destination: getProfileDestination(profile),
    });
    // Legacy access grants still use their own onboarding; only reviewed
    // applications may use the atomic approved-setup action.
    if (action.completeSetup && profile) {
      const db = await createServerSupabaseClient();
      const result = db ? await db.from("industry_applications").select("status").eq("user_id", profile.id).maybeSingle() : null;
      if (!result || result.error) throw new Error("Account status unavailable");
      if (result.data?.status !== "approved") {
        action.completeSetup = false;
        action.href = "/talent-buyers/onboarding";
      }
    }
    return Response.json(action, { headers });
  } catch {
    return Response.json({ error: "Account status unavailable" }, { status: 503, headers });
  }
}
