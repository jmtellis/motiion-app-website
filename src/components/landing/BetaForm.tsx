"use client";

import { FormEvent, useState } from "react";

type FormState = {
  fullName: string;
  email: string;
  role: string;
  notes: string;
};

const INITIAL_STATE: FormState = {
  fullName: "",
  email: "",
  role: "",
  notes: "",
};

export function BetaForm() {
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/beta-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        const result = (await response.json()) as { message?: string };
        throw new Error(result.message ?? "Unable to submit your request.");
      }

      setIsSuccess(true);
      setFormState(INITIAL_STATE);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[var(--line)] bg-white p-6 shadow-[0_16px_45px_rgba(0,0,0,0.06)] md:p-8">
      {isSuccess ? (
        <div
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-semibold tracking-tight text-emerald-800">
            You’re on the list.
          </p>
          <p className="mt-1 text-sm text-emerald-700">
            Thanks for requesting access to the Motiion beta. We’ll reach out as
            spots open.
          </p>
        </div>
      ) : null}
      {submitError ? (
        <div
          className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm font-medium text-red-700">{submitError}</p>
        </div>
      ) : null}

      <form
        className={`mt-0 space-y-4 ${isSuccess ? "pt-5" : ""}`}
        onSubmit={handleSubmit}
      >
        <label className="field">
          <span>Full name</span>
          <input
            required
            value={formState.fullName}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, fullName: event.target.value }))
            }
            type="text"
            name="fullName"
            autoComplete="name"
            placeholder="Alex Rivera"
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            required
            value={formState.email}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, email: event.target.value }))
            }
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@email.com"
          />
        </label>

        <label className="field">
          <span>Role</span>
          <select
            required
            value={formState.role}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, role: event.target.value }))
            }
            name="role"
          >
            <option value="" disabled>
              Select your role
            </option>
            <option value="dancer">Dancer</option>
            <option value="choreographer">Choreographer</option>
            <option value="creative-director">Creative Director</option>
            <option value="casting-team">Casting Team</option>
            <option value="agency-or-manager">Agency / Manager</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="field">
          <span>Optional notes</span>
          <textarea
            value={formState.notes}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, notes: event.target.value }))
            }
            name="notes"
            rows={3}
            placeholder="Anything else we should know?"
          />
        </label>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Join Beta"}
        </button>
      </form>
    </div>
  );
}
