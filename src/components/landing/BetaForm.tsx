"use client";

import { FormEvent, useState } from "react";

type FormState = {
  fullName: string;
  email: string;
  role: string;
  instagram: string;
  references: string[];
  notes: string;
};

const INITIAL_STATE: FormState = {
  fullName: "",
  email: "",
  role: "",
  instagram: "",
  references: [],
  notes: "",
};

const REFERENCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "instagram", label: "Instagram" },
  { value: "friend-family", label: "Friend / Family" },
  { value: "motiion-founders", label: "Motiion founders" },
] as const;

function fieldClass(compact: boolean) {
  return compact ? "field field-compact" : "field";
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function BetaForm({
  compact = false,
  dark = false,
  embedded = false,
}: {
  compact?: boolean;
  dark?: boolean;
  /** Render without outer card chrome (e.g. inside a modal). */
  embedded?: boolean;
}) {
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

  const shellClass = embedded
    ? ""
    : cn(
        compact
          ? "rounded-2xl border p-4 sm:p-5"
          : "rounded-3xl border p-6 md:p-8",
        dark
          ? "border-white/12 bg-black shadow-[0_12px_40px_rgba(0,0,0,0.4)] [&_.field>span]:text-white/85 [&_.field>legend]:text-white/85 [&_.field>input]:border-white/15 [&_.field>input]:bg-black [&_.field>input]:text-white [&_.field>input]::placeholder:text-white/35 [&_.field>textarea]:border-white/15 [&_.field>textarea]:bg-black [&_.field>textarea]:text-white [&_.field>select]:border-white/15 [&_.field>select]:bg-black [&_.field>select]:text-white [&_label]:text-white/80"
          : "border-[var(--line)] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.06)] sm:shadow-[0_16px_45px_rgba(0,0,0,0.06)]",
      );

  const formSpaceClass = compact ? "space-y-2.5" : "space-y-4";
  const statusClass = compact ? "rounded-xl p-3.5 text-xs" : "rounded-2xl p-5 text-sm";

  return (
    <div className={shellClass}>
      {isSuccess ? (
        <div
          className={`border border-emerald-200 bg-emerald-50 ${statusClass}`}
          role="status"
          aria-live="polite"
        >
          <p className="font-semibold tracking-tight text-emerald-800">You’re on the list.</p>
          <p className="mt-0.5 text-emerald-700">
            Thanks for requesting access to the Motiion beta. We’ll reach out as spots open.
          </p>
        </div>
      ) : null}
      {submitError ? (
        <div
          className={`mt-2.5 border border-red-200 bg-red-50 ${statusClass}`}
          role="alert"
          aria-live="polite"
        >
          <p className="font-medium text-red-700">{submitError}</p>
        </div>
      ) : null}

      <form
        className={`${formSpaceClass} ${isSuccess ? (compact ? "pt-2.5" : "pt-5") : ""}`}
        onSubmit={handleSubmit}
      >
        <div className={compact ? "grid gap-2.5 sm:grid-cols-2" : "contents"}>
          <label className={fieldClass(compact)}>
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

          <label className={fieldClass(compact)}>
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
        </div>

        <div className={compact ? "grid gap-2.5 sm:grid-cols-2" : "contents"}>
          <label className={fieldClass(compact)}>
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

          <label className={fieldClass(compact)}>
            <span>Instagram</span>
            <input
              value={formState.instagram}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, instagram: event.target.value }))
              }
              type="text"
              name="instagram"
              autoComplete="off"
              placeholder="@yourhandle"
            />
          </label>
        </div>

        <div className={fieldClass(compact)}>
          <span>Optional notes</span>
          <fieldset className="min-w-0 border-0 p-0">
            <legend
              className={`mb-1.5 font-semibold ${dark ? "text-white/85" : "text-[var(--ink)]"} ${compact ? "text-xs leading-snug" : "text-[0.85rem]"}`}
            >
              How did you hear about us?{" "}
              <span className={`font-normal ${dark ? "text-white/50" : "text-[var(--ink-soft)]"}`}>(select all)</span>
            </legend>
            <div
              className={
                compact
                  ? "grid grid-cols-2 gap-x-2 gap-y-1.5"
                  : "grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-2"
              }
            >
              {REFERENCE_OPTIONS.map((option) => {
                const checked = formState.references.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={`inline-flex cursor-pointer items-center gap-2 ${dark ? "text-white/80" : "text-[var(--ink)]"} ${compact ? "text-xs" : "gap-2.5 text-sm"}`}
                  >
                    <input
                      type="checkbox"
                      name="references"
                      value={option.value}
                      checked={checked}
                      onChange={(event) => {
                        const { checked: isChecked } = event.target;
                        setFormState((prev) => ({
                          ...prev,
                          references: isChecked
                            ? [...prev.references, option.value]
                            : prev.references.filter((item) => item !== option.value),
                        }));
                      }}
                      className={
                        compact ? "h-3.5 w-3.5 accent-[var(--accent)]" : "h-4 w-4 accent-[var(--accent)]"
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <textarea
            value={formState.notes}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, notes: event.target.value }))
            }
            name="notes"
            rows={compact ? 2 : 3}
            placeholder="Anything else we should know?"
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Join Beta"}
        </button>
      </form>
    </div>
  );
}
