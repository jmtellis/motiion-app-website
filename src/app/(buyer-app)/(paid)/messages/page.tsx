import { redirect } from "next/navigation";

import { MessengerShell } from "@/components/messaging/MessengerShell";
import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { fetchInboxBundle } from "@/lib/app/inbox";
import { requireHiringAccount } from "@/lib/auth/session";
import type { ChatInboxFilter } from "@/lib/messaging/inbox-partition";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { projectWorkspacePath } from "@/lib/talent-buyers/project-routes";

export default async function BuyerMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    conversation?: string;
    project?: string;
    title?: string;
    filter?: string;
    intent?: string;
    castingId?: string;
    referUrl?: string;
  }>;
}) {
  const profile = await requireHiringAccount();
  const params = await searchParams;

  if (params.intent === "referral" && params.castingId && !params.conversation) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data: casting } = await supabase
        .from("castings")
        .select("project_id")
        .eq("id", params.castingId)
        .maybeSingle();
      if (casting?.project_id) {
        redirect(
          `${projectWorkspacePath(casting.project_id as string, "talent-search")}?askReferral=1`,
        );
      }
    }
  }

  const rawFilter = params.filter ?? "primary";
  const initialFilter: ChatInboxFilter =
    rawFilter === "general" || rawFilter === "requests" || rawFilter === "primary"
      ? rawFilter
      : "primary";
  const { conversations, error, pendingRequests, messageRequests } = await fetchInboxBundle();

  return (
    <BuyerAppPage fullWidth className="buyer-messages-page !space-y-0 flex min-h-0 flex-1 flex-col">
      <MessengerShell
        conversations={conversations}
        messageRequests={messageRequests}
        currentUserId={profile.id}
        error={error}
        variant="dashboard"
        layout="workspace"
        initialConversationId={params.conversation ?? null}
        projectFilterTitle={params.title ?? (params.project ? "Project" : null)}
        pendingRequests={pendingRequests}
        initialFilter={initialFilter}
      />
    </BuyerAppPage>
  );
}
