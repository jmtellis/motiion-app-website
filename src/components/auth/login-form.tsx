"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";

import { AuthSplitLink } from "@/components/auth/AuthSplitTransition";
import { SignupSplitFormHeader } from "@/components/auth/SignupSplitShell";
import { SignupSplitDivider, SignupSplitOAuth } from "@/components/auth/SignupSplitOAuth";
import { resolveClientLoginDestination } from "@/lib/auth/login-redirect";
import { oauthErrorMessage } from "@/lib/auth/oauth-shared";
import { createClientSupabaseClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const callbackError = useMemo(
    () => oauthErrorMessage(searchParams.get("error")),
    [searchParams],
  );

  async function handleSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const supabase = createClientSupabaseClient();

    if (!supabase) {
      setError("Sign-in is not configured yet. Add Supabase environment variables to enable auth.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const nextParam = searchParams.get("next");
    const destination = nextParam?.startsWith("/")
      ? nextParam
      : await resolveClientLoginDestination(supabase);

    router.push(destination);
    router.refresh();
  }

  return (
    <div className="signup-split-form">
      <SignupSplitFormHeader
        title="Log in"
        subtitle="Sign in with the email and password for your account."
      />

      <div className="signup-split-form__body">
        <SignupSplitOAuth flow="login" disabled={loading} />
        <SignupSplitDivider />

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
                autoComplete="current-password"
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

          {error ? <div className="signup-split-error">{error}</div> : null}
          {callbackError ? <div className="signup-split-error">{callbackError}</div> : null}

          <button type="submit" className="signup-split-submit" disabled={loading}>
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        <div className="signup-split-signup-options">
          <p className="signup-split-signup-options__label">Need to create an account?</p>
          <div className="signup-split-signup-options__actions">
            <AuthSplitLink href="/signup" className="signup-split-text-btn">
              Sign up as talent
            </AuthSplitLink>
            <AuthSplitLink href="/talent-buyers/signup" className="signup-split-text-btn">
              Sign up as an industry professional
            </AuthSplitLink>
          </div>
        </div>
      </div>
    </div>
  );
}
