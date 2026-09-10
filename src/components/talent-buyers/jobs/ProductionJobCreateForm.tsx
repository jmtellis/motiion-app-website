"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createProductionJobAction } from "@/app/(buyer-app)/(paid)/jobs/actions";

export function ProductionJobCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mx-auto flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createProductionJobAction({
            title,
            startDate: startDate || null,
            endDate: endDate || null,
          });
          if (!result.ok) {
            setError(result.error);
          }
        });
      }}
    >
      <div>
        <h1 className="text-xl font-semibold">Create a Job</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Name the work, set dates, then copy a join link for dancers.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Title</span>
        <input
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
          placeholder="Tour Opener"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">End date</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}
