import { MessengerShell } from "@/components/messaging/MessengerShell";
import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { PageHeader } from "@/components/talent-buyers/dashboard/PageHeader";
import { fetchInboxConversations } from "@/lib/app/inbox";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerMessagesPage() {
  const profile = await requireHiringAccount();
  const { conversations, error } = await fetchInboxConversations();

  return (
    <BuyerAppPage className="space-y-8">
      <PageHeader
        variant="dashboard"
        eyebrow="Inbox"
        title="Messages"
        description="Outreach, replies, and conversation threads."
      />
      <MessengerShell conversations={conversations} currentUserId={profile.id} error={error} variant="dashboard" />
    </BuyerAppPage>
  );
}
