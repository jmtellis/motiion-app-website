"use client";

import { useState } from "react";

import { AppleLogo } from "@/components/icons/AppleLogo";
import { GoogleLogo } from "@/components/icons/GoogleLogo";
import { buildOAuthRedirectUrl, type OAuthFlow } from "@/lib/auth/oauth-shared";
import { createClientSupabaseClient } from "@/lib/supabase/client";

type SignupPath = "talent" | "hiring";

export function SignupSplitOAuth({
  flow,
  signupPath = "talent",
  disabled = false,
}: {
  flow: OAuthFlow;
  signupPath?: SignupPath;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);

  async function handleOAuth(provider: "google" | "apple") {
    const supabase = createClientSupabaseClient();
    if (!supabase) {
      setError(
        `${flow === "login" ? "Sign-in" : "Sign-up"} is not configured yet. Add Supabase environment variables to enable auth.`,
      );
      return;
    }

    setLoadingProvider(provider);
    setError(null);

    const redirectTo = buildOAuthRedirectUrl({
      flow,
      accountType: signupPath === "talent" ? "talent" : "lookingForTalent",
      talentSubtype: signupPath === "talent" ? "dancer" : undefined,
      nonTalentType: signupPath === "hiring" ? "casting_director" : undefined,
    });

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoadingProvider(null);
    }
  }

  const isBusy = loadingProvider !== null;

  return (
    <div className="space-y-3">
      <div className="signup-split-oauth-row">
        <button
          type="button"
          className="signup-split-oauth-btn"
          disabled={disabled || isBusy}
          onClick={() => void handleOAuth("google")}
        >
          <GoogleLogo className="h-4 w-4 shrink-0" />
          {loadingProvider === "google" ? "…" : "Google"}
        </button>
        <button
          type="button"
          className="signup-split-oauth-btn"
          disabled={disabled || isBusy}
          onClick={() => void handleOAuth("apple")}
        >
          <AppleLogo className="h-4 w-4 shrink-0" />
          {loadingProvider === "apple" ? "…" : "Apple"}
        </button>
      </div>
      {error ? <div className="signup-split-error">{error}</div> : null}
    </div>
  );
}

export function SignupSplitDivider() {
  return (
    <div className="signup-split-divider">
      <span>Or</span>
    </div>
  );
}
