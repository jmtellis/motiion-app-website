"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  reportMessageOrUser,
  respondToMessageRequest,
  respondToPendingRequest,
} from "@/lib/app/conversations";
import { mapPendingRequestsToChatRows } from "@/lib/messaging/inbox-partition";
import type { HomePendingRequest, MessageRequest } from "@/types/app";

const REPORT_REASONS = ["Spam", "Harassment", "Other"] as const;

export function RequestsPane({
  pendingRequests,
  messageRequests,
  variant = "default",
  onAccepted,
}: {
  pendingRequests: HomePendingRequest[];
  messageRequests: MessageRequest[];
  variant?: "default" | "dashboard";
  onAccepted: (conversationId: string) => void;
}) {
  const router = useRouter();
  const pendingRows = mapPendingRequestsToChatRows(pendingRequests);
  const isDashboard = variant === "dashboard";
  const [hiddenPending, setHiddenPending] = useState<string[]>([]);
  const [hiddenMessages, setHiddenMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: "pending"; id: string; requestKind: string; title: string }
    | { kind: "decline" | "block"; request: MessageRequest }
    | { kind: "report"; request: MessageRequest }
    | null
  >(null);

  const visiblePending = pendingRows.filter((row) => !hiddenPending.includes(row.id));
  const visibleMessages = messageRequests.filter((row) => !hiddenMessages.includes(row.id));

  if (!visiblePending.length && !visibleMessages.length) {
    return (
      <div
        className={`rounded-[var(--ds-radius-card)] border border-dashed px-6 py-14 text-center ${
          isDashboard
            ? "border-white/15 bg-white/3"
            : "border-[var(--ds-border)] bg-[var(--ds-surface)]"
        }`}
      >
        <h2 className={`text-base font-semibold ${isDashboard ? "text-white/90" : "text-[var(--ds-text-default)]"}`}>
          No requests
        </h2>
        <p className={`mx-auto mt-2 max-w-sm text-sm ${isDashboard ? "text-white/50" : "text-[var(--ds-muted)]"}`}>
          Invites, join requests, and message requests will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
      {error ? <p className="text-sm text-amber-500">{error}</p> : null}

      {visiblePending.length ? (
        <section className="space-y-2">
          <h2 className={`text-xs font-medium tracking-[0.08em] uppercase ${isDashboard ? "text-white/45" : "text-[var(--ds-muted)]"}`}>
            Needs a response
          </h2>
          <ul className={`divide-y overflow-hidden rounded-[var(--ds-radius-card)] border ${isDashboard ? "divide-white/8 border-white/8 bg-white/3" : "divide-[var(--ds-border)] border-[var(--ds-border)] bg-[var(--ds-surface)]"}`}>
            {visiblePending.map((row) => {
              const source = pendingRequests.find((item) => item.id === row.id);
              return (
                <li key={row.id} className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar url={row.coverUrl} name={row.title} />
                    <div className="min-w-0 flex-1">
                      {row.href ? (
                        <Link href={row.href} className={`truncate text-sm font-medium hover:underline ${isDashboard ? "text-white/90" : "text-[var(--ds-text-default)]"}`}>
                          {row.title}
                        </Link>
                      ) : (
                        <p className={`truncate text-sm font-medium ${isDashboard ? "text-white/90" : "text-[var(--ds-text-default)]"}`}>{row.title}</p>
                      )}
                      <p className={`mt-0.5 truncate text-xs ${isDashboard ? "text-white/50" : "text-[var(--ds-muted)]"}`}>{row.detail}</p>
                    </div>
                  </div>
                  {source ? (
                    <div className="mt-3 flex gap-2">
                      <ActionButton
                        label="Accept"
                        busyLabel="Accepting…"
                        onClick={() =>
                          runPending(source, "primary", () => {
                            setHiddenPending((current) => [...current, source.id]);
                            router.refresh();
                          }, setError)
                        }
                      />
                      <ActionButton
                        label="Decline"
                        tone="secondary"
                        onClick={() =>
                          setConfirm({
                            kind: "pending",
                            id: source.id,
                            requestKind: source.request_kind,
                            title: row.title,
                          })
                        }
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {visibleMessages.length ? (
        <section className="space-y-2">
          <h2 className={`text-xs font-medium tracking-[0.08em] uppercase ${isDashboard ? "text-white/45" : "text-[var(--ds-muted)]"}`}>
            Message requests
          </h2>
          <ul className={`divide-y overflow-hidden rounded-[var(--ds-radius-card)] border ${isDashboard ? "divide-white/8 border-white/8 bg-white/3" : "divide-[var(--ds-border)] border-[var(--ds-border)] bg-[var(--ds-surface)]"}`}>
            {visibleMessages.map((request) => (
              <li key={request.id} className="px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <Avatar url={request.sender_avatar_url} name={request.sender_name} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${isDashboard ? "text-white/90" : "text-[var(--ds-text-default)]"}`}>
                      {request.sender_name}
                    </p>
                    {request.context_title ? (
                      <p className="mt-0.5 truncate text-[11px] text-[var(--ds-accent)]/80">{request.context_title}</p>
                    ) : null}
                    <p className={`mt-1 line-clamp-3 text-sm ${isDashboard ? "text-white/70" : "text-[var(--ds-on-surface)]"}`}>
                      {request.initial_message}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton
                    label="Accept"
                    busyLabel="Accepting…"
                    onClick={async () => {
                      setError(null);
                      const result = await respondToMessageRequest(request.id, "accept");
                      if (!result.ok || !result.conversationId) {
                        setError(result.error ?? "Could not accept that request.");
                        return;
                      }
                      setHiddenMessages((current) => [...current, request.id]);
                      onAccepted(result.conversationId);
                      router.refresh();
                    }}
                  />
                  <ActionButton
                    label="Decline"
                    tone="secondary"
                    onClick={() => setConfirm({ kind: "decline", request })}
                  />
                  <ActionButton
                    label="More"
                    tone="secondary"
                    onClick={() => setConfirm({ kind: "report", request })}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {confirm ? (
        <ConfirmDialog
          confirm={confirm}
          onClose={() => setConfirm(null)}
          onDone={(id, conversationId) => {
            setConfirm(null);
            if (confirm.kind === "pending") {
              setHiddenPending((current) => [...current, id]);
            } else {
              setHiddenMessages((current) => [...current, id]);
            }
            if (conversationId) onAccepted(conversationId);
            router.refresh();
          }}
          onError={setError}
        />
      ) : null}
    </div>
  );
}

async function runPending(
  request: HomePendingRequest,
  action: "primary" | "negative",
  onDone: () => void,
  onError: (message: string | null) => void,
) {
  onError(null);
  const result = await respondToPendingRequest(request.request_kind, request.id, action);
  if (!result.ok) {
    onError(result.error ?? "Could not respond to that request.");
    return;
  }
  onDone();
}

function ActionButton({
  label,
  busyLabel,
  tone = "primary",
  onClick,
}: {
  label: string;
  busyLabel?: string;
  tone?: "primary" | "secondary";
  onClick: () => void | Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void Promise.resolve(onClick()).finally(() => setPending(false));
      }}
      className={`rounded-full px-3.5 py-1.5 text-xs font-medium disabled:opacity-50 ${
        tone === "primary"
          ? "bg-[#fafafa] text-[#0a0a0a]"
          : "border border-current/20 text-[var(--ds-muted)]"
      }`}
    >
      {pending ? (busyLabel ?? `${label}…`) : label}
    </button>
  );
}

function ConfirmDialog({
  confirm,
  onClose,
  onDone,
  onError,
}: {
  confirm:
    | { kind: "pending"; id: string; requestKind: string; title: string }
    | { kind: "decline" | "block"; request: MessageRequest }
    | { kind: "report"; request: MessageRequest };
  onClose: () => void;
  onDone: (id: string, conversationId?: string) => void;
  onError: (message: string) => void;
}) {
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>("Spam");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);

  const title =
    confirm.kind === "pending"
      ? "Decline request"
      : confirm.kind === "decline"
        ? "Decline message request"
        : confirm.kind === "block"
          ? "Block this person"
          : "Report or block";

  function submit(action: "decline" | "block" | "report" | "negative") {
    setPending(true);
    void (async () => {
      if (confirm.kind === "pending") {
        const result = await respondToPendingRequest(confirm.requestKind, confirm.id, "negative");
        if (!result.ok) {
          onError(result.error ?? "Could not decline that request.");
          onClose();
          return;
        }
        onDone(confirm.id);
        return;
      }

      if (action === "report") {
        const result = await reportMessageOrUser({
          reportedUserId: confirm.request.sender_id,
          reason,
          details,
        });
        if (!result.ok) {
          onError(result.error ?? "Could not send that report.");
          onClose();
          return;
        }
        onClose();
        return;
      }

      const result = await respondToMessageRequest(confirm.request.id, action === "block" ? "block" : "decline");
      if (!result.ok) {
        onError(result.error ?? "Could not update that request.");
        onClose();
        return;
      }
      onDone(confirm.request.id);
    })().finally(() => setPending(false));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="request-confirm-title" className="w-full max-w-md rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-5 text-[var(--ds-text-default)] shadow-xl">
        <h2 id="request-confirm-title" className="text-base font-semibold">{title}</h2>
        {confirm.kind === "report" ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-[var(--ds-muted)]">
              Report {confirm.request.sender_name}, or block them so they can&apos;t message you.
            </p>
            <label className="block text-xs text-[var(--ds-muted)]">
              Reason
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value as (typeof REPORT_REASONS)[number])}
                className="mt-1 w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-background)] px-3 py-2 text-sm"
              >
                {REPORT_REASONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-[var(--ds-muted)]">
              Details
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-background)] px-3 py-2 text-sm"
              />
            </label>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--ds-muted)]">
            {confirm.kind === "block"
              ? `Block ${confirm.request.sender_name}? They won't be able to message you.`
              : "This removes the request from your inbox."}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-3.5 py-1.5 text-sm text-[var(--ds-muted)]">
            Cancel
          </button>
          {confirm.kind === "report" ? (
            <>
              <button type="button" disabled={pending} onClick={() => submit("report")} className="rounded-full border border-current/20 px-3.5 py-1.5 text-sm">
                Report
              </button>
              <button type="button" disabled={pending} onClick={() => submit("block")} className="rounded-full bg-[#fafafa] px-3.5 py-1.5 text-sm font-medium text-[#0a0a0a]">
                Block
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => submit(confirm.kind === "block" ? "block" : "negative")}
              className="rounded-full bg-[#fafafa] px-3.5 py-1.5 text-sm font-medium text-[#0a0a0a] disabled:opacity-50"
            >
              {pending ? "Working…" : confirm.kind === "block" ? "Block" : "Decline"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (url) {
    return (
      <span className="relative block size-10 shrink-0 overflow-hidden rounded-full bg-black/20">
        <Image src={url} alt="" fill className="object-cover" unoptimized />
      </span>
    );
  }

  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--ds-accent)_18%,black)] text-xs font-semibold text-[var(--ds-accent)]">
      {initials || "?"}
    </span>
  );
}
