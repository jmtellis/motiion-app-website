export const notificationCategories = [
  { key: "notify_follows", label: "People you follow", community: true },
  { key: "notify_casting_match", label: "Casting matches", community: false },
  { key: "notify_jobs", label: "Jobs & casting", community: false },
  { key: "notify_activity_updates", label: "Schedule & location changes", community: true },
  { key: "notify_bookings", label: "Selections & confirmations", community: false },
  { key: "notify_reminders", label: "Reminders", community: true },
  { key: "notify_request_updates", label: "Request & invitation responses", community: false },
] as const;

export type NotificationKey = (typeof notificationCategories)[number]["key"];
export type NotificationSettings = { enabled: boolean; preferences: Record<NotificationKey, boolean> };

export function notificationSettings(enabled: unknown, raw: unknown): NotificationSettings {
  const map = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return { enabled: enabled !== false, preferences: Object.fromEntries(notificationCategories.map(({ key }) => [key, map[key] !== false])) as Record<NotificationKey, boolean> };
}

/** Keep future/native categories when the web edits the known controls. */
export function mergeNotificationPreferences(raw: unknown, preferences: Record<NotificationKey, boolean>) {
  const map = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return { ...map, ...Object.fromEntries(notificationCategories.map(({ key }) => [key, preferences[key]])) };
}
