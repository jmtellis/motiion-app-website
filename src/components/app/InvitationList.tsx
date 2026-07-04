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
      <h2 className="font-mono text-xs font-medium tracking-[0.08em] text-[#8a8a8a] uppercase">
        Casting invitations
        <span className="ml-2 text-[#5a5a5a]">{rows.length}</span>
      </h2>

      {error ? (
        <p className="rounded-[8px] border border-[rgb(240_68_56_/_0.4)] bg-[rgb(240_68_56_/_0.1)] px-4 py-3 text-sm text-[#f97066]">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-[14px] border border-[#262626] bg-[#151515]">
        <ul className="divide-y divide-[#262626]">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] font-medium tracking-[0.08em] text-[#8a8a8a] uppercase">
                  {row.kind} invite · {formatWhen(row.createdAt)}
                </p>
                <h3 className="mt-1 text-base font-medium text-[#fafafa]">{row.title}</h3>
                {row.message ? (
                  <p className="mt-1 line-clamp-2 text-sm text-[#a3a3a3]">{row.message}</p>
                ) : null}
              </div>
              {row.status === "sent" || row.status === "pending" ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => respond(row.id, "accepted")}
                    className="rounded-[8px] bg-[#fafafa] px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-[#e6e6e6] disabled:bg-[#151515] disabled:text-[#5a5a5a]"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => respond(row.id, "declined")}
                    className="rounded-[8px] border border-[#262626] bg-[#1e1e1e] px-4 py-2 text-sm font-medium text-[#eaeaea] transition-colors hover:bg-[#2a2a2a] disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              ) : (
                <span
                  className={`shrink-0 rounded-full px-3 py-1 font-mono text-[11px] font-medium tracking-[0.08em] uppercase ${
                    row.status === "accepted"
                      ? "bg-[#0c2a26] text-[#2dd4bf]"
                      : "border border-[#262626] bg-[#1e1e1e] text-[#8a8a8a]"
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
