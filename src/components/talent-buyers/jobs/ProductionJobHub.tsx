"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  completeProductionJobAction,
  createJobJoinTokenAction,
  respondToJobResumeCreditAction,
} from "@/app/(buyer-app)/(paid)/jobs/actions";

type Member = {
  userId: string;
  status: string;
  role: string;
  source: string | null;
};

type Linked = {
  id: string;
  activityId: string | null;
  projectId: string | null;
  purpose: string;
};

type Job = {
  id: string;
  title: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  isOwner: boolean;
};

type Credit = {
  status: string;
  experienceEntryId: string | null;
};

export function ProductionJobHub({
  job,
  members,
  linked,
  joinUrl: initialJoinUrl,
  myCredit,
}: {
  job: Job;
  members: Member[];
  linked: Linked[];
  joinUrl: string | null;
  myCredit: Credit | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"people" | "linked" | "chat" | "credit">("people");
  const [joinUrl, setJoinUrl] = useState(initialJoinUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = members.filter((m) => m.status === "active");
  const pendingMembers = members.filter((m) => m.status === "pending");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[var(--accent)] uppercase">Job</p>
          <h1 className="text-2xl font-semibold">{job.title}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {[job.startDate, job.endDate].filter(Boolean).join(" → ") || "Dates TBD"} ·{" "}
            {job.status.replaceAll("_", " ")}
          </p>
        </div>
        <Link href="/projects" className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm">
          Back to Projects
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["people", "linked", "chat", "credit"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-3 py-1.5 text-sm capitalize ${
              tab === key
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {tab === "people" ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm"
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await createJobJoinTokenAction(job.id);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setJoinUrl(result.url ?? null);
                  if (result.url) {
                    await navigator.clipboard.writeText(result.url);
                  }
                  router.refresh();
                });
              }}
            >
              {joinUrl ? "Copy join link" : "Create join link"}
            </button>
            {joinUrl ? (
              <span className="truncate text-xs text-[var(--muted)]">{joinUrl}</span>
            ) : null}
          </div>
          <h2 className="mt-5 text-sm font-semibold">On Motiion ({active.length})</h2>
          <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
            {active.length === 0 ? <li>No accepted members yet</li> : null}
            {active.map((m) => (
              <li key={m.userId}>
                {m.role} · {m.userId.slice(0, 8)}…
              </li>
            ))}
          </ul>
          <h2 className="mt-5 text-sm font-semibold">Pending</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {pendingMembers.length} invited · waiting to accept or not on Motiion yet
          </p>
        </section>
      ) : null}

      {tab === "linked" ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold">Linked sessions</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Link a rehearsal from the app or calendar flow. Accepted dancers are enrolled as guests.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {linked.length === 0 ? (
              <li className="text-[var(--muted)]">No linked activities yet</li>
            ) : (
              linked.map((row) => (
                <li key={row.id}>
                  {row.purpose}
                  {row.activityId ? ` · activity ${row.activityId.slice(0, 8)}…` : ""}
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      {tab === "chat" ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold">Chat</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Open Inbox on Motiion to message everyone accepted on this Job.
          </p>
        </section>
      ) : null}

      {tab === "credit" ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold">Resume credit</h2>
          {job.isOwner && job.status !== "completed" ? (
            <button
              type="button"
              disabled={pending}
              className="mt-3 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await completeProductionJobAction(job.id);
                  if (!result.ok) setError(result.error);
                  else router.refresh();
                });
              }}
            >
              Mark complete & propose credits
            </button>
          ) : null}
          {job.status === "completed" ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Credits were proposed to accepted participants.
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Completing proposes a resume entry with linked choreographers, assistants, and dancers.
            </p>
          )}

          {myCredit ? (
            <div className="mt-5 rounded-xl border border-[var(--border)] p-4">
              <p className="text-sm font-medium">
                Add “{job.title}” to your resume?
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">Status: {myCredit.status}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["accepted", "edited", "hidden"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={pending}
                    className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm capitalize"
                    onClick={() => {
                      setError(null);
                      startTransition(async () => {
                        const result = await respondToJobResumeCreditAction(job.id, status);
                        if (!result.ok) setError(result.error);
                        else router.refresh();
                      });
                    }}
                  >
                    {status === "accepted" ? "Keep" : status === "hidden" ? "Hide" : "Mark edited"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
