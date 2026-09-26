"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationTouched, setConfirmationTouched] = useState(false);
  const passwordStep = searchParams.get("step") === "password" && isValidEmail(email.trim());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const canSubmit = isValidEmail(email.trim()) && password.length >= 8 && password === confirmPassword;

  useEffect(() => {
    const featured = searchParams.get("featured");
    if (featured) {
      storePendingFeaturedTalentInviteToken(featured);
    }
  }, [searchParams]);

  function changeStep(step: "email" | "password") {
    setError(null);
    const params = new URLSearchParams(searchParams.toString());
    if (step === "password") params.set("step", "password");
    else params.delete("step");
    router.push(`/signup${params.size ? `?${params}` : ""}`, { scroll: false });
  }

  async function handleSubmit(formData: FormData) {
    if (!passwordStep) {
      if (isValidEmail(email.trim())) changeStep("password");
      return;
    }
    if (password !== confirmPassword) {
      setError("Your passwords don’t match. Please enter them again.");
      return;
    }
    const supabase = createClientSupabaseClient();

    if (!supabase) {
      setError("Sign-up is not configured yet. Add Supabase environment variables to enable auth.");
      return;
    }

    const nextEmail = email.trim();
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
        {!passwordStep ? (
        <label className="signup-split-field">
          <span className="sr-only">Email</span>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Email address"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        ) : <>
          <p className="signup-split-form__subtitle" aria-live="polite">Create your password for {email.trim()}</p>
        <label className="signup-split-field">
          <span className="sr-only">Password</span>
          <div className="signup-split-password-wrap">
            <input
              autoFocus
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password (8+ characters)"
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
        </label>

        <label className="signup-split-field">
          <span className="sr-only">Confirm password</span>
          <div className="signup-split-password-wrap">
            <input
              id="confirm-password"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Confirm your password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onBlur={() => setConfirmationTouched(true)}
              aria-invalid={confirmationTouched && password !== confirmPassword}
              aria-describedby={confirmationTouched && password !== confirmPassword ? "password-mismatch" : undefined}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
        </label>

        </>}

        {passwordStep && confirmationTouched && password !== confirmPassword ? (
          <p id="password-mismatch" className="signup-split-error" role="status">Passwords don’t match.</p>
        ) : null}
        {error ? <div className="signup-split-error" role="alert">{error}</div> : null}

        <button type="submit" className="signup-split-submit" disabled={loading || (passwordStep ? !canSubmit : !isValidEmail(email.trim()))}>
          {loading ? "Creating account…" : passwordStep ? "Sign Up" : "Continue with Email"}
        </button>
      </form>

      {passwordStep ? (
        <button type="button" className="signup-split-text-btn w-full" disabled={loading} onClick={() => changeStep("email")}>Back to email</button>
      ) : <>
        <SignupSplitDivider />
        <SignupSplitOAuth flow="signup" signupPath="talent" disabled={loading} />
      </>}


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

    </div>
  );
}
