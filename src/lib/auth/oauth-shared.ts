import { safeAuthReturnPath } from "./redirects";
import type { User } from "@supabase/supabase-js";

export type OAuthFlow = "login" | "signup";

export type OAuthAccountType = "talent" | "lookingForTalent";

export type OAuthSignupIntent = {
  flow: OAuthFlow;
  accountType: OAuthAccountType;
  talentSubtype?: string;
  nonTalentType?: string;
  companyName?: string;
  returnTo?: string;
  provider?: "google" | "apple";
};

/** Persisted on auth.users.raw_user_meta_data so email-confirm survives lost query params. */
export const SIGNUP_META_ACCOUNT_TYPE = "motiion_account_type";
export const SIGNUP_META_FLOW = "motiion_signup_flow";

export function resolveBrowserOrigin(): string {
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
  if (intent.provider) params.set("provider", intent.provider);

  if (intent.talentSubtype) {
    params.set("talent_subtype", intent.talentSubtype);
  }
  if (intent.nonTalentType) {
    params.set("non_talent_type", intent.nonTalentType);
  }
  if (intent.companyName) {
    params.set("company_name", intent.companyName);
  }

  const returnTo = safeAuthReturnPath(intent.returnTo);
  if (returnTo) params.set("next", returnTo);
  return `${origin}/auth/callback?${params.toString()}`;
}

/** A generic expired-link page does not know the signup role; metadata owns it. */
export function buildEmailConfirmationRedirectUrl(accountType?: OAuthAccountType, returnTo?: string): string {
  return accountType
    ? buildOAuthRedirectUrl({ flow: "signup", accountType, returnTo })
    : `${resolveBrowserOrigin()}/auth/callback?flow=signup`;
}

/** Metadata written at email/password signup so confirm + first login keep the lane. */
export function buildSignupUserMetadata(accountType: OAuthAccountType, returnTo?: string | null) {
  return {
    [SIGNUP_META_ACCOUNT_TYPE]: accountType,
    [SIGNUP_META_FLOW]: "signup",
    ...(safeAuthReturnPath(returnTo) ? { motiion_return_to: safeAuthReturnPath(returnTo) } : {}),
  } as const;
}

export function parseAccountTypeParam(value: string | null | undefined): OAuthAccountType | null {
  if (value === "lookingForTalent" || value === "looking_for_talent") {
    return "lookingForTalent";
  }
  if (value === "talent") {
    return "talent";
  }
  return null;
}

export function parseOAuthSignupIntent(searchParams: URLSearchParams): OAuthSignupIntent {
  const flow = searchParams.get("flow") === "signup" ? "signup" : "login";
  const accountType = parseAccountTypeParam(searchParams.get("account_type")) ?? "talent";

  return {
    flow,
    accountType,
    talentSubtype: searchParams.get("talent_subtype") ?? undefined,
    nonTalentType: searchParams.get("non_talent_type") ?? undefined,
    companyName: searchParams.get("company_name") ?? undefined,
  };
}

/**
 * Resolve signup lane from callback query params, falling back to auth user metadata.
 * Email confirmation often drops `flow=signup` from the redirect URL; metadata survives.
 */
export function resolveSignupIntent(
  searchParams: URLSearchParams,
  user?: User | null,
): OAuthSignupIntent {
  const fromQuery = parseOAuthSignupIntent(searchParams);
  const metadataIntent = signupIntentFromUserMetadata(user ?? null);

  const queryHasAccountType = Boolean(parseAccountTypeParam(searchParams.get("account_type")));
  const queryHasFlow = searchParams.get("flow") === "signup" || searchParams.get("flow") === "login";

  const accountType = queryHasAccountType
    ? fromQuery.accountType
    : (metadataIntent?.accountType ?? fromQuery.accountType);

  // Prefer explicit query flow; otherwise treat missing flow + signup metadata as signup
  // (the common email-confirm case where Supabase strips or omits intent params).
  let flow: OAuthFlow = fromQuery.flow;
  if (!queryHasFlow && metadataIntent) {
    flow = "signup";
  } else if (searchParams.get("flow") === "signup") {
    flow = "signup";
  }

  return {
    flow,
    accountType,
    talentSubtype: fromQuery.talentSubtype,
    nonTalentType: fromQuery.nonTalentType,
    companyName: fromQuery.companyName,
  };
}

export function signupIntentFromUserMetadata(user: User | null | undefined): OAuthSignupIntent | null {
  if (!user) return null;
  const metadata = user.user_metadata ?? {};
  const accountType = parseAccountTypeParam(
    typeof metadata[SIGNUP_META_ACCOUNT_TYPE] === "string"
      ? metadata[SIGNUP_META_ACCOUNT_TYPE]
      : typeof metadata.account_type === "string"
        ? metadata.account_type
        : null,
  );
  if (!accountType) return null;
  return {
    flow: "signup",
    accountType,
  };
}

export function oauthErrorMessage(code: string | null): string | null {
  if (!code) return null;

  switch (code) {
    case "access_denied":
      return "Sign-in was cancelled or permission was not granted. Try again or use another sign-in method.";
    case "email_link_expired":
      return "This email link has expired or has already been used. Log in if you already confirmed, or request a new link.";
    case "email_link_browser":
      return "Your email may already be confirmed. Log in to continue on this device.";
    case "auth_callback_failed":
      return "We could not finish signing you in. Please try again.";
    case "auth_callback_missing_code":
      return "The sign-in link was incomplete. Please try again.";
    case "profile_setup_failed":
      return "Your account signed in, but we could not finish setting up your profile.";
    case "no_account":
      return "No Motiion account found for that login. Sign up to continue.";
    default:
      return "Sign-in failed. Please try again.";
  }
}
