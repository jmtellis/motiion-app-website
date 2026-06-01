import { InboxList } from "@/components/app/InboxList";
import { fetchInboxConversations } from "@/lib/app/inbox";

export default async function InboxPage() {
  const { conversations, error } = await fetchInboxConversations();
  return <InboxList conversations={conversations} error={error} />;
}
