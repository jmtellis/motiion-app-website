"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { resolveLoginDestination } from "@/app/login/actions";
import {
  AuthButton,
  AuthCard,
  AuthCardContent,
  AuthCardHeader,
  AuthCardTitle,
  AuthError,
  AuthField,
  AuthInput,
  AuthMuted,
} from "@/components/auth/ui";
import { AuthDivider, OAuthButtons } from "@/components/auth/oauth-buttons";
import { oauthErrorMessage } from "@/lib/auth/oauth-shared";
import { createClientSupabaseClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const callbackError = useMemo(
    () => oauthErrorMessage(searchParams.get("error")),
    [searchParams],
  );

  async function handleSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "");
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
    const destination = nextParam?.startsWith("/") ? nextParam : await resolveLoginDestination();
    router.push(destination);
    router.refresh();
  }

  return (
    <AuthCard className="w-full max-w-md">
      <AuthCardHeader>
        <AuthCardTitle>Log in</AuthCardTitle>
        <AuthMuted>Sign in with the email and password for your account.</AuthMuted>
      </AuthCardHeader>
      <AuthCardContent>
        <OAuthButtons flow="login" disabled={loading} />
        <AuthDivider label="or continue with email" />

        <form action={handleSubmit} className="space-y-4">
          <AuthField label="Email">
            <AuthInput id="email" name="email" type="email" placeholder="name@company.com" required />
          </AuthField>
          <AuthField label="Password">
            <AuthInput
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
            />
          </AuthField>
          {error ? <AuthError>{error}</AuthError> : null}
          {callbackError ? <AuthError>{callbackError}</AuthError> : null}
          <AuthButton type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Log in"}
          </AuthButton>
        </form>
        <AuthMuted className="mt-6">
          Need an account?{" "}
          <Link href="/signup" className="font-medium text-[var(--accent-dark)] underline underline-offset-4">
            Sign up
          </Link>
        </AuthMuted>
      </AuthCardContent>
    </AuthCard>
  );
}
