"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import {
  deleteOwnExperience,
  listOwnExperiences,
  upsertOwnExperience,
  type ExperienceCredit,
} from "@/app/(app)/portfolio/experience-actions";

/**
 * Canonical credits editor — reads/writes profiles.experiences (iOS store).
 * Projects into talent_credits for Navigator search when possible.
 */
export function ExperiencesCreditsManager({
  initialExperiences = [],
}: {
  initialExperiences?: ExperienceCredit[];
}) {
  const [experiences, setExperiences] = useState<ExperienceCredit[]>(initialExperiences);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await listOwnExperiences();
      if (result.error) setError(result.error);
      else setExperiences(result.experiences);
    });
  }, []);

  function addCredit() {
    if (!title.trim()) {
      setError("Add a title for this credit.");
      return;
    }
    startTransition(async () => {
      const result = await upsertOwnExperience({ title: title.trim(), role: role.trim() || undefined });
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setTitle("");
      setRole("");
      setExperiences(result.experiences ?? []);
    });
  }

  function removeCredit(id: string) {
    startTransition(async () => {
      const result = await deleteOwnExperience(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setExperiences(result.experiences ?? []);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mono text-xs font-medium tracking-[0.08em] text-[var(--ds-muted)] uppercase">
          Credits
        </h2>
        {isPending ? <Loader2 className="size-4 animate-spin text-[var(--ds-muted)]" /> : null}
      </div>

      {error ? <p className="text-sm text-[var(--ds-error)]">{error}</p> : null}

      {experiences.length ? (
        <ul className="divide-y divide-[var(--ds-border)] overflow-hidden rounded-[var(--ds-radius-card)] border border-[var(--ds-border)] bg-[var(--ds-surface)]">
          {experiences.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--ds-text-default)]">{item.title}</p>
                {item.role ? (
                  <p className="mt-0.5 text-sm text-[var(--ds-muted)]">{item.role}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-[var(--ds-muted)] hover:bg-[var(--ds-surface-raised)] hover:text-[var(--ds-error)]"
                onClick={() => item.id && removeCredit(item.id)}
                aria-label={`Delete ${item.title}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[var(--ds-radius-card)] border border-dashed border-[var(--ds-border)] px-4 py-8 text-center text-sm text-[var(--ds-muted)]">
          No credits yet. Add the work you&apos;ve done.
        </p>
      )}

      <div className="grid gap-3 rounded-[var(--ds-radius-card)] border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4 sm:grid-cols-[1fr_1fr_auto]">
        <input
          className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-background)] px-3 py-2.5 text-sm"
          placeholder="Production / title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <input
          className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-background)] px-3 py-2.5 text-sm"
          placeholder="Role (optional)"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        />
        <button
          type="button"
          className="inline-flex min-h-[var(--ds-control-height-compact)] items-center justify-center gap-1.5 rounded-full bg-[var(--ds-accent)] px-4 text-sm font-semibold text-[var(--ds-on-accent)] disabled:opacity-50"
          onClick={addCredit}
          disabled={isPending}
        >
          <Plus className="size-4" />
          Add
        </button>
      </div>
    </div>
  );
}
