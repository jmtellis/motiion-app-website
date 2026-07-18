import { fetchConnectAccountStatus } from "@/app/(buyer-app)/(paid)/calendar/connect-actions";
import { ActivityCreateWizard } from "@/components/talent-buyers/activities/ActivityCreateWizard";
import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { requireHiringAccount } from "@/lib/auth/session";
import { createDefaultActivityDraft } from "@/lib/talent-buyers/activities/defaults";
import type { ActivityType } from "@/lib/talent-buyers/activities/types";

function parseType(value: string | string[] | undefined): ActivityType {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "class" || raw === "session" || raw === "event") return raw;
  return "event";
}

export default async function CalendarNewActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; projectId?: string }>;
}) {
  await requireHiringAccount();
  const params = await searchParams;
  const type = parseType(params.type);
  const projectId = typeof params.projectId === "string" ? params.projectId : null;
  const draft = createDefaultActivityDraft(type, projectId);
  const connect = await fetchConnectAccountStatus();

  return (
    <BuyerAppPage fullWidth className="!space-y-0 flex min-h-0 flex-1 flex-col">
      <ActivityCreateWizard
        initialDraft={draft}
        mode="create"
        initialConnectStatus={connect.status ?? null}
        closeHref={projectId ? `/projects/${projectId}` : "/calendar"}
      />
    </BuyerAppPage>
  );
}
