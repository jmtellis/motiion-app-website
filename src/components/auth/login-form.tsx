"use client";
import { ButtonProgress } from "./ButtonProgress";

import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { rememberLoginReturnPath } from "@/app/login/actions";
import { useMemo, useState } from "react";

import { SignupSplitDivider, SignupSplitOAuth } from "@/components/auth/SignupSplitOAuth";
import { resolveClientLoginDestination } from "@/lib/auth/login-redirect";
import { oauthErrorMessage } from "@/lib/auth/oauth-shared";
import { safeAuthReturnPath } from "@/lib/auth/redirects";
import { createClientSupabaseClient } from "@/lib/supabase/client";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const callbackError = useMemo(
    () => oauthErrorMessage(searchParams.get("error")),
    [searchParams],
  );
  const canSubmit = isValidEmail(email.trim()) && password.length > 0;

  async function handleSubmit(formData: FormData) {
    const nextEmail = String(formData.get("email") ?? "").trim();
    const nextPassword = String(formData.get("password") ?? "");
    const supabase = createClientSupabaseClient();

    if (!supabase) {
      setError("Sign-in is not configured yet. Add Supabase environment variables to enable auth.");
      return;
    }

    if (!isValidEmail(nextEmail) || !nextPassword) {
      setError("Enter a valid email and password to continue.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: nextEmail,
      password: nextPassword,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const nextParam = safeAuthReturnPath(searchParams.get("next"));
    const accountDestination = await resolveClientLoginDestination(supabase);
    if (nextParam && accountDestination.includes("onboarding")) await rememberLoginReturnPath(nextParam);
    let destination = accountDestination.includes("onboarding") ? accountDestination : nextParam ?? accountDestination;

    if (!nextParam && !accountDestination.includes("onboarding")) {
      try {
        const featured = window.localStorage.getItem(
          "motiion.pending_featured_talent_invite_token",
        );
        if (featured && featured.trim()) {
          destination = `/featured-invite/${encodeURIComponent(featured.trim().toLowerCase())}`;
        }
      } catch {
        // ignore
      }
    }

    // A fresh document discards any previous account's protected router cache.
    window.location.replace(destination);
    } catch { setError("Couldn’t finish signing in. Your account is safe; check your connection and try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="signup-split-form__body">
      <form action={handleSubmit} className="flex flex-col gap-4">
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

        <label className="signup-split-field">
          <span className="sr-only">Password</span>
          <div className="signup-split-password-wrap">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
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

        {error ? <div className="signup-split-error" role="alert">{error}</div> : null}
        {callbackError ? <div className="signup-split-error" role="alert">{callbackError}</div> : null}

        <button type="submit" className="signup-split-submit" disabled={loading || !canSubmit}>
          <ButtonProgress loading={loading}>{"Log in"}</ButtonProgress>
        </button>
      </form>

      <Link href="/forgot-password" className="signup-split-text-btn block text-center">Forgot your password?</Link>
      <SignupSplitDivider />
      <SignupSplitOAuth flow="login" disabled={loading} />


    </div>
  );
}
