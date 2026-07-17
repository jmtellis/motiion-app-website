"use client";

import { useState, useTransition } from "react";

import { createRoster } from "@/lib/talent-buyers/rosters";

export function RosterCreateForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createRoster(name);
      if (!result.ok) {
        setError(result.error ?? "Could not create roster");
        return;
      }
      setName("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-[220px] flex-1 flex-col gap-1">
        <span className="text-xs font-semibold tracking-[0.14em] text-white/42 uppercase">New roster</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Commercial LA shortlist"
          className="rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm text-white/92 outline-none focus:border-[var(--ds-accent)]"
        />
      </label>
      <button
        type="submit"
        disabled={pending || !name.trim()}
        className="rounded-full bg-[var(--ds-primary)] px-4 py-2 text-sm font-semibold text-[var(--ds-on-primary)] disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create roster"}
      </button>
      {error ? <p className="w-full text-sm text-amber-200">{error}</p> : null}
    </form>
  );
}
