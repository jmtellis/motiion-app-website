"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { loadBlockedUsers, unblockUser, type BlockedUsersResult } from "@/app/settings/moderation-actions";

export function BlockedUsersPanel({ initialResult }: { initialResult: BlockedUsersResult }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialResult.ok ? initialResult.users : []);
  const [error, setError] = useState(initialResult.ok ? null : initialResult.error);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    setPending("reload");
    setError(null);
    try {
      const result = await loadBlockedUsers();
      if (result.ok) setUsers(result.users);
      else setError(result.error);
    } catch {
      setError("Couldn’t load blocked users. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }

  async function confirmUnblock(userId: string, name: string) {
    setPending(userId);
    setError(null);
    setMessage(null);
    try {
      const result = await unblockUser(userId);
      if (!result.ok) { setError(result.error); return; }
      setUsers((current) => current.filter((user) => user.user_id !== userId));
      setConfirming(null);
      setMessage(`${name} is unblocked.`);
      window.dispatchEvent(new Event("motiion:blocked-users-changed"));
      router.refresh();
    } catch {
      setError("Couldn’t unblock this person. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 text-[var(--ui-text)]" aria-labelledby="blocked-users-heading" aria-busy={pending !== null}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="blocked-users-heading" className="text-lg font-semibold">Blocked users</h2>
        <button type="button" className="ui-button ui-button--secondary" onClick={reload} disabled={pending !== null}>
          {pending === "reload" ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p>Blocked people are hidden from your browsing and inbox. Unblocking lets you see and connect with them again.</p>
      {error ? <p role="alert" className="ui-notice" data-tone="error">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      {!error && users.length === 0 ? <p>No blocked users.</p> : null}
      {users.length > 0 ? <ul className="space-y-3">
        {users.map((user) => <li key={user.user_id} className="rounded-xl border border-[var(--ui-border)] p-3">
          <div className="flex items-center gap-3">
            <Avatar src={user.avatar_url} name={user.display_name} />
            <span className="min-w-0 flex-1 break-words font-medium">{user.display_name}</span>
            {confirming !== user.user_id ? <button type="button" className="ui-button ui-button--secondary" disabled={pending !== null} onClick={() => setConfirming(user.user_id)} aria-label={`Unblock ${user.display_name}`}>Unblock</button> : null}
          </div>
          {confirming === user.user_id ? <div className="mt-3 space-y-3">
            <p>Unblock {user.display_name}?</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="ui-button" disabled={pending !== null} onClick={() => confirmUnblock(user.user_id, user.display_name)}>{pending === user.user_id ? "Unblocking…" : "Yes, unblock"}</button>
              <button type="button" className="ui-button ui-button--secondary" disabled={pending !== null} onClick={() => setConfirming(null)}>Cancel</button>
            </div>
          </div> : null}
        </li>)}
      </ul> : null}
    </section>
  );
}
