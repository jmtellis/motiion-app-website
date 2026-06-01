"use client";

import { FormEvent, useState } from "react";

type AudienceType = "talent" | "client";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  audienceType: AudienceType | "";
  company: string;
  roleTitle: string;
  message: string;
};

const INITIAL_STATE: FormState = {
  fullName: "",
  email: "",
  phone: "",
  audienceType: "",
  company: "",
  roleTitle: "",
  message: "",
};

function fieldClass(compact: boolean) {
  return compact ? "field field-compact" : "field";
}

export function DemoRequestForm({ compact = false }: { compact?: boolean }) {
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        const result = (await response.json()) as { message?: string };
        throw new Error(result.message ?? "Unable to submit your request.");
      }

      setIsSuccess(true);
      setFormState(INITIAL_STATE);
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const shellClass = compact
    ? "rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_12px_32px_rgba(0,0,0,0.06)] sm:p-5"
    : "rounded-3xl border border-[var(--line)] bg-white p-6 shadow-[0_16px_45px_rgba(0,0,0,0.06)] md:p-8";

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
          <p className="font-semibold text-emerald-800">Request received</p>
          <p className="mt-0.5 text-emerald-700">
            Thanks for reaching out. The Motiion team will contact you shortly.
          </p>
        </div>
      ) : null}

      {submitError ? (
        <div className={`mt-2.5 border border-red-200 bg-red-50 ${statusClass}`} role="alert">
          <p className="font-medium text-red-700">{submitError}</p>
        </div>
      ) : null}

      <form className={`${formSpaceClass} ${isSuccess ? (compact ? "pt-2.5" : "pt-5") : ""}`} onSubmit={handleSubmit}>
        <fieldset className={fieldClass(compact)}>
          <legend className={compact ? "text-xs" : undefined}>I am</legend>
          <div className={`flex flex-wrap gap-2 ${compact ? "pt-0.5" : "pt-1"}`}>
            {(
              [
                { value: "talent", label: "Talent" },
                { value: "client", label: "Client" },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full border font-medium transition ${
                  compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
                } ${
                  formState.audienceType === option.value
                    ? "border-[var(--accent-dark)] bg-[color-mix(in_oklab,var(--accent),white_88%)] text-[var(--ink)]"
                    : "border-[var(--line)] bg-white text-[var(--ink-soft)] hover:border-[#d6d4ce]"
                }`}
              >
                <input
                  type="radio"
                  name="audienceType"
                  value={option.value}
                  checked={formState.audienceType === option.value}
                  onChange={() =>
                    setFormState((prev) => ({ ...prev, audienceType: option.value }))
                  }
                  className="sr-only"
                  required={!formState.audienceType}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className={compact ? "grid gap-2.5 sm:grid-cols-2" : "contents"}>
          <label className={fieldClass(compact)}>
            <span>Full name</span>
            <input
              required
              type="text"
              name="fullName"
              autoComplete="name"
              value={formState.fullName}
              onChange={(e) => setFormState((p) => ({ ...p, fullName: e.target.value }))}
              placeholder="Jordan Lee"
            />
          </label>

          <label className={fieldClass(compact)}>
            <span>Email</span>
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              value={formState.email}
              onChange={(e) => setFormState((p) => ({ ...p, email: e.target.value }))}
              placeholder="you@company.com"
            />
          </label>
        </div>

        <div className={compact ? "grid gap-2.5 sm:grid-cols-2" : "contents"}>
          <label className={fieldClass(compact)}>
            <span>Phone</span>
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              value={formState.phone}
              onChange={(e) => setFormState((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000"
            />
          </label>

          <label className={fieldClass(compact)}>
            <span>Role or title</span>
            <input
              type="text"
              name="roleTitle"
              value={formState.roleTitle}
              onChange={(e) => setFormState((p) => ({ ...p, roleTitle: e.target.value }))}
              placeholder={
                formState.audienceType === "client" ? "Casting director" : "Dancer / choreographer"
              }
            />
          </label>
        </div>

        {formState.audienceType === "client" ? (
          <label className={fieldClass(compact)}>
            <span>Company / organization</span>
            <input
              type="text"
              name="company"
              value={formState.company}
              onChange={(e) => setFormState((p) => ({ ...p, company: e.target.value }))}
              placeholder="Studio, agency, or brand"
            />
          </label>
        ) : null}

        <label className={fieldClass(compact)}>
          <span>How can we help?</span>
          <textarea
            name="message"
            rows={compact ? 3 : 4}
            value={formState.message}
            onChange={(e) => setFormState((p) => ({ ...p, message: e.target.value }))}
            placeholder="Tell us about your team, timeline, or what you want to see in a demo."
          />
        </label>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Submit request"}
        </button>
      </form>
    </div>
  );
}
