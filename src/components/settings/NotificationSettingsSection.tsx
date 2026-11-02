import { loadNotificationSettings } from "@/app/settings/notification-actions";
import { NotificationSettingsPanel } from "./NotificationSettingsPanel";

export async function NotificationSettingsSection({ accountId, community = false, retryPath }: { accountId: string; community?: boolean; retryPath: string }) {
  const result = await loadNotificationSettings();
  if (!result.ok) return <div className="ui-notice" data-tone="error" role="alert"><p>{result.error}</p><a href={retryPath}>Try again</a></div>;
  return <NotificationSettingsPanel key={accountId} initial={result.settings} community={community} />;
}
