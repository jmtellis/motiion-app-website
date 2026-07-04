import { MessengerShell } from "@/components/messaging/MessengerShell";
import { fetchInboxConversations } from "@/lib/app/inbox";
import { requireTalentAccount } from "@/lib/auth/session";

export default async function InboxPage() {
  const profile = await requireTalentAccount();
  const { conversations, error } = await fetchInboxConversations();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#262626] pb-6">
        <div className="space-y-1.5">
          <p className="font-mono text-xs font-medium tracking-[0.08em] text-[#5a5a5a] uppercase">Inbox</p>
          <h1 className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.02em] text-[#fafafa]">
            Messages
          </h1>
        </div>
        <p className="font-mono text-xs tracking-[0.08em] text-[#5a5a5a] uppercase">
          {conversations.length} threads
        </p>
      </header>
      <MessengerShell conversations={conversations} currentUserId={profile.id} error={error} />
    </div>
  );
}
