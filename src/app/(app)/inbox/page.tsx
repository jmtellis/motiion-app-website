import { MessengerShell } from "@/components/messaging/MessengerShell";
import { fetchInboxConversations } from "@/lib/app/inbox";
import { requireTalentAccount } from "@/lib/auth/session";

export default async function InboxPage() {
  const profile = await requireTalentAccount();
  const { conversations, error } = await fetchInboxConversations();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.2em] text-[var(--accent)] uppercase">Inbox</p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Messages</h1>
        <p className="text-base text-[var(--ink-soft)]">
          Conversations from jobs, classes, sessions, and direct messages.
        </p>
      </header>
      <MessengerShell conversations={conversations} currentUserId={profile.id} error={error} />
    </div>
  );
}
