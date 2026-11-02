import { MessengerShell } from "@/components/messaging/MessengerShell";
import { fetchInboxBundle } from "@/lib/app/inbox";
import { requireCommunityOrTalentAccount } from "@/lib/auth/session";
import type { ChatInboxFilter } from "@/lib/messaging/inbox-partition";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireCommunityOrTalentAccount();
  const params = await searchParams;
  const rawFilter = typeof params.filter === "string" ? params.filter : typeof params.tab === "string" ? params.tab : "primary";
  const initialFilter: ChatInboxFilter =
    rawFilter === "general" || rawFilter === "requests" || rawFilter === "primary"
      ? rawFilter
      : "primary";

  const { conversations, error, pendingRequests, messageRequests, pendingError, messageRequestsError } = await fetchInboxBundle();

  return (
    <MessengerShell
      key={profile.id}
      pendingError={pendingError}
      messageRequestsError={messageRequestsError}
      conversations={conversations}
      messageRequests={messageRequests}
      currentUserId={profile.id}
      error={error}
      pendingRequests={pendingRequests}
      initialFilter={initialFilter}
      initialConversationId={typeof params.conversation === "string" ? params.conversation : null}
    />
  );
}
