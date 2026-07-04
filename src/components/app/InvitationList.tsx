"use client";

import { useState, useTransition } from "react";

import { respondToInvitation, type InvitationRow } from "@/lib/app/invitations";

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function InvitationList({ invitations }: { invitations: InvitationRow[] }) {
  const [rows, setRows] = useState(invitations);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function respond(id: string, status: "accepted" | "declined") {
    setError(null);
    startTransition(async () => {
      const result = await respondToInvitation(id, status);
      if (!result.ok) {
        setError(result.error ?? "Could not update invitation.");
        return;
      }
      setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)));
    });
  }

  if (!rows.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold text-[var(--ink)]">Casting invitations</h2>
        <span className="text-sm text-[var(--ink-soft)]">{rows.length}</span>
      </div>

      {error ? (
        <p className="rounded-[var(--radius-field)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      <ul className="grid gap-3">
        {rows.map((row) => (
          <li key={row.id} className="ui-card flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-[0.14em] text-[var(--accent)] uppercase">
                {row.kind} invite · {formatWhen(row.createdAt)}
              </p>
              <h3 className="mt-1 text-base font-semibold text-[var(--ink)]">{row.title}</h3>
              {row.message ? (
                <p className="mt-1 line-clamp-2 text-sm text-[var(--ink-soft)]">{row.message}</p>
              ) : null}
            </div>
            {row.status === "sent" || row.status === "pending" ? (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => respond(row.id, "accepted")}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#0a0a0a] disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => respond(row.id, "declined")}
                  className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--ink-soft)] disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            ) : (
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  row.status === "accepted"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-[var(--tone)] text-[var(--ink-soft)]"
                }`}
              >
                {row.status}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
