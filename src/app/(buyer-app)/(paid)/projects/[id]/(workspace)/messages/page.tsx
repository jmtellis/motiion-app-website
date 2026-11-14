import { ProjectMessagesPanel } from "@/components/talent-buyers/project/ProjectMessagesPanel";
import { fetchInboxBundle } from "@/lib/app/inbox";

export default async function ProjectMessagesPage({ searchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  const [{ conversations, error }, query] = await Promise.all([fetchInboxBundle(), searchParams]);
  return <ProjectMessagesPanel conversations={conversations} error={error} initialConversationId={query.conversation} />;
}
