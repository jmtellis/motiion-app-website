"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

import { AuthSplitLink } from "@/components/auth/AuthSplitTransition";
import { SignupSplitDivider, SignupSplitOAuth } from "@/components/auth/SignupSplitOAuth";
import { trackClientEvent } from "@/lib/analytics/track-client";
import { buildOAuthRedirectUrl, buildSignupUserMetadata } from "@/lib/auth/oauth-shared";
import { storePendingFeaturedTalentInviteToken } from "@/lib/publicFeaturedTalentInvite";
import { createClientSupabaseClient } from "@/lib/supabase/client";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const canSubmit = isValidEmail(email.trim()) && password.length >= 8;

  useEffect(() => {
    const featured = searchParams.get("featured");
    if (featured) {
      storePendingFeaturedTalentInviteToken(featured);
    }
  }, [searchParams]);

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
        emailRedirectTo: buildOAuthRedirectUrl({
          flow: "signup",
          accountType: "talent",
        }),
        data: buildSignupUserMetadata("talent"),
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
      router.push(`/signup/check-email?email=${encodeURIComponent(nextEmail)}`);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      user_id: data.user.id,
      email: nextEmail,
      account_type: "talent",
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

    trackClientEvent("user_signed_up", {
      account_type: "talent",
    });

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="signup-split-form__body">
      <form action={handleSubmit} className="flex flex-col gap-4">
        <label className="signup-split-field">
          <span>Email</span>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="eg. johnfrans@gmail.com"
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

        <p className="signup-split-legal">
          By creating an account, you agree to our{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            Terms and Conditions
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          .
        </p>

        <button type="submit" className="signup-split-submit" disabled={loading || !canSubmit}>
          {loading ? "Creating account…" : "Sign Up"}
        </button>
      </form>

      <SignupSplitDivider />
      <SignupSplitOAuth flow="signup" signupPath="talent" disabled={loading} />

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
