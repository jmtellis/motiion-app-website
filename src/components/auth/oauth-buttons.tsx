"use client";

import { useState } from "react";

import { AppleLogo } from "@/components/icons/AppleLogo";
import { GoogleLogo } from "@/components/icons/GoogleLogo";
import { AuthButton, AuthError } from "@/components/auth/ui";
import { buildOAuthRedirectUrl, type OAuthFlow } from "@/lib/auth/oauth-shared";
import { createClientSupabaseClient } from "@/lib/supabase/client";

type SignupPath = "talent" | "hiring";

type OAuthButtonsProps = {
  flow: OAuthFlow;
  signupPath?: SignupPath;
  talentSubtype?: string;
  nonTalentType?: string;
  companyName?: string;
  disabled?: boolean;
};

export function OAuthButtons({
  flow,
  signupPath = "talent",
  talentSubtype = "dancer",
  nonTalentType = "casting_director",
  companyName = "",
  disabled = false,
}: OAuthButtonsProps) {
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);

  async function handleOAuth(provider: "google" | "apple") {
    const supabase = createClientSupabaseClient();
    if (!supabase) {
      setError("Sign-in is not configured yet. Add Supabase environment variables to enable auth.");
      return;
    }

    setLoadingProvider(provider);
    setError(null);

    const redirectTo = buildOAuthRedirectUrl({
      flow,
      accountType: signupPath === "talent" ? "talent" : "lookingForTalent",
      talentSubtype: signupPath === "talent" ? talentSubtype : undefined,
      nonTalentType: signupPath === "hiring" ? nonTalentType : undefined,
      companyName: signupPath === "hiring" ? companyName : undefined,
    });

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        ...(provider === "google"
          ? {
              queryParams: {
                prompt: "select_account",
              },
            }
          : {}),
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
      <AuthButton
        type="button"
        variant="secondary"
        className="w-full gap-2"
        disabled={disabled || isBusy}
        onClick={() => void handleOAuth("google")}
      >
        <GoogleLogo className="h-5 w-5 shrink-0" />
        {loadingProvider === "google" ? "Redirecting…" : "Continue with Google"}
      </AuthButton>

      <AuthButton
        type="button"
        variant="secondary"
        className="w-full gap-2"
        disabled={disabled || isBusy}
        onClick={() => void handleOAuth("apple")}
      >
        <AppleLogo className="h-5 w-5 shrink-0" />
        {loadingProvider === "apple" ? "Redirecting…" : "Continue with Apple"}
      </AuthButton>

      {error ? <AuthError>{error}</AuthError> : null}
    </div>
  );
}

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-[var(--line)]" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white px-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          {label}
        </span>
      </div>
    </div>
  );
}
