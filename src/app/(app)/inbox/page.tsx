import { MessengerShell } from "@/components/messaging/MessengerShell";
import { fetchInboxBundle } from "@/lib/app/inbox";
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

  const { conversations, error, pendingRequests, messageRequests } = await fetchInboxBundle();

  return (
    <MessengerShell
      conversations={conversations}
      messageRequests={messageRequests}
      currentUserId={profile.id}
      error={error}
      pendingRequests={pendingRequests}
      initialFilter={initialFilter}
    />
  );
}
