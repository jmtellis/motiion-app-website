"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
  authChoiceCard,
} from "@/components/auth/ui";
import { nonTalentSubtypeOptions, talentSubtypeOptions } from "@/lib/mock-data";
import { createClientSupabaseClient } from "@/lib/supabase/client";

type SignupPath = "talent" | "hiring";

export function SignupForm() {
  const router = useRouter();
  const [path, setPath] = useState<SignupPath>("talent");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const accountType = useMemo(
    () => (path === "talent" ? "talent" : "lookingForTalent"),
    [path],
  );

  async function handleSubmit(formData: FormData) {
    const supabase = createClientSupabaseClient();

    if (!supabase) {
      setError("Sign-up is not configured yet. Add Supabase environment variables to enable auth.");
      return;
    }

    const fullName = String(formData.get("full_name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const companyName = String(formData.get("company_name") ?? "");
    const talentSubtype = String(formData.get("talent_subtype") ?? "");
    const nonTalentType = String(formData.get("non_talent_type") ?? "");

    setLoading(true);
    setError(null);

    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ");

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
      account_type: accountType,
      talent_types: path === "talent" && talentSubtype ? [talentSubtype] : [],
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

    if (path === "hiring") {
      const { error: nonTalentError } = await supabase.from("non_talent_profiles").upsert({
        id: data.user.id,
        company_name: companyName || null,
        non_talent_type: nonTalentType || null,
        work_email: email,
      });

      if (nonTalentError) {
        setError(nonTalentError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <AuthCard className="w-full max-w-2xl">
      <AuthCardHeader>
        <AuthCardTitle>Sign up</AuthCardTitle>
        <AuthMuted>
          Create your account, then finish your profile in our guided onboarding.
        </AuthMuted>
      </AuthCardHeader>
      <AuthCardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            {
              key: "talent" as const,
              title: "I'm talent",
              description: "Dancers and choreographers building a Motiion profile.",
            },
            {
              key: "hiring" as const,
              title: "I'm hiring",
              description: "Casting, creative, production, agency, and recruiting teams.",
            },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setPath(option.key)}
              className={authChoiceCard(path === option.key)}
            >
              <p className="text-lg font-semibold text-[var(--ink)]">{option.title}</p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">{option.description}</p>
            </button>
          ))}
        </div>

        <form action={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <AuthField label="Full name">
              <AuthInput id="full_name" name="full_name" placeholder="Jordan Lee" required />
            </AuthField>
          </div>
          <AuthField label={path === "hiring" ? "Work email" : "Email"}>
            <AuthInput id="email" name="email" type="email" placeholder="name@company.com" required />
          </AuthField>
          <AuthField label="Password">
            <AuthInput id="password" name="password" type="password" placeholder="Create a password" required />
          </AuthField>

          {path === "talent" ? (
            <label className="field md:col-span-2">
              <span>Talent subtype</span>
              <select id="talent_subtype" name="talent_subtype" defaultValue="dancer">
                {talentSubtypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <AuthField label="Company / organization">
                <AuthInput id="company_name" name="company_name" placeholder="Studio, agency, or brand" />
              </AuthField>
              <label className="field">
                <span>User type</span>
                <select id="non_talent_type" name="non_talent_type" defaultValue="casting_director">
                  {nonTalentSubtypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {error ? (
            <div className="md:col-span-2">
              <AuthError>{error}</AuthError>
            </div>
          ) : null}

          <div className="md:col-span-2">
            <AuthButton type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Continue to onboarding"}
            </AuthButton>
          </div>
        </form>

        <AuthMuted>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--accent-dark)] underline underline-offset-4">
            Log in
          </Link>
        </AuthMuted>
      </AuthCardContent>
    </AuthCard>
  );
}
