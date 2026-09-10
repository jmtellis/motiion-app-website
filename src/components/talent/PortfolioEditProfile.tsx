"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";

import { persistDeferredProfileProgress } from "@/app/profile/setup/actions";
import { ResponsiveModal } from "@/components/talent/ResponsiveModal";
import type { PublicTalentProfile } from "@/types/public";

const genderOptions = ["Woman", "Man", "Non-binary", "Prefer not to say", "Other"];
const unionOptions = ["Non-union", "SAG-AFTRA", "AEA", "AGMA", "Other"];

export function PortfolioEditProfile({ profile }: { profile: PublicTalentProfile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    displayName: profile.full_name ?? "",
    gender: profile.gender ?? "",
    ethnicity: profile.ethnicity ?? "",
    height: profile.height ?? "",
    hairColor: profile.hair_color ?? "",
    eyeColor: profile.eye_color ?? "",
    representation: profile.representation ?? "",
    unionStatus: profile.union_status ?? "",
    instagramUrl: profile.instagram_url ?? "",
    youtubeUrl: profile.youtube_url ?? "",
  });

  function save() {
    startTransition(async () => {
      const result = await persistDeferredProfileProgress({
        displayName: draft.displayName.trim() || undefined,
        gender: draft.gender.trim() || null,
        ethnicity: draft.ethnicity.trim() || null,
        height: draft.height.trim() || null,
        hairColor: draft.hairColor.trim() || null,
        eyeColor: draft.eyeColor.trim() || null,
        representation: draft.representation.trim() || null,
        unionStatus: draft.unionStatus.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="inline-flex h-10 items-center rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] px-4 text-sm font-medium text-[var(--ds-on-surface)] transition-colors hover:bg-[var(--ds-border-strong)]"
        >
          Edit profile
        </button>
        <Link
          href="/profile/setup"
          className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-[var(--ds-accent)] hover:opacity-90"
        >
          Complete profile
        </Link>
      </div>

      <ResponsiveModal open={open} onClose={() => setOpen(false)} title="Edit profile">
        <div className="space-y-4">
          <Field
            label="Display name"
            value={draft.displayName}
            onChange={(displayName) => setDraft((current) => ({ ...current, displayName }))}
          />
          <SelectField
            label="Gender"
            value={draft.gender}
            options={genderOptions}
            onChange={(gender) => setDraft((current) => ({ ...current, gender }))}
          />
          <Field
            label="Ethnicity"
            value={draft.ethnicity}
            onChange={(ethnicity) => setDraft((current) => ({ ...current, ethnicity }))}
          />
          <Field
            label="Height"
            value={draft.height}
            placeholder={`5'11"`}
            onChange={(height) => setDraft((current) => ({ ...current, height }))}
          />
          <Field
            label="Hair color"
            value={draft.hairColor}
            onChange={(hairColor) => setDraft((current) => ({ ...current, hairColor }))}
          />
          <Field
            label="Eye color"
            value={draft.eyeColor}
            onChange={(eyeColor) => setDraft((current) => ({ ...current, eyeColor }))}
          />
          <Field
            label="Representation"
            value={draft.representation}
            onChange={(representation) => setDraft((current) => ({ ...current, representation }))}
          />
          <SelectField
            label="Union status"
            value={draft.unionStatus}
            options={unionOptions}
            onChange={(unionStatus) => setDraft((current) => ({ ...current, unionStatus }))}
          />
          {error ? <p className="text-sm text-[var(--ds-error)]">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm text-[var(--ds-muted)] hover:bg-[var(--ds-surface-raised)]"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-full bg-[var(--ds-accent)] px-5 py-2 text-sm font-semibold text-[var(--ds-on-accent)] disabled:opacity-50"
              onClick={save}
              disabled={isPending}
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </ResponsiveModal>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[var(--ds-on-surface)]">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-background)] px-3 py-2.5 text-sm text-[var(--ds-text-default)] outline-none focus:border-[var(--ds-accent)]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[var(--ds-on-surface)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-background)] px-3 py-2.5 text-sm text-[var(--ds-text-default)] outline-none focus:border-[var(--ds-accent)]"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
