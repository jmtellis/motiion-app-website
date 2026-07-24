"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";

import { AuthSplitLink } from "@/components/auth/AuthSplitTransition";
import { SignupSplitDivider, SignupSplitOAuth } from "@/components/auth/SignupSplitOAuth";
import { trackClientEvent } from "@/lib/analytics/track-client";
import { oauthErrorMessage } from "@/lib/auth/oauth-shared";
import { createClientSupabaseClient } from "@/lib/supabase/client";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function TalentBuyerSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const callbackError = useMemo(
    () => oauthErrorMessage(searchParams.get("error")),
    [searchParams],
  );
  const canSubmit = isValidEmail(email.trim()) && password.length >= 8;

  async function handleSubmit(formData: FormData) {
    const supabase = createClientSupabaseClient();

    if (!supabase) {
      setError("Sign-up is not configured yet. Add Supabase environment variables to enable auth.");
      return;
    }

    const nextEmail = String(formData.get("email") ?? "").trim();
    const nextPassword = String(formData.get("password") ?? "");

    if (!isValidEmail(nextEmail) || nextPassword.length < 8) {
      setError("Enter a valid email and a password with at least 8 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: nextEmail,
      password: nextPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?flow=signup&account_type=lookingForTalent`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("We could not create your account. Please try again.");
      setLoading(false);
      return;
    }

    if (!data.session) {
      setError(
        "Your account was created, but email confirmation is required before you can continue. Confirm your email, then log in.",
      );
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      user_id: data.user.id,
      email: nextEmail,
      account_type: "lookingForTalent",
      talent_types: [],
      working_locations: [],
      skills: [],
      experiences: [],
      training: [],
      headshot_urls: [],
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    const { error: buyerError } = await supabase.from("non_talent_profiles").upsert({
      id: data.user.id,
      work_email: nextEmail,
      user_type: "talent_buyer",
    });

    if (buyerError) {
      setError(buyerError.message);
      setLoading(false);
      return;
    }

    trackClientEvent("user_signed_up", {
      account_type: "lookingForTalent",
      user_type: "talent_buyer",
    });

    router.push("/talent-buyers/onboarding");
    router.refresh();
  }

  return (
    <div className="signup-split-form__body">
      <nav className="signup-split-audience" aria-label="Other signup options">
        <AuthSplitLink href="/signup" className="signup-split-text-btn signup-split-text-btn--muted">
          Or sign up as talent
        </AuthSplitLink>
      </nav>

      <div className="signup-split-rule" aria-hidden />

      <form action={handleSubmit} className="flex flex-col gap-4">
        <label className="signup-split-field">
          <span>Email</span>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="eg. john@company.com"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="signup-split-field">
          <span>Password</span>
          <div className="signup-split-password-wrap">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="signup-split-password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <span className="signup-split-hint">Must be at least 8 characters.</span>
        </label>

        {error ? <div className="signup-split-error">{error}</div> : null}
        {callbackError ? <div className="signup-split-error">{callbackError}</div> : null}

        <button type="submit" className="signup-split-submit" disabled={loading || !canSubmit}>
          {loading ? "Creating account…" : "Sign Up"}
        </button>
      </form>

      <SignupSplitDivider />
      <SignupSplitOAuth flow="signup" signupPath="hiring" disabled={loading} />

      <div className="signup-split-alt-auth">
        <p className="signup-split-alt-auth__secondary">
          Already have an account?{" "}
          <AuthSplitLink href="/login" className="signup-split-text-btn signup-split-text-btn--accent">
            Log in
          </AuthSplitLink>
        </p>
      </div>
    </div>
  );
}
