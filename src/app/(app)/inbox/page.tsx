import { MessengerShell } from "@/components/messaging/MessengerShell";
import { fetchInboxBundle } from "@/lib/app/inbox";
import { requireCommunityOrTalentAccount } from "@/lib/auth/session";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireCommunityOrTalentAccount();
  const params = await searchParams;
  const rawFilter = typeof params.filter === "string" ? params.filter : typeof params.tab === "string" ? params.tab : "primary";
  const initialFilter =
    rawFilter === "general" ? "general" : "primary";

  const { conversations, error } = await fetchInboxBundle();

  return (
    <MessengerShell
      key={profile.id}
      conversations={conversations}
      currentUserId={profile.id}
      error={error}
      initialFilter={initialFilter}
      initialConversationId={typeof params.conversation === "string" ? params.conversation : null}
    />
  );
}
