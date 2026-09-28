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
      <div className="talent-section-heading">
        <h2>
          Casting invitations
          <span className="talent-section-heading__count">{rows.length}</span>
        </h2>
      </div>

      {error ? (
        <p className="rounded-[8px] border border-[#f1c9c4] bg-[#fdf1ef] px-4 py-3 text-sm text-[#9b2c2c]">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface)]">
        <ul className="divide-y divide-[var(--ds-border)]">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[var(--ds-muted)] capitalize">
                  {row.kind} invite · {formatWhen(row.createdAt)}
                </p>
                <h3 className="mt-1 text-base font-medium text-[var(--ds-text-default)]">{row.title}</h3>
                {row.message ? (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--ds-muted)]">{row.message}</p>
                ) : null}
              </div>
              {row.status === "sent" || row.status === "pending" ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => respond(row.id, "accepted")}
                    className="rounded-full bg-[#303030] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#171717] disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => respond(row.id, "declined")}
                    className="rounded-full border border-[#d6d6d6] bg-white px-4 py-2 text-sm font-medium text-[#242424] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              ) : (
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    row.status === "accepted"
                      ? "bg-[#e7f4f1] text-[#1f6f62]"
                      : "border border-[#d6d6d6] bg-[#f5f5f5] text-[#616161]"
                  }`}
                >
                  {row.status}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
