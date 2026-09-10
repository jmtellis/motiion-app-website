import { MessengerShell } from "@/components/messaging/MessengerShell";
import { fetchChatPendingRequests, fetchInboxConversations } from "@/lib/app/inbox";
import { requireTalentAccount } from "@/lib/auth/session";
import type { ChatInboxFilter } from "@/lib/messaging/inbox-partition";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireTalentAccount();
  const params = await searchParams;
  const rawFilter = typeof params.filter === "string" ? params.filter : "primary";
  const initialFilter: ChatInboxFilter =
    rawFilter === "general" || rawFilter === "requests" || rawFilter === "primary"
      ? rawFilter
      : "primary";

  const [{ conversations, error }, { requests }] = await Promise.all([
    fetchInboxConversations(),
    fetchChatPendingRequests(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--ds-border)] pb-6">
        <div className="space-y-1.5">
          <p className="font-mono text-xs font-medium tracking-[0.08em] text-[var(--ds-muted)] uppercase">
            Chat
          </p>
          <h1 className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--ds-text-default)]">
            Messages
          </h1>
        </div>
        <p className="font-mono text-xs tracking-[0.08em] text-[var(--ds-muted)] uppercase">
          {conversations.length} threads
          {requests.length ? ` · ${requests.length} requests` : ""}
        </p>
      </header>
      <MessengerShell
        conversations={conversations}
        currentUserId={profile.id}
        error={error}
        pendingRequests={requests}
        initialFilter={initialFilter}
      />
    </div>
  );
}
