"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { fetchConversationParticipants } from "@/lib/app/conversations";
import type { ConversationParticipant } from "@/types/app";

export function ConversationParticipantsSheet({
  conversationId,
  onClose,
}: {
  conversationId: string;
  onClose: () => void;
}) {
  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchConversationParticipants(conversationId).then((result) => {
      if (cancelled) return;
      setParticipants(result.participants);
      setError(result.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="participants-title"
        className="flex max-h-[70vh] w-full max-w-md flex-col rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text-default)] shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-[var(--ds-border)] px-4 py-3">
          <h2 id="participants-title" className="text-sm font-semibold">View people in chat</h2>
          <button type="button" onClick={onClose} className="text-sm text-[var(--ds-muted)]">
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? <p className="px-4 py-6 text-sm text-[var(--ds-muted)]">Loading people…</p> : null}
          {error ? <p className="px-4 py-6 text-sm text-amber-500">{error}</p> : null}
          {!loading && !error && !participants.length ? (
            <p className="px-4 py-6 text-sm text-[var(--ds-muted)]">No people in this chat yet.</p>
          ) : null}
          <ul>
            {participants.map((person) => (
              <li key={person.user_id} className="flex items-center gap-3 px-4 py-3">
                <PersonAvatar url={person.avatar_url} name={person.display_name} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{person.display_name}</span>
                  {person.role ? (
                    <span className="block truncate text-xs text-[var(--ds-muted)] capitalize">{person.role}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PersonAvatar({ url, name }: { url: string | null; name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (url) {
    return (
      <span className="relative block size-9 shrink-0 overflow-hidden rounded-full bg-black/20">
        <Image src={url} alt="" fill className="object-cover" unoptimized />
      </span>
    );
  }

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--ds-accent)_18%,black)] text-xs font-semibold text-[var(--ds-accent)]">
      {initials || "?"}
    </span>
  );
}
