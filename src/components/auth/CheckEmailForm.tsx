"use client";

import { useState } from "react";

import { AuthSplitLink } from "@/components/auth/AuthSplitTransition";
import { buildOAuthRedirectUrl } from "@/lib/auth/oauth-shared";
import { createClientSupabaseClient } from "@/lib/supabase/client";

type CheckEmailFormProps = {
  email: string;
  accountType: "talent" | "lookingForTalent";
};

export function CheckEmailForm({ email, accountType }: CheckEmailFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signupPath = "/signup";

  async function handleResend() {
    const supabase = createClientSupabaseClient();

    if (!supabase) {
      setError("Sign-up is not configured yet. Add Supabase environment variables to enable auth.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: buildOAuthRedirectUrl({
          flow: "signup",
          accountType,
        }),
      },
    });

    setLoading(false);

    if (resendError) {
      setError(resendError.message);
      return;
    }

    setMessage("Confirmation email sent. Check your inbox.");
  }

  return (
    <div className="signup-split-form__body">
      <p className="signup-split-form__subtitle" style={{ marginTop: 0, textAlign: "center" }}>
        We sent a confirmation link to <strong style={{ color: "#fff" }}>{email}</strong>. Open it
        to continue setting up your account.
      </p>

      {error ? <div className="signup-split-error">{error}</div> : null}
      {message ? (
        <p className="signup-split-hint" style={{ textAlign: "center", color: "var(--accent)" }}>
          {message}
        </p>
      ) : null}

      <button
        type="button"
        className="signup-split-submit"
        disabled={loading}
        onClick={() => void handleResend()}
      >
        {loading ? "Sending…" : "Resend email"}
      </button>

      <div className="signup-split-alt-auth">
        <p className="signup-split-alt-auth__secondary">
          Wrong email?{" "}
          <AuthSplitLink
            href={signupPath}
            className="signup-split-text-btn signup-split-text-btn--accent"
          >
            Go back
          </AuthSplitLink>
        </p>
        <p className="signup-split-alt-auth__secondary">
          Already confirmed?{" "}
          <AuthSplitLink href="/login" className="signup-split-text-btn signup-split-text-btn--accent">
            Log in
          </AuthSplitLink>
        </p>
      </div>
    </div>
  );
}
