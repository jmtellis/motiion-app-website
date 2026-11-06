"use client";

import { useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import type { Talent } from "@/lib/talent-navigator/types";
import { fetchReferrerFollowing, toggleNotifyMe } from "@/lib/talent/referrer-lists";

export function NotifyMePanel({ initial }: { initial: { talent: Talent[]; error: string | null } }) {
  const [people, setPeople] = useState(initial.talent);
  const [error, setError] = useState(initial.error);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    setPending("reload");
    setError(null);
    try {
      const result = await fetchReferrerFollowing();
      if (!result.error) setPeople(result.talent);
      setError(result.error);
    } catch {
      setError("Couldn’t load this list. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }

  async function stop(person: Talent) {
    setPending(person.id);
    setError(null);
    setMessage(null);
    try {
      const result = await toggleNotifyMe(person.id);
      if (result.error) { setError(result.error); return; }
      if (result.notifying) { setError(`${person.name} is still on your list. Try again.`); return; }
      setPeople((current) => current.filter((item) => item.id !== person.id));
      setMessage(`You won’t be notified about ${person.name} anymore.`);
    } catch {
      setError("Couldn’t update this person. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 text-[var(--ui-text)]" aria-labelledby="notify-me-heading" aria-busy={pending !== null}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="notify-me-heading" className="text-lg font-semibold">Notify me</h2>
        <button type="button" className="ui-button ui-button--secondary" onClick={reload} disabled={pending !== null}>
          {pending === "reload" ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p>People you’ll hear from when they post or share something new. Turn this on from anyone’s profile.</p>
      {error ? <p role="alert" className="ui-notice" data-tone="error">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      {!error && people.length === 0 ? <p>You’re not getting notified about anyone yet.</p> : null}
      {people.length > 0 ? (
        <ul className="space-y-3">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-3 rounded-xl border border-[var(--ui-border)] p-3">
              <Avatar src={person.imageUrl || null} name={person.name} />
              <span className="min-w-0 flex-1 break-words font-medium">{person.name}</span>
              <button type="button" className="ui-button ui-button--secondary" disabled={pending !== null} onClick={() => void stop(person)} aria-label={`Stop notifying about ${person.name}`}>
                {pending === person.id ? "Updating…" : "Stop notifying"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
