export type OAuthFlow = "login" | "signup";

export type OAuthSignupIntent = {
  flow: OAuthFlow;
  accountType: "talent" | "lookingForTalent";
  talentSubtype?: string;
  nonTalentType?: string;
  companyName?: string;
};

function resolveBrowserOrigin(): string {
  // Prefer the origin the user is actually on so OAuth always returns to the
  // current host (prod ↔ local), even if NEXT_PUBLIC_SITE_URL is mis-set.
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured && !/localhost|127\.0\.0\.1/i.test(configured)) {
    return configured;
  }

  return "https://www.motiion.app";
}

export function buildOAuthRedirectUrl(intent: OAuthSignupIntent): string {
  const origin = resolveBrowserOrigin();

  const params = new URLSearchParams({
    flow: intent.flow,
    account_type: intent.accountType,
  });

  if (intent.talentSubtype) {
    params.set("talent_subtype", intent.talentSubtype);
  }
  if (intent.nonTalentType) {
    params.set("non_talent_type", intent.nonTalentType);
  }
  if (intent.companyName) {
    params.set("company_name", intent.companyName);
  }

  return `${origin}/auth/callback?${params.toString()}`;
}

export function parseOAuthSignupIntent(searchParams: URLSearchParams): OAuthSignupIntent {
  const flow = searchParams.get("flow") === "signup" ? "signup" : "login";
  const accountType =
    searchParams.get("account_type") === "lookingForTalent" ? "lookingForTalent" : "talent";

  return {
    flow,
    accountType,
    talentSubtype: searchParams.get("talent_subtype") ?? undefined,
    nonTalentType: searchParams.get("non_talent_type") ?? undefined,
    companyName: searchParams.get("company_name") ?? undefined,
  };
}

export function oauthErrorMessage(code: string | null): string | null {
  if (!code) return null;

  switch (code) {
    case "auth_callback_failed":
      return "We could not finish signing you in. Please try again.";
    case "auth_callback_missing_code":
      return "The sign-in link was incomplete. Please try again.";
    case "profile_setup_failed":
      return "Your account signed in, but we could not finish setting up your profile.";
    default:
      return "Sign-in failed. Please try again.";
  }
}
