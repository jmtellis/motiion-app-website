"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { loadNotificationRequests } from "@/app/notification-request-actions";
import { RequestsPane } from "@/components/messaging/RequestsPane";
import { INBOX_CHANGED_EVENT } from "@/lib/messaging/reliability";
import type { HomePendingRequest, MessageRequest } from "@/types/app";

type Requests = { pendingRequests: HomePendingRequest[]; messageRequests: MessageRequest[]; error: string | null };

/** Pending availability, booking, and message requests, shown above notifications. */
export function NotificationRequests({ open, inboxHref, onNavigate, onCount }: { open: boolean; inboxHref: string; onNavigate: () => void; onCount: (count: number) => void }) {
  const router = useRouter();
  const [requests, setRequests] = useState<Requests | null>(null);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await loadNotificationRequests();
      if (current === generation.current) setRequests(result);
    } catch {
      if (current === generation.current) setRequests((value) => ({ pendingRequests: value?.pendingRequests ?? [], messageRequests: value?.messageRequests ?? [], error: "Requests couldn’t be refreshed." }));
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const reload = () => void load();
    window.addEventListener(INBOX_CHANGED_EVENT, reload);
    return () => window.removeEventListener(INBOX_CHANGED_EVENT, reload);
  }, [open, load]);

  const count = requests ? requests.pendingRequests.length + requests.messageRequests.length : 0;
  useEffect(() => { onCount(count); }, [count, onCount]);

  if (!requests) return null;
  if (!count && !requests.error) return null;

  return (
    <section className="workspace-notifications__requests" aria-label="Requests">
      {requests.error ? <p role="alert" className="workspace-notifications__notice">{requests.error} <button type="button" onClick={() => void load()}>Try again</button></p> : null}
      {count ? (
        <RequestsPane
          pendingRequests={requests.pendingRequests}
          messageRequests={requests.messageRequests}
          loadFailed={Boolean(requests.error)}
          onAccepted={(conversationId) => {
            onNavigate();
            router.push(`${inboxHref}?conversation=${encodeURIComponent(conversationId)}`);
          }}
        />
      ) : null}
    </section>
  );
}
