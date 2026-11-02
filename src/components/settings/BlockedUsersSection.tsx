import { loadBlockedUsers } from "@/app/settings/moderation-actions";
import { BlockedUsersPanel } from "./BlockedUsersPanel";

export async function BlockedUsersSection({ accountId }: { accountId: string }) {
  const result = await loadBlockedUsers();
  return <BlockedUsersPanel key={accountId} initialResult={result} />;
}
