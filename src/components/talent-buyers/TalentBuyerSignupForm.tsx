"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { SignupSplitFormHeader } from "@/components/auth/SignupSplitShell";
import { SignupSplitDivider, SignupSplitOAuth } from "@/components/auth/SignupSplitOAuth";
import { trackClientEvent } from "@/lib/analytics/track-client";
import { createClientSupabaseClient } from "@/lib/supabase/client";

export function TalentBuyerSignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    const supabase = createClientSupabaseClient();

    if (!supabase) {
      setError("Sign-up is not configured yet. Add Supabase environment variables to enable auth.");
      return;
    }

    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!firstName || !lastName) {
      setError("First and last name are required.");
      return;
    }

    const fullName = `${firstName} ${lastName}`.trim();

    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
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
      email,
      first_name: firstName,
      last_name: lastName,
      display_name: fullName,
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
      work_email: email,
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
    <div className="signup-split-form">
      <SignupSplitFormHeader
        title="Sign up as Industry Professional"
        subtitle="Create your account to discover talent and manage projects."
      />

      <div className="signup-split-form__body">
        <SignupSplitOAuth flow="signup" signupPath="hiring" disabled={loading} />
        <SignupSplitDivider />

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="signup-split-field-row">
            <label className="signup-split-field">
              <span>First Name</span>
              <input id="first_name" name="first_name" placeholder="eg. John" required autoComplete="given-name" />
            </label>
            <label className="signup-split-field">
              <span>Last Name</span>
              <input id="last_name" name="last_name" placeholder="eg. Francisco" required autoComplete="family-name" />
            </label>
          </div>

          <label className="signup-split-field">
            <span>Email</span>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="eg. john@company.com"
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
                minLength={8}
                autoComplete="new-password"
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

          <button type="submit" className="signup-split-submit" disabled={loading}>
            {loading ? "Creating account…" : "Sign Up"}
          </button>
        </form>

        <p className="signup-split-footer">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
        <p className="signup-split-footer">
          Joining as talent? <Link href="/signup">Dancer & choreographer sign up</Link>
        </p>
      </div>
    </div>
  );
}
